FROM node:20-alpine

RUN apk update && apk add --no-cache ca-certificates sqlite-libs git && update-ca-certificates
RUN npm install -g bun

WORKDIR /app

RUN git clone https://github.com/topmuch/terangaflow.git .

RUN bun install --frozen-lockfile || bun install
RUN bun add -g tsx
RUN bunx prisma generate
RUN bun run build

RUN mkdir -p /app/data

ENV DATABASE_URL=file:/app/data/terangaflow.db
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["sh", "-c", "bunx prisma db push --accept-data-loss 2>/dev/null; bun run db:seed; bun run start"]
