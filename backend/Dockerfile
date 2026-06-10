FROM golang:1.22-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia o arquivo de código fonte para o container
COPY . .

# Expõe a porta configurável do servidor
ARG BACKEND_PORT=8080
EXPOSE ${BACKEND_PORT}