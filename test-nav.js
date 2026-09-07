const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('HTTP ERROR:', response.url(), response.status());
    }
  });

  await page.goto('http://localhost:5173/');
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'harsh@urbanbuild.in'); // Need a valid login? Wait, user has auth. Let's assume there's a login needed.
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation();
  console.log('Navigated to:', page.url());

  // Click the "Running" link
  await page.click('a[href="/running"]');
  await page.waitForSelector('table');
  console.log('On Running page:', page.url());

  // Find the first link to a work
  const href = await page.evaluate(() => {
    const a = document.querySelector('a[href^="/works/"]');
    if (a) {
      a.click();
      return a.href;
    }
    return null;
  });
  
  console.log('Clicked work link. URL should be:', href);
  
  await page.waitForTimeout(2000);
  console.log('Final URL:', page.url());
  
  await browser.close();
})();
