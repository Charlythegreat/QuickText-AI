# =============================================================================
# QuickText AI Backend - Docker Image
# =============================================================================
# Free & Unlimited AI text generation API
# Powered by Groq + Llama 3
# =============================================================================

FROM node:18-alpine

# Labels
LABEL maintainer="Charlythegreat"
LABEL description="QuickText AI Backend - Free & Unlimited"
LABEL version="1.0.0"

# Create app directory
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Remove development files
RUN rm -rf .env.example *.md test/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV LLM_PROVIDER=groq
ENV LLM_MODEL=llama3-70b-8192
ENV LLM_MAX_TOKENS=1024
ENV RATE_LIMIT_MAX=30

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the server
CMD ["node", "server.js"]
