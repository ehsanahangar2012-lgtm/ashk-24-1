/**
 * Real Target Connectivity & DOM Interaction Test for Ashk24 Cloud Worker POC
 * Tests: Real Navigation, Real DOM access, Real Form Fill, Real Challenge Detection (CAPTCHA / OTP), Evidence Capture.
 * ZERO MOCK - ZERO FAKE PASS.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EVIDENCE_DIR = path.resolve(process.cwd(), 'local-agent/evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runRealTargetPOC() {
  console.log('---------------------------------------------------------');
  console.log('🚀 [Ashk24 Worker POC] Starting Real Target Verification');
  console.log('Target: divar.ir (New Ad / Login Form)');
  console.log('Zero-Fake-Pass Active - Reporting 100% genuine evidence.');
  console.log('---------------------------------------------------------');

  const startTime = Date.now();
  let browser = null;
  const result = {
    target: 'https://divar.ir/new',
    timestamp: new Date().toISOString(),
    networkConnected: false,
    httpStatus: null,
    domLoaded: false,
    formElementsFound: [],
    filledField: false,
    challengeDetected: null, // 'OTP_PROMPT' | 'CAPTCHA_CHALLENGE' | 'BLOCKED' | 'NONE'
    pausedForHumanAction: false,
    evidenceScreenshot: null,
    evidenceHtml: null,
    durationMs: 0,
    error: null
  };

  try {
    console.log('1. Launching Real Headless Chromium...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'fa-IR'
    });

    const page = await context.newPage();

    console.log('2. Navigating to https://divar.ir/new ...');
    const response = await page.goto('https://divar.ir/new', {
      waitUntil: 'domcontentloaded',
      timeout: 35000
    });

    result.networkConnected = true;
    result.httpStatus = response ? response.status() : null;
    console.log(`📡 Response HTTP Status: ${result.httpStatus}`);

    // Wait a little for React/Next.js hydration on Divar
    await page.waitForTimeout(3000);
    result.domLoaded = true;

    // Save full page title and URL
    const title = await page.title();
    const finalUrl = page.url();
    console.log(`📄 Page Title: "${title}" | Current URL: ${finalUrl}`);

    // Check DOM for input fields (phone number or search)
    const inputs = await page.$$('input');
    console.log(`🔍 Found ${inputs.length} input element(s) in DOM.`);
    for (let i = 0; i < inputs.length; i++) {
      const type = await inputs[i].getAttribute('type');
      const placeholder = await inputs[i].getAttribute('placeholder');
      const name = await inputs[i].getAttribute('name');
      result.formElementsFound.push({ type, placeholder, name });
      console.log(`   - Input [${i}]: type=${type}, name=${name}, placeholder=${placeholder}`);
    }

    // Try finding the phone input field on Divar
    // Divar usually has input[type="tel"] or input[name="mobile"] or input with placeholder 'شماره'
    const phoneInput = await page.$('input[type="tel"], input[name="mobile"], input[type="text"]');
    if (phoneInput) {
      console.log('3. Interacting with Real Phone Input field...');
      await phoneInput.click();
      await phoneInput.fill('09153108763');
      result.filledField = true;
      console.log('✅ Phone field filled successfully with 09153108763');

      // Find submit/next button
      const buttons = await page.$$('button');
      console.log(`🔍 Found ${buttons.length} button(s) on page.`);

      // Screenshot before action
      const screen1Path = path.join(EVIDENCE_DIR, '01_form_filled.png');
      await page.screenshot({ path: screen1Path, fullPage: false });
      result.evidenceScreenshot = screen1Path;
      console.log(`📸 Evidence Screenshot saved to: ${screen1Path}`);

      // Check if button text matches 'تایید' or 'بعدی' or 'ورود'
      let submitButton = null;
      for (const btn of buttons) {
        const text = (await btn.innerText()).trim();
        if (text.includes('بعدی') || text.includes('تایید') || text.includes('ورود') || text.includes('ارسال')) {
          submitButton = btn;
          console.log(`👉 Found action button: "${text}"`);
          break;
        }
      }

      if (submitButton) {
        console.log('4. Clicking Action Button to check Challenge/OTP response...');
        await submitButton.click();
        await page.waitForTimeout(4000);

        // Check for OTP modal or CAPTCHA
        const pageContent = await page.content();
        const hasArcaptcha = pageContent.includes('arcaptcha') || (await page.$('.arcaptcha-frame, iframe[src*="arcaptcha"]')) !== null;
        const hasOtpField = pageContent.includes('کد تایید') || pageContent.includes('پیامک') || (await page.$('input[autocomplete="one-time-code"], input[type="number"]')) !== null;
        const hasRateLimit = pageContent.includes('بیش از حد') || pageContent.includes('تلاش ناموفق');

        if (hasArcaptcha) {
          result.challengeDetected = 'CAPTCHA_CHALLENGE';
          result.pausedForHumanAction = true;
          console.log('⚠️ [Challenge]: Arcaptcha CAPTCHA detected!');
        } else if (hasOtpField) {
          result.challengeDetected = 'OTP_PROMPT';
          result.pausedForHumanAction = true;
          console.log('📱 [Challenge]: SMS OTP confirmation required! State -> PAUSED_USER_ACTION');
        } else if (hasRateLimit) {
          result.challengeDetected = 'RATE_LIMIT_BLOCKED';
          console.log('⛔ [Blocked]: Divar rate limit or IP restriction detected.');
        } else {
          result.challengeDetected = 'TRANSITION_OBSERVED';
          console.log('ℹ️ Form submitted, observing transition...');
        }

        const screen2Path = path.join(EVIDENCE_DIR, '02_after_submit_challenge.png');
        await page.screenshot({ path: screen2Path, fullPage: false });
        console.log(`📸 Second Evidence Screenshot: ${screen2Path}`);
      }
    } else {
      console.log('⚠️ No standard phone input detected directly. Checking if already on ad form or blocked.');
      const screenPath = path.join(EVIDENCE_DIR, '01_initial_page.png');
      await page.screenshot({ path: screenPath, fullPage: false });
      result.evidenceScreenshot = screenPath;
    }

    // Save page HTML as raw evidence
    const htmlPath = path.join(EVIDENCE_DIR, 'page_dump.html');
    fs.writeFileSync(htmlPath, await page.content(), 'utf8');
    result.evidenceHtml = htmlPath;

  } catch (err) {
    console.error(`❌ [Playwright Error]: ${err.message}`);
    result.error = err.message;
  } finally {
    if (browser) await browser.close();
    result.durationMs = Date.now() - startTime;
  }

  // Write final execution report
  const reportPath = path.join(EVIDENCE_DIR, 'poc_result.json');
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`📊 Final Verification Report saved to: ${reportPath}`);
  console.log(JSON.stringify(result, null, 2));

  return result;
}

runRealTargetPOC();
