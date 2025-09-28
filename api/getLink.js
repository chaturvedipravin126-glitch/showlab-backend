// File: /api/getLink.js - FINAL ADVANCED VERSION

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

    // We will listen for network requests to find the video link
    page.on('request', (request) => {
      const url = request.url();
      // Look for common video file extensions and keywords
      if (url.includes('.m3u8') || url.includes('.mp4') || url.includes('videoplayback')) {
        console.log(`Found potential video URL in network request: ${url}`);
        videoUrl = url;
        // Optional: Abort the request if you don't need to download the video itself
        // request.abort(); 
      }
    });
    
    // Increased timeout to 55 seconds for slow pages
    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 55000 });

    // If we haven't found a link yet, let's check for iframes
    if (!videoUrl) {
      console.log('No direct video link found, checking for iframes...');
      const frames = page.frames();
      for (const frame of frames) {
        const frameUrl = frame.url();
        console.log(`Checking frame with URL: ${frameUrl}`);
        // Many sites use these domains for their players
        if (frameUrl.includes('dood') || frameUrl.includes('streamtape') || frameUrl.includes('voe.sx')) {
          console.log(`Found a potential player iframe: ${frameUrl}`);
          videoUrl = frameUrl; // We might need to scrape this iframe URL in a second step, but for now, this is a good start.
          break;
        }
      }
    }

    if (videoUrl) {
      console.log(`Success! Returning video URL: ${videoUrl}`);
      res.status(200).json({ videoUrl: videoUrl });
    } else {
      console.log('Scraping finished, but no video URL was found.');
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
