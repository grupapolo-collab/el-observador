FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server ./server
COPY el-observador.html ./
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server/server.js"]
