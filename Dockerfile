FROM node:22-slim
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json vitest.config.ts ./
COPY src ./src
COPY content ./content
RUN pnpm run build
EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["pnpm", "run", "server"]
