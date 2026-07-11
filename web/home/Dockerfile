FROM node:18.14.1-alpine AS development

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
EXPOSE 3000