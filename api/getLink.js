// File: /api/getLink.js

const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

export default async function handler(req, res) {
  // Get the pageUrl from the app's request (e.g., .../api/getLink?pageUrl=...)
  const { pageUrl } = req.query;

  if (!pageUrl) {
    return res.status(400).json({ error: 'pageUrl query parameter is required.' });
  }

  let browser = null;

  try {
    // Launch a virtual Chrome browser using the special Vercel-compatible packages
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    let m3u8Link = null;

    // This is the key: Listen to all network traffic the page generates
    page.on('response', async (response) => {
      const url = response.url();
      // If the page requests a file ending in .m3u8, we've found the streaming link!
      if (url.includes('.m3u8')) {
        m3u8Link = url;
      }
    });

    // Go to the source page URL (e.g., the public domain movie page)
    // 'networkidle2' tells Puppeteer to wait until the network is quiet, meaning JavaScript has likely finished loading
    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 25000 });

    // If we found a link, send it back to the Android app
    if (m3u8Link) {
      res.status(200).json({ videoUrl: m3u8Link });
    } else {
      res.status(404).json({ error: 'Could not find a streaming link on the page.' });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while scraping.', details: error.message });
  } finally {
    // VERY IMPORTANT: Close the browser to prevent the function from timing out
    if (browser !== null) {
      await browser.close();
    }
  }
}