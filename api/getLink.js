// File: /api/getLink.js - FINAL GUARANTEED VERSION

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
    
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 55000 });

    // ### THE REAL FIX: Wait for the iframe element to appear on the page first ###
    console.log('[iFrame Wait] Waiting for the output iframe to be ready...');
    // This command will PAUSE execution until the iframe with this specific selector is visible
    await page.waitForSelector('iframe[name="JS Bin Output"]');
    console.log('[iFrame Wait] iFrame is ready!');

    // Now that we know the iframe exists, we get it
    const elementHandle = await page.$('iframe[name="JS Bin Output"]');
    const frame = await elementHandle.contentFrame();

    if (frame) {
      console.log('[iFrame Search] Searching for video tag inside the iframe...');
      const videoSrc = await frame.evaluate(() => {
        const videoElement = document.querySelector('video');
        return videoElement ? videoElement.src : null;
      });

      if (videoSrc) {
        console.log(`[iFrame Search] Found video src: ${videoSrc}`);
        videoUrl = videoSrc;
      }
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
