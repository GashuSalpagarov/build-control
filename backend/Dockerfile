# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build tools for bcrypt + OpenSSL for Prisma
RUN apk add --no-cache python3 make g++ openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Build tools for bcrypt + OpenSSL for Prisma
RUN apk add --no-cache python3 make g++ openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p uploads

# Remove build tools to reduce image size
RUN apk del python3 make g++

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Sync schema and start server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main.js"]
