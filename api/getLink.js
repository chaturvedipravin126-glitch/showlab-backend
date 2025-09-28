// File: /api/getLink.js - FINAL VERSION (Handles both <video> tags and <a> links)

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

    const frames = page.frames();
    
    for (const frame of frames) {
      try {
        const foundUrl = await frame.evaluate(() => {
          // First, try to find a <video> tag's src
          const videoElement = document.querySelector('video');
          if (videoElement && videoElement.src) {
            return videoElement.src;
          }

          // If no <video> tag, find the first download link ending in .mp4
          const linkElement = document.querySelector('a[href$=".mp4"]');
          if (linkElement && linkElement.href) {
            return linkElement.href;
          }
          
          return null; // Return null if nothing is found in this frame
        });

        if (foundUrl) {
          videoUrl = foundUrl;
          break; // Exit the loop as soon as we find a link
        }
      } catch (e) {
        console.log(`Could not evaluate a frame, continuing...`);
      }
    }

    if (videoUrl) {
      res.status(200).json({ videoUrl: videoUrl });
    } else {
      res.status(404).json({ error: 'Could not find any video tag or .mp4 link on the page.' });
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
