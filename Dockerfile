FROM node:lts-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

ENV AGENT_PRIVATE_KEY=[]
ENV ENVIRONMENT=MAINNET

COPY package*.json ./
COPY tsconfig.json ./

RUN pnpm install --ignore-scripts

COPY . .

RUN pnpm run build

CMD ["node", "./dist/server.js"]