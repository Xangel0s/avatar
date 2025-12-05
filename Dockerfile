# Dockerfile para producción
FROM nginx:alpine

# Copiar archivos estáticos
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets/

# Copiar configuración de nginx
COPY .nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Entrypoint: script que genera config.js y arranca nginx
CMD ["/bin/sh", "-c", "set -e; echo \"window.OPENROUTER_API_KEY = \\\"${OPENROUTER_API_KEY:-}\\\";\" > /usr/share/nginx/html/config.js; echo \"config.js generado con API key\"; exec nginx -g 'daemon off;'"]

