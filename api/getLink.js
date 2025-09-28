// File: /api/getLink.js - MORE POWERFUL VERSION

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

export default async function handler(req, res) {
  const { pageUrl } = req.query;

  if (!pageUrl) {
    return res.status(400).json({ error: 'pageUrl query parameter is required.' });
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    let videoLink = null; // Changed variable name to be more generic

    // Listen to network traffic
    page.on('response', async (response) => {
      const url = response.url();
      
      // NEW: Check for both .m3u8 AND .mp4 links
      if (url.includes('.m3u8') || url.includes('.mp4')) {
        videoLink = url;
      }
    });

    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 40000 });

    if (videoLink) {
      res.status(200).json({ videoUrl: videoLink });
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