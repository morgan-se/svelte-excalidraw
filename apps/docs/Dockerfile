FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages packages
COPY apps/docs apps/docs
RUN npm ci
RUN npm run build -w svelte-excalidraw && npm run build -w svelte-excalidraw-docs

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/docs/build build
COPY --from=builder /app/apps/docs/package.json package.json
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/packages packages
EXPOSE 3000
CMD ["node", "build"]
