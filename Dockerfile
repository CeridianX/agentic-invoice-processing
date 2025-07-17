# Use Node.js 18 LTS
FROM node:18-alpine

# Add build argument to bust cache
ARG CACHEBUST=2

# Install OpenSSL and other dependencies
RUN apk add --no-cache openssl libc6-compat

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

# Generate Prisma client (must be done after copying source code to have access to schema)
RUN cd agentic-invoice-app/server && npx prisma generate

# Build frontend
RUN cd agentic-invoice-app/agentic-invoice-app && npm run build

# Build backend
RUN cd agentic-invoice-app/server && npm run build

# Debug: List directory structure
RUN echo "=== Directory structure ===" && \
    ls -la /app/ && \
    echo "=== Frontend dist ===" && \
    ls -la /app/agentic-invoice-app/agentic-invoice-app/dist/ || echo "Frontend dist not found" && \
    echo "=== Backend dist ===" && \
    ls -la /app/agentic-invoice-app/server/dist/ || echo "Backend dist not found"

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]