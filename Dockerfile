# Etapa 1: Construcción
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Etapa 2: Servidor (Nginx)
FROM nginx:stable-alpine
# CAMBIO AQUÍ: La ruta real según tus logs es /app/dist/uma/browser/
COPY --from=build /app/dist/uma/browser/ /usr/share/nginx/html/

# Esto arregla el 404 al refrescar
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
