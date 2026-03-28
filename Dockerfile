FROM node:22-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7575
ENV HOSTNAME=0.0.0.0
ENV HOME=/app/data/copilot
ENV XDG_RUNTIME_DIR=/app/data/copilot/.runtime
ENV DBUS_SESSION_BUS_ADDRESS=unix:path=/app/data/copilot/.runtime/bus
ENV COPILOT_CLI_PATH=/usr/local/bin/copilot
ENV AGORA_STORAGE_DIR=/app/data/.agora

RUN apt-get update \
	&& apt-get install -y --no-install-recommends dbus gnome-keyring \
	&& rm -rf /var/lib/apt/lists/* \
	&& npm install -g @github/copilot \
	&& mkdir -p /app/data/forums "$HOME" "$XDG_RUNTIME_DIR"

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 7575
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
