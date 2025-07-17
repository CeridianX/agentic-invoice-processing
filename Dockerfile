# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY agentic-invoice-app/agentic-invoice-app/package*.json ./agentic-invoice-app/agentic-invoice-app/
COPY agentic-invoice-app/server/package*.json ./agentic-invoice-app/server/

# Install dependencies
RUN npm install --production=false
RUN cd agentic-invoice-app/agentic-invoice-app && npm install --production=false
RUN cd agentic-invoice-app/server && npm install --production=false

# Copy source code
COPY . .

# Build frontend
RUN cd agentic-invoice-app/agentic-invoice-app && npm run build

# Build backend
RUN cd agentic-invoice-app/server && npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]