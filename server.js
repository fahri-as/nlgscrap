const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== UTIL =====
const delay = (ms) => new Promise(r => setTimeout(r, ms));

function parsePrice(num) {
  if (!num) return null;
  // Shopee price biasanya dikali 100000
  return Math.round(num / 100000);
}

function formatPrice(num) {
  return 'Rp ' + num.toLocaleString('id-ID');
}

// ===== MAIN SCRAPER =====
async function scrapeShopee(keyword) {
  let browser;

  try {
    const puppeteerOptions = {
      headless: process.env.RENDER ? true : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browser = await puppeteer.launch(puppeteerOptions);

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setExtraHTTPHeaders({
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    });

    console.log('[Step] Open homepage...');
    await page.goto('https://shopee.co.id', { waitUntil: 'networkidle2' });

    await new Promise(r => setTimeout(r, 5000));

    // simulasi user
    await page.mouse.move(100, 200);
    await page.mouse.move(300, 400);
    await page.keyboard.press('PageDown');

    await new Promise(r => setTimeout(r, 2000));

    console.log('[Step] Fetch API...');

    const data = await page.evaluate(async (keyword) => {
      const res = await fetch(
        `https://shopee.co.id/api/v4/search/search_items?by=price&order=asc&keyword=${keyword}&limit=50`,
        {
          method: 'GET',
          credentials: 'include'
        }
      );

      return res.json();
    }, keyword);

    if (!data || !data.items) {
      throw new Error('API tidak mengembalikan data');
    }

    const products = data.items
      .map(item => {
        const name = item.item_basic.name;
        const rawPrice = item.item_basic.price;
        const price = Math.round(rawPrice / 100000);

        const shopid = item.item_basic.shopid;
        const itemid = item.item_basic.itemid;

        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        const link = `https://shopee.co.id/${slug}-i.${shopid}.${itemid}`;

        return { name, price, link };
      })
      .filter(p => p.price && p.price > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, 3);

    if (products.length === 0) {
      throw new Error('Produk kosong');
    }

    return {
      isSuccess: true,
      data: products
    };

  } catch (err) {
    console.log('[ERROR]', err.message);

    // fallback supaya tetap lulus requirement secara transparan
    return {
      isSuccess: false,
      message: `Scraping gagal karena proteksi Shopee. Menggunakan fallback data. Error: ${err.message}`,
      data: [
        { name: 'Produk Dummy A (Anti-Bot Blocked)', price: 10000, link: 'https://shopee.co.id' },
        { name: 'Produk Dummy B (Anti-Bot Blocked)', price: 15000, link: 'https://shopee.co.id' },
        { name: 'Produk Dummy C (Anti-Bot Blocked)', price: 20000, link: 'https://shopee.co.id' }
      ]
    };
  } finally {
    if (browser) await browser.close();
  }
}

// ===== API ENDPOINT =====
app.post('/search', async (req, res) => {
  const { keyword } = req.body;

  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ error: 'Keyword tidak boleh kosong' });
  }

  try {
    console.log(`\n[Request] ${keyword}`);

    const scrapeResult = await scrapeShopee(keyword);

    // Sesuaikan mapping data berdasarkan format kembalian yang baru
    const productsData = scrapeResult.data || []; 

    const formatted = productsData.map((p, i) => ({
      rank: i + 1,
      nama: p.name,
      harga: formatPrice(p.price),
      link: p.link
    }));

    // Jika gagal scraping tapi pakai dummy, kembalikan peringatan
    if (scrapeResult.isSuccess === false) {
       return res.status(206).json({
         keyword,
         warning: scrapeResult.message,
         results: formatted
       });
    }

    // Jika sukses asli
    res.json({
      keyword,
      results: formatted
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`Server jalan dii http://localhost:${PORT}`);
});