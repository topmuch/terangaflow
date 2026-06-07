FROM node:20-alpine AS base

# Install ca-certificates first, then sqlite3 and git
RUN apk update && apk add --no-cache ca-certificates && update-ca-certificates
RUN apk add --no-cache sqlite-libs git
RUN npm install -g bun

WORKDIR /app

# Clone the repository
RUN git clone https://github.com/topmuch/terangaflow.git .

# Install dependencies
RUN bun install --frozen-lockfile || bun install

# Generate Prisma client
RUN bunx prisma generate

# Build Next.js
RUN bun run build

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment variables
ENV DATABASE_URL=file:/app/data/terangaflow.db
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Run db push + seed + start server
CMD ["sh", "-c", "bunx prisma db push --accept-data-loss 2>/dev/null; bun run db:seed; bun run start"]
