FROM node:22-alpine
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["node", "server.js"]
