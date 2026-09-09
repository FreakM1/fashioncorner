FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY docker-entrypoint.d/40-inject-google-maps-key.sh /docker-entrypoint.d/40-inject-google-maps-key.sh
RUN chmod +x /docker-entrypoint.d/40-inject-google-maps-key.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost/ || exit 1
