FROM node:22-slim
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY shared ./shared
COPY 03-eight-agents-one-ticket ./03-eight-agents-one-ticket
COPY tsconfig.base.json tsconfig.json vitest.config.ts ./
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @aisprint/blog run build
EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["pnpm", "--filter", "@aisprint/blog", "run", "server"]
