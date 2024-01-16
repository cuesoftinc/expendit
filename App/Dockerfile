# Base image for Node.js environment
FROM node:18.14.1-alpine AS development

# Set working directory
WORKDIR /usr/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy remaining app files
COPY . .


# Expose port 3000 for the app
EXPOSE 3000

# Start the app in production mode
CMD ["npm", "run", "dev"]
