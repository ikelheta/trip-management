# API image: build with dev dependencies, run with production dependencies only.
# The build stage runs on the build machine natively: all dependencies are pure JS, so node_modules
# works on both amd64 and arm64 runtimes.
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh ./
# Uploaded files (STORAGE_LOCAL_PATH); mount a volume here so they survive restarts.
RUN mkdir -p /app/storage && chown node:node /app/storage
USER node
EXPOSE 3000
CMD ["sh", "docker-entrypoint.sh"]
