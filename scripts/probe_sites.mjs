import { chromium } from '../local-agent/node_modules/playwright/index.mjs';

async function probe() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const sites = [
    { name: 'Payamsara', url: 'https://www.payamsara.com/framework/user/register' },
    { name: 'Agahi24', url: 'https://www.agahi24.com/register' },
    { name: 'Baskool', url: 'https://www.baskool.com/register' },
    { name: 'Istgah', url: 'https://www.istgah.com/register/' }
  ];

  for (const s of sites) {
    const page = await browser.newPage();
    console.log(`\n--- Probing ${s.name}: ${s.url} ---`);
    try {
      const res = await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      console.log(`Status: ${res?.status()}, Title: "${await page.title()}"`);
      const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
          tag: el.tagName.toLowerCase(),
          name: el.name || '',
          id: el.id || '',
          type: el.type || '',
          placeholder: el.placeholder || ''
        }));
      });
      console.log(`Inputs found (${inputs.length}):`, inputs.slice(0, 8));
      
      const content = await page.content();
      const hasCaptcha = content.includes('captcha') || content.includes('arcaptcha') || content.includes('recaptcha');
      console.log(`Has Captcha indicators: ${hasCaptcha}`);
    } catch (err) {
      console.error(`Error loading ${s.name}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

probe();
