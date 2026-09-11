FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY pedido-rapido.html /usr/share/nginx/html/pedido-rapido.html
COPY rota-do-dia.html /usr/share/nginx/html/rota-do-dia.html
COPY planejamento.html /usr/share/nginx/html/planejamento.html
COPY historico.html /usr/share/nginx/html/historico.html
COPY rota-detalhes.html /usr/share/nginx/html/rota-detalhes.html
COPY configuracoes.html /usr/share/nginx/html/configuracoes.html
COPY assets /usr/share/nginx/html/assets
COPY docker-entrypoint.d/40-inject-google-maps-key.sh /docker-entrypoint.d/40-inject-google-maps-key.sh
RUN chmod +x /docker-entrypoint.d/40-inject-google-maps-key.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost/ || exit 1
