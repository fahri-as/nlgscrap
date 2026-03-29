# Shopee Scraper

Aplikasi web scraping yang mengekstrak data pencarian dari Shopee dan memfilter **3 produk termurah** berdasarkan *keyword* yang dimasukkan pengguna secara dinamis.

---

## Technical Submission Breakdown

Berikut elaborasi teknikal untuk melengkapi persyaratan submission:

### 1. Scraping Approach Used
Pendekatan eksekusi scraping yang digunakan adalah simulasi browser organik yang mengekstrak data secara langsung dari *internal search API* Shopee (`/api/v4/search/search_items`) yang dipanggil secara lokal dari dalam memori halaman utama (*evaluate context*). Setelah data dasar terkumpul, fungsi penyortiran berlapis dari URL *params* hingga fungsi enumerasi array Node.js `.sort()` menghasilkan 3 *lowest price*.
Sistem ini menggunakan struktur **Graceful Degradation** (*Fallback Policy*): bila Shopee mengidentifikasi sesi sebagai *bot* dan menolak akses (*Forbidden/Timeout*), program tidak mengalami *crash* melainkan turun ke mekanisme respon HTTP `206 Partial Content` yang berisi data tiruan, lengkap dengan pesan sistem asli (transparan) ke *front-end UI*.

### 2. Tools/Libraries Used
- **Backend Environment**: `Node.js` dan `Express.js` untuk meng-hosting REST API dan File Statik situs web.
- **Scraping Engine**: `Puppeteer` untuk *headless browser integration* supaya siklus *dynamic API rendering* berjalan alami.
- **Anti-bot Bypass**: `puppeteer-extra` beserta `puppeteer-extra-plugin-stealth` ditambahkan pada parameter instan Chromium sebagai lapisan *fingerprinting evader* dari proteksi kapca otomatis.

### 3. Challenges Faced
Shopee mengimplementasikan arsitektur proteksi *anti-bot* yang sangat agresif (kemungkinan Cloudflare Turnstile / DataDome). Meskipun telah menggunakan *stealth plugin* untuk merubah metrik eksekusi *headless browser* standar, pemanggilan internal endpoint Shopee terkadang tetap ditolak dan memunculkan galat *403 Forbidden* utamanya karena perputaran token dan _cookie_ enkripsi (`af-ac-enc-dat`).
Tantangan utamanya bagi lingkungan *server side* adalah menjamin fungsionalitas aplikasi presentasi dari sisi pengguna; karenanya saya mengimplementasikan peredaman pengecualian *error Catching logic* khusus. Bila target Shopee tidak dapat ditembus sama sekali, API merespons secara transparan dengan *warning partial-fallback* berisi tiga sampel struktur statis *(dummy response)* agar sistem terkesan stabil dan *layout UI* penguji tetap dapat memvalidasi jalannya aplikasi tanpa terhalang kerusakan (*Fatal Application Error*).

---

## Cara Menjalankan Aplikasi

```bash
# 1. Install dependencies
npm install

# 2. Jalankan server
node server.js
```

Akses _Front-end Client_ di Web Browser Anda lewat alamat: `http://localhost:3000`

## Dokumentasi API Endpoint

### `POST /search`

**Request body:**
```json
{ "keyword": "Compressor" }
```

**Response Pattern (Sukses Real Scraping - HTTP 200 OK):**
```json
{
  "keyword": "Compressor",
  "results": [
    {
      "rank": 1,
      "nama": "Mesin Kompresor Listrik Lakoni",
      "harga": "Rp 980.000",
      "link": "https://shopee.co.id/mesin-kompresor-listrik..."
    }
  ]
}
```

**Response Pattern (Anti-bot Terpicu / Fallback Mode - HTTP 206 Partial Content):**
```json
{
  "keyword": "Compressor",
  "warning": "Scraping gagal karena proteksi Shopee. Menggunakan fallback data. Error: API tidak mengembalikan data",
  "results": [
    {
      "rank": 1,
      "nama": "Produk Dummy A (Anti-Bot Blocked)",
      "harga": "Rp 10.000",
      "link": "https://shopee.co.id"
    }
  ]
}
