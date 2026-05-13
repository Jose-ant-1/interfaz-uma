# Etapa 1: Construcción
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Etapa 2: Servidor
FROM nginx:stable-alpine
# Ajusta 'interfaz-uma' al nombre real de tu proyecto en angular.json
COPY --from=build /app/dist/interfaz-uma/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
