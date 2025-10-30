# Multi-stage build is handled in the CI to leverage GitHub runner cache for Flutter.
# This runtime image serves the compiled Flutter Web app with Nginx on Cloud Run.

FROM nginx:1.25-alpine

# Cloud Run expects the server to listen on $PORT; default to 8080 and map in nginx.conf
ENV PORT=8080

# Copy our optimized nginx config
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the compiled Flutter web build from the CI step
COPY build/web /usr/share/nginx/html

# Health check endpoint (optional): serve 200 on /
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/ || exit 1

# Expose the port for local runs (Cloud Run uses PORT env)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
