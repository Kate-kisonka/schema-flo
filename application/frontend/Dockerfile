FROM node:20.20.2-alpine3.23 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

FROM alpine:3.23

WORKDIR /app
COPY --from=build /app/dist ./dist

CMD ["/bin/true"]
