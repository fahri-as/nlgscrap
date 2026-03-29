# Gunakan image resmi Puppeteer yang sudah berisi Chrome & sistem dependensi Linux
FROM ghcr.io/puppeteer/puppeteer:latest

# Konfigurasi Environment agar Puppeteer memakai Chrome bawaan image
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    NODE_ENV=production

# Pindah ke direktori kerja aplikasi
WORKDIR /usr/src/app

# Login sebagai root hanya untuk copy file dan build
USER root

COPY package*.json ./
RUN npm install

COPY . .

# Pastikan user 'pptruser' memiliki akses ke file project
RUN chown -R pptruser:pptruser /usr/src/app

# Jalankan server menggunakan mode non-root (lebih aman)
USER pptruser

# Expose port yang dipakai (bisa 3000 atau dari process.env.PORT)
EXPOSE 3000

CMD ["npm", "start"]
