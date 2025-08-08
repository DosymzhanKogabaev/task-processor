# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Install dependencies separately for caching
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# --- Development image ---
FROM node:20-alpine AS dev
WORKDIR /usr/src/app
ENV NODE_ENV=development

# Install all dependencies for development (includes devDependencies)
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy source
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src

# Expose port and default command
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# --- Production build ---
FROM node:20-alpine AS build
WORKDIR /usr/src/app
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# --- Production runtime ---
FROM node:20-alpine AS prod
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=build /usr/src/app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"] 