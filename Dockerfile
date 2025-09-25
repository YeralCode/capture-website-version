# Usar Alpine Linux para mejor rendimiento
FROM node:18-alpine

# Instalar dependencias necesarias de una vez
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    py3-pip \
    py3-requests \
    py3-beautifulsoup4 \
    dumb-init

# Configurar Puppeteer para usar Chromium del sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json primero para aprovechar cache de Docker
COPY package*.json ./

# Instalar dependencias de Node.js sin devDependencies
RUN npm ci --omit=dev --no-audit --no-fund

# Copiar el resto del código
COPY . .

# Crear directorios necesarios y hacer scripts ejecutables
RUN mkdir -p screenshots output scraped_data && \
    chmod +x src/scripts/python/*.py

# Crear usuario no-root para Puppeteer
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -g nodejs && \
    chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start:integrated"]
