// File: /api/getLink.js - THE ULTIMATE VERSION

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

export default async function handler(req, res) {
  const { pageUrl } = req.query;

  if (!pageUrl) {
    return res.status(400).json({ error: 'pageUrl query parameter is required.' });
  }

  let browser = null;
  console.log(`Starting to scrape page: ${pageUrl}`);

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    let videoUrl = null;

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('.m3u8') || url.includes('.mp4') || url.includes('videoplayback')) {
        console.log(`[Network] Found potential video URL: ${url}`);
        if (!videoUrl) videoUrl = url; // Only set if not already found
      }
    });
    
    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 55000 });

    // ### NEW LOGIC: Check the final HTML for <video> tags ###
    if (!videoUrl) {
      console.log('[HTML Check] Network scan found nothing. Now checking HTML for <video> tags...');
      // page.evaluate() runs JavaScript directly on the page in the browser
      const videoSrc = await page.evaluate(() => {
        const videoElement = document.querySelector('video'); // Find the first <video> element
        return videoElement ? videoElement.src : null; // If found, return its 'src' attribute
      });

      if (videoSrc) {
        console.log(`[HTML Check] Found video src in HTML: ${videoSrc}`);
        videoUrl = videoSrc;
      }
    }

    if (videoUrl) {
      console.log(`Success! Returning video URL: ${videoUrl}`);
      res.status(200).json({ videoUrl: videoUrl });
    } else {
      console.log('Scraping finished, but no video URL was found through any method.');
      res.status(404).json({ error: 'Could not find a streaming link on the page.' });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred during scraping.', details: error.message });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
