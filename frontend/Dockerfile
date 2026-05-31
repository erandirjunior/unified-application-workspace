FROM node:20-alpine

WORKDIR /app

# Copia apenas os arquivos de dependências primeiro (otimização de cache)
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
