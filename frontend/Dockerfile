FROM node:24-alpine AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve the app with Nginx
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
# Clean the default public folder
RUN rm -rf ./*

# Copy the static build files from the previous stage
COPY --from=build /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Expose port 80 for the web server
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
