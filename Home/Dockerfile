FROM node:18.14.1-alpine AS development

WORKDIR /app
COPY package*.json ./
COPY . .
RUN npm install
CMD ["npm", "run", "dev"]
EXPOSE 3000