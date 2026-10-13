FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /usr/src/app

# Install dependencies first so this layer is cached until package files change
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

USER node

EXPOSE 3000

# Run node directly (not via npm) so SIGTERM reaches the server for graceful shutdown
CMD ["node", "bin/www"]
