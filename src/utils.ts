import z, { type ZodTypeAny } from "zod";

type JsonSchema = any;

function jsonSchemaPropToZod(schema: JsonSchema): ZodTypeAny {
    if (!schema) return z.any();

    if (Array.isArray(schema.enum)) {
        const literals = schema.enum.map((v: any) => z.literal(v));
        return literals.length === 1 ? literals[0] : z.union(literals as any);
    }

    if (schema.const !== undefined) {
        return z.literal(schema.const);
    }

    switch (schema.type) {
        case "string": {
            let s = z.string();
            if (typeof schema.minLength === "number") s = s.min(schema.minLength);
            if (typeof schema.maxLength === "number") s = s.max(schema.maxLength);
            if (typeof schema.pattern === "string") {
                try {
                    const rx = new RegExp(schema.pattern);
                    s = s.regex(rx);
                } catch {
                    // ignore invalid regex
                }
            }
            return s;
        }

        case "number": {
            let n = z.number();
            if (typeof schema.minimum === "number") n = n.min(schema.minimum);
            if (typeof schema.maximum === "number") n = n.max(schema.maximum);
            return n;
        }

        case "integer": {
            let n = z.number().int();
            if (typeof schema.minimum === "number") n = n.min(schema.minimum);
            if (typeof schema.maximum === "number") n = n.max(schema.maximum);
            return n;
        }

        case "boolean":
            return z.boolean();

        case "array": {
            const itemSchema = schema.items ? jsonSchemaPropToZod(schema.items) : z.any();
            let arr = z.array(itemSchema);
            if (typeof schema.minItems === "number") arr = arr.min(schema.minItems);
            if (typeof schema.maxItems === "number") arr = arr.max(schema.maxItems);
            return arr;
        }

        case "object": {
            const props = schema.properties ?? {};
            const required: string[] = Array.isArray(schema.required) ? schema.required : [];
            const shape: Record<string, ZodTypeAny> = {};
            for (const [k, v] of Object.entries(props)) {
                const child = jsonSchemaPropToZod(v);
                shape[k] = required.includes(k) ? child : child.optional();
            }

            let obj = z.object(shape).passthrough();
            if (schema.additionalProperties === true) {
                obj = obj.extend({});
            } else if (typeof schema.additionalProperties === "object") {
                obj = obj.passthrough();
            } else {
                obj = obj.passthrough();
            }
            return obj;
        }

        default:
            if (schema.properties) {
                return jsonSchemaPropToZod({ type: "object", ...schema });
            }
            return z.any();
    }
}

export function jsonSchemaToZodRoot(schema: JsonSchema): ZodTypeAny {
    if (!schema) return z.object({});

    if (typeof (schema as any)?._parse === "function" || typeof (schema as any)?.parse === "function") {
        return schema;
    }

    if (schema.type === "object" || schema.properties) {
        const props = schema.properties ?? {};
        const required: string[] = Array.isArray(schema.required) ? schema.required : [];
        const shape: Record<string, ZodTypeAny> = {};

        for (const [key, propSchema] of Object.entries(props)) {
            if (
                propSchema &&
                typeof propSchema === 'object' &&
                'type' in propSchema &&
                'additionalProperties' in propSchema &&
                'properties' in propSchema &&
                propSchema.type === "object" &&
                propSchema.additionalProperties === true &&
                (!propSchema.properties || Object.keys(propSchema.properties).length === 0)
            ) {
                shape[key] = z.record(z.any());
                if (!required.includes(key)) shape[key] = shape[key].optional();
                continue;
            }

            const propZod = jsonSchemaPropToZod(propSchema);
            shape[key] = required.includes(key) ? propZod : propZod.optional();
        }

        let root = z.object(shape);
        if (schema.additionalProperties === true) {
            root = root.strip();
        } else {
            root = root.strip();
        }
        return root;
    }

    return z.object({});
}

export function buildToolZodMap(listOfTools: Array<any>): Map<string, ZodTypeAny> {
    const m = new Map<string, ZodTypeAny>();
    for (const t of listOfTools) {
        try {
            const raw = t?.inputSchema ?? t;
            const zodSchema = jsonSchemaToZodRoot(raw);
            const finalSchema = zodSchema._def?.typeName?.startsWith?.("ZodObject") ? zodSchema : z.object({});
            m.set(t.name, finalSchema);
        } catch (e) {
            m.set(t.name, z.object({}));
        }
    }
    return m;
}

export function parseToolInput(toolSchemaMap: Map<string, ZodTypeAny>, toolName: string, input: any) {
    const schema = toolSchemaMap.get(toolName);
    if (!schema) {
        return {};
    }
    try {
        const parsed = schema.parse(input ?? {});
        return parsed;
    } catch (err) {
        if (err instanceof z.ZodError) {
            const details = err.errors.map(e => {
                const path = e.path.length ? e.path.join(".") : "<root>";
                return `${path}: ${e.message}`;
            }).join("; ");
            throw new Error(`Input validation failed for tool "${toolName}": ${details}`);
        }
        throw err;
    }
}