// File: /api/getLink.js - UPDATED CODE

// Use the new, recommended library
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

export default async function handler(req, res) {
  const { pageUrl } = req.query;

  if (!pageUrl) {
    return res.status(400).json({ error: 'pageUrl query parameter is required.' });
  }

  let browser = null;

  try {
    // Launch the browser using the new library's settings
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      // IMPORTANT: The path is now a function call
      executablePath: await chromium.executablePath(),
      headless: chromium.headless, // Use the library's recommended headless mode
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    let m3u8Link = null;

    // This part remains the same - it's still correct
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.m3u8')) {
        m3u8Link = url;
      }
    });

    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 25000 });

    if (m3u8Link) {
      res.status(200).json({ videoUrl: m3u8Link });
    } else {
      res.status(404).json({ error: 'Could not find a streaming link on the page.' });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while scraping.', details: error.message });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}