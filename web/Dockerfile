# Base image for Node.js environment
FROM node:18.14.1-alpine AS development

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy remaining app files
COPY . .

# NEXT_PUBLIC_* vars are baked into the client bundle at build time, not read at runtime
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

# Build the production bundle
RUN npm run build

# Expose port 3000 for the app
EXPOSE 3000

# Start the app in production mode
CMD ["npm", "run", "start"]
