// File: /api/getLink.js - THE MOST POWERFUL & FINAL VERSION

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

    // --- METHOD 1: Listen to Network Requests (Fastest Method) ---
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const url = request.url();
      // Look for both .m3u8 and .mp4
      if ((url.includes('.m3u8') || url.includes('.mp4')) && !videoUrl) {
        console.log(`[Network] Found potential video link: ${url}`);
        videoUrl = url;
      }
      request.continue();
    });

    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 55000 });

    // --- METHOD 2: HTML Scraping (Fallback Method) ---
    // If the network listener didn't find anything, we try to scan the HTML.
    if (!videoUrl) {
      console.log('[HTML Fallback] Network scan found nothing. Now checking HTML...');
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const foundUrlInFrame = await frame.evaluate(() => {
            const videoEl = document.querySelector('video');
            if (videoEl && videoEl.src) return videoEl.src;

            const linkEl = document.querySelector('a[href$=".mp4"]');
            if (linkEl && linkEl.href) return linkEl.href;
            
            return null;
          });

          if (foundUrlInFrame) {
            console.log(`[HTML Fallback] Found link in a frame: ${foundUrlInFrame}`);
            videoUrl = foundUrlInFrame;
            break; // Exit loop once found
          }
        } catch (e) {
          // Ignore frames we can't access
        }
      }
    }

    if (videoUrl) {
      res.status(200).json({ videoUrl: videoUrl });
    } else {
      res.status(404).json({ error: 'Could not find any .m3u8 or .mp4 link on the page.' });
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
