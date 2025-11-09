# Multi-stage build for PRP CLI
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

# Install dependencies
RUN npm ci --only=production --no-audit --no-fund

# Copy source code
COPY . .

# Build the CLI
RUN npm run build

# Verify CLI was built
RUN test -f dist/cli.js || (echo "CLI build failed" && exit 1)

# Stage 2: Runtime stage
FROM node:20-alpine AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    git \
    curl \
    bash \
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

# Switch to non-root user
USER prp

# Set environment variables
ENV NODE_ENV=production
ENV PRP_TELEMETRY=false
ENV PRP_NO_COLOR=true

# Set default command
ENTRYPOINT ["./prp"]
CMD ["--help"]

# Labels for metadata
LABEL maintainer="dcversus" \
      description="PRP CLI - Interactive Project Bootstrap CLI" \
      version="0.4.9" \
      org.opencontainers.image.title="PRP CLI" \
      org.opencontainers.image.description="Interactive Project Bootstrap CLI with AI integration" \
      org.opencontainers.image.url="https://github.com/dcversus/prp" \
      org.opencontainers.image.documentation="https://github.com/dcversus/prp#readme" \
      org.opencontainers.image.source="https://github.com/dcversus/prp" \
      org.opencontainers.image.vendor="dcversus" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="0.4.9"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ./prp --version || exit 1

# Volume mount for workspace
VOLUME ["/workspace"]

# Expose nothing (CLI tool)
# EXPOSE not needed for CLI

# Set default working directory when using volume mounts
WORKDIR /workspace