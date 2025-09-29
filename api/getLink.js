// File: /api/getLink.js - FINAL NETWORK INTERCEPTION VERSION

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

    // This is the most reliable method: Intercept network requests
    await page.setRequestInterception(true);

    const videoUrlPromise = new Promise((resolve, reject) => {
      // Set a timeout in case no link is found
      const timeout = setTimeout(() => {
        reject(new Error('Timeout: .m3u8 link not found within 30 seconds.'));
      }, 30000); // 30 second timeout

      page.on('request', (request) => {
        // Check if the request URL is the video link we are looking for
        if (request.url().includes('.m3u8') && request.resourceType() === 'manifest') {
          clearTimeout(timeout); // Clear the timeout as we found the link
          resolve(request.url()); // Resolve the promise with the found URL
        } else {
          request.continue(); // Allow other requests to continue
        }
      });
    });

    // Go to the page. We don't need to wait for it to be fully idle.
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });

    // Wait for the video link promise to resolve
    const videoUrl = await videoUrlPromise;

    if (videoUrl) {
      res.status(200).json({ videoUrl: videoUrl });
    } else {
      // This part will likely not be reached because of the timeout
      res.status(404).json({ error: 'Could not find a .m3u8 manifest link.' });
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
