# Etapa 1: Construcción (Sin cambios)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Etapa 2: Servidor (Nginx) - RUTA CORREGIDA
FROM nginx:stable-alpine
# Copiamos los archivos de Angular (asegúrate de que la ruta sea correcta)
COPY dist/ /usr/share/nginx/html/
# ESTA LÍNEA ES VITAL: Copia tu configuración personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


