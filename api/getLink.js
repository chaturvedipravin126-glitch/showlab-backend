// File: /api/getLink.js - BRUTE-FORCE IFRAME SCANNING

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

    // ### THE NEW BRUTE-FORCE LOGIC ###
    console.log('[Brute-Force] Starting scan of all iframes on the page...');
    // Get all the frames (iframes) on the page
    const frames = page.frames();
    console.log(`[Brute-Force] Found ${frames.length} frames to check.`);

    // Loop through each frame one by one
    for (const frame of frames) {
      try {
        // Try to find a video tag inside the current frame
        const videoSrc = await frame.evaluate(() => {
          const videoElement = document.querySelector('video');
          return videoElement ? videoElement.src : null;
        });

        // If we found a video link in this frame, our job is done!
        if (videoSrc) {
          console.log(`[Brute-Force] SUCCESS! Found video src in a frame: ${videoSrc}`);
          videoUrl = videoSrc;
          break; // Exit the loop
        }
      } catch (e) {
        // This can happen if a frame is cross-origin or inaccessible, just ignore and continue
        console.log(`[Brute-Force] Could not access a frame, continuing...`);
      }
    }

    if (videoUrl) {
      res.status(200).json({ videoUrl: videoUrl });
    } else {
      res.status(404).json({ error: 'Could not find a streaming link in any frame on the page.' });
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
