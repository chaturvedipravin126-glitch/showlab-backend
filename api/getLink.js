// File: /api/getLink.js - FINAL CORRECTED VERSION

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
    let videoUrl = null;
    
    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 55000 });

    // ### THE REAL FIX IS HERE: Find the correct iframe and search inside it ###
    // JSBin puts the result in an iframe, so we need to find it first.
    const frame = page.frames().find(f => f.name() === 'JS Bin Output');
    
    if (frame) {
      console.log('[iFrame Check] Found the JS Bin output iframe. Searching for video tag inside it...');
      // Now, run the search logic INSIDE the iframe
      const videoSrc = await frame.evaluate(() => {
        const videoElement = document.querySelector('video');
        return videoElement ? videoElement.src : null;
      });

      if (videoSrc) {
        console.log(`[iFrame Check] Found video src in iframe: ${videoSrc}`);
        videoUrl = videoSrc;
      }
    } else {
        // Fallback for websites that don't use this specific iframe structure
        console.log('[HTML Check] Could not find specific iframe. Checking main page for <video> tag...');
        const videoSrc = await page.evaluate(() => {
            const videoElement = document.querySelector('video');
            return videoElement ? videoElement.src : null;
        });
        if (videoSrc) videoUrl = videoSrc;
    }


    if (videoUrl) {
      res.status(200).json({ videoUrl: videoUrl });
    } else {
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
