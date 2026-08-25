FROM node:20.20.2-alpine3.23

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
