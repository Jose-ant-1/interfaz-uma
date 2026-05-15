# Etapa 1: Construcción
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Etapa 2: Servidor (Nginx)
FROM nginx:stable-alpine
# CORRECCIÓN AQUÍ: Copiamos DESDE la etapa build (--from=build)
# Nota: Revisa si tu carpeta es 'dist/' o 'dist/tu-proyecto-name/'
COPY --from=build /app/dist/interfaz-uma/browser/ /usr/share/nginx/html/

# Copia tu configuración personalizada (esto arregla el 404 al refrescar)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
