FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV API_PROXY_TARGET=http://backend:8000
CMD ["npm", "run", "dev"]
