# Multi-stage build for PRP CLI with MCP Server
# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --no-audit --no-fund

# Copy source code
COPY . .

# Build the CLI
RUN npm run build

# Verify CLI was built
RUN test -f dist/cli.js || (echo "CLI build failed" && exit 1)

# Install only production dependencies for smaller image
RUN npm prune --production

# Stage 2: MCP Server Runtime stage
FROM node:20-alpine AS mcp-server

# Install runtime dependencies
RUN apk add --no-cache \
    git \
    curl \
    bash \
    openssl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S prp && \
    adduser -S prp -u 1001 -G prp

# Set working directory
WORKDIR /home/prp

# Copy built CLI from builder stage
COPY --from=builder --chown=prp:prp /app/dist ./dist
COPY --from=builder --chown=prp:prp /app/package*.json ./
COPY --from=builder --chown=prp:prp /app/node_modules ./node_modules

# Copy templates if they exist
COPY --from=builder --chown=prp:prp /app/templates ./templates 2>/dev/null || true

# Create symlinks for easier CLI access
RUN ln -s ./dist/cli.js ./prp && \
    chmod +x ./dist/cli.js ./prp

# Create MCP server startup script with metrics
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Check if API_SECRET is set\n\
if [ -z "$API_SECRET" ]; then\n\
    echo "Error: API_SECRET environment variable is required for MCP server"\n\
    exit 1\n\
fi\n\
\n\
# Set default port if not provided\n\
PORT=${PORT:-8080}\n\
HOST=${HOST:-0.0.0.0}\n\
\n\
echo "Starting PRP MCP Server..."\n\
echo "Port: $PORT"\n\
echo "Host: $HOST"\n\
echo "Environment: $NODE_ENV"\n\
echo "Metrics available at: http://$HOST:$PORT/metrics"\n\
echo "Health checks at: http://$HOST:$PORT/health"\n\
echo "Readiness probe at: http://$HOST:$PORT/metrics/health/readiness"\n\
echo "Liveness probe at: http://$HOST:$PORT/metrics/health/liveness"\n\
\n\
# Start MCP server with metrics enabled\n\
exec ./prp mcp start --port $PORT --host $HOST' > ./start-mcp.sh && \
    chmod +x ./start-mcp.sh

# Switch to non-root user
USER prp

# Set environment variables
ENV NODE_ENV=production
ENV PRP_TELEMETRY=false
ENV PRP_NO_COLOR=true

# Set default command for MCP server
ENTRYPOINT ["./start-mcp.sh"]
CMD []

# Labels for metadata
LABEL maintainer="dcversus" \
      description="PRP MCP Server - Model Context Protocol for Remote Orchestration" \
      version="0.5.0" \
      org.opencontainers.image.title="PRP MCP Server" \
      org.opencontainers.image.description="Model Context Protocol server for remote orchestration and control" \
      org.opencontainers.image.url="https://github.com/dcversus/prp" \
      org.opencontainers.image.documentation="https://github.com/dcversus/prp#readme" \
      org.opencontainers.image.source="https://github.com/dcversus/prp" \
      org.opencontainers.image.vendor="dcversus" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="0.5.0"

# Health check for MCP server (liveness probe)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Volume mount for workspace
VOLUME ["/workspace"]

# Expose MCP server port (metrics available on same port at /metrics)
EXPOSE 8080

# Set default working directory when using volume mounts
WORKDIR /workspace