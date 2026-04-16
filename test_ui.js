const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
    const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    try {
        const browser = await puppeteer.launch({ executablePath: browserPath, headless: true });
        const page = await browser.newPage();

        page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER_ERROR:', err.message));
        page.on('requestfailed', request => console.log('BROWSER_NET_FAIL:', request.url(), request.failure().errorText));

        const filePath = `file:///${path.resolve(__dirname, 'pos.html').replace(/\\/g, '/')}`;
        console.log("Navigating to:", filePath);
        await page.goto(filePath, { waitUntil: 'networkidle2' });

        await browser.close();
    } catch (e) {
        console.log("Puppeteer Error:", e);
    }
})();
