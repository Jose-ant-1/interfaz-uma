# Etapa 1: Construcción (Sin cambios)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Etapa 2: Servidor (Nginx) - RUTA CORREGIDA
FROM nginx:stable-alpine
# Cambiamos 'interfaz-uma' por 'uma'
COPY --from=build /app/dist/uma/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
