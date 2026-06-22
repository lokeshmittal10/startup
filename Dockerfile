# Use official Node.js light image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json first to cache dependencies
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy all static frontend files and backend server files
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
