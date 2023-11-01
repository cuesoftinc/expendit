# syntax=docker/dockerfile:1

FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --production
CMD ["node", "app/page.tsx"]
EXPOSE 3000