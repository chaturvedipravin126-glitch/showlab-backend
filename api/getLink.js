// File: /api/getLink.js - DEBUG VERSION

const chromium = require('@sparticuz/chromium');
const puppeteer =require('puppeteer-core');

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

    const frames = page.frames();
    
    for (const frame of frames) {
      try {
        const videoSrc = await frame.evaluate(() => {
          const videoElement = document.querySelector('video');
          return videoElement ? videoElement.src : null;
        });

        if (videoSrc) {
          videoUrl = videoSrc;
          break;
        }
      } catch (e) {
        console.log(`Could not evaluate a frame, continuing...`);
      }
    }

    if (videoUrl) {
      res.status(200).json({ videoUrl: videoUrl });
    } else {
      // ### THIS IS THE DEBUGGING PART ###
      // If no link is found, get the entire HTML of the page.
      const pageContent = await page.content();
      
      // Send the HTML content back in the error message.
      res.status(404).json({ 
          error: 'Could not find a streaming link. The page HTML is attached for debugging.',
          debug_html: pageContent 
      });
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
