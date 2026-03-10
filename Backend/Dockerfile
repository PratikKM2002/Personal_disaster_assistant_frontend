FROM node:20-alpine

WORKDIR /app

# Install deps first (better caching)
COPY package*.json ./
RUN npm ci

# Copy source
COPY src ./src

ENV NODE_ENV=production
EXPOSE 8000

CMD ["node", "src/index.js"]