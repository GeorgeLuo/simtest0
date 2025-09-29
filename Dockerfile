# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

# Builder stage installs dependencies and compiles TypeScript -> JavaScript
FROM base AS builder
COPY workspaces/Describing_Simulation_0/package*.json ./
COPY workspaces/Describing_Simulation_0/tsconfig.json ./
COPY workspaces/Describing_Simulation_0/src ./src
RUN npm ci
RUN npm run build

# Production image contains only runtime dependencies and compiled output
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY workspaces/Describing_Simulation_0/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
