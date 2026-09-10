/**
 * Ashk24 Autonomous Agent / Cloud Worker v4.0.10
 * Executes real browser missions using Playwright Chromium connected to cPanel Orchestrator.
 * Supports both Cloud Headless (GitHub Actions / Linux VPS) and Local Headed mode.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CPANEL_URL = process.env.CPANEL_URL || 'http://localhost:3000/cpanel-backend/api/index.php';
const CPANEL_AGENT_TOKEN = process.env.CPANEL_AGENT_TOKEN || 'Ashk24SecureSession';
const AGENT_ID = process.env.AGENT_ID || (process.env.CI ? `gh_actions_${Date.now()}` : `agent_desktop_${Date.now()}`);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);
const IS_ONCE = process.argv.includes('--once');
const IS_HEADLESS = process.env.HEADLESS === 'true' || process.argv.includes('--headless');
const TARGET_JOB_ID = process.env.TARGET_JOB_ID || null;
const PLATFORM_TARGET = process.env.PLATFORM_TARGET || process.env.TARGET_PLATFORM || 'divar';

const EVIDENCE_DIR = path.resolve(process.cwd(), 'local-agent/evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

let activeTunnelProcess = null;
let activeTunnelUrl = null;

async function checkNoVncHealth() {
  try {
    const res = await fetch('http://127.0.0.1:6080/', { signal: AbortSignal.timeout(3000) });
    return res.ok || res.status === 200 || res.status === 302 || res.status === 404;
  } catch (_) {
    return false;
  }
}

async function startQuickTunnel() {
  if (activeTunnelProcess && activeTunnelUrl) return activeTunnelUrl;

  // 1. Verify noVNC service health on port 6080
  const isHealthy = await checkNoVncHealth();
  if (!isHealthy) {
    console.error('❌ [Tunnel Error] noVNC / websockify service is NOT responding on http://127.0.0.1:6080.');
    console.error('   Ensure Xvfb, x11vnc, and websockify daemons are started prior to requesting human interaction.');
    return null;
  }

  return new Promise((resolve) => {
    try {
      console.log('🌐 [Tunnel] Spawning cloudflared quick tunnel for noVNC on http://127.0.0.1:6080...');
      const tunnel = spawn('cloudflared', ['tunnel', '--url', 'http://127.0.0.1:6080'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      activeTunnelProcess = tunnel;

      const timeout = setTimeout(() => {
        console.error('⏱️ [Tunnel Error] cloudflared failed to generate public URL within 15 seconds.');
        resolve(null);
      }, 15000);

      const handleData = (data) => {
        const text = data.toString();
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match) {
          const baseUrl = match[0];
          activeTunnelUrl = `${baseUrl}/vnc.html?autoconnect=true&reconnect=true`;
          console.log(`🔗 [Tunnel Ready] Live interactive noVNC URL: ${activeTunnelUrl}`);
          clearTimeout(timeout);
          resolve(activeTunnelUrl);
        }
      };

      tunnel.stdout.on('data', handleData);
      tunnel.stderr.on('data', handleData);
      tunnel.on('error', (err) => {
        console.error(`❌ [Tunnel Spawn Exception]: ${err.message}`);
        clearTimeout(timeout);
        resolve(null);
      });
      tunnel.on('exit', () => {
        activeTunnelProcess = null;
        activeTunnelUrl = null;
      });
    } catch (err) {
      console.error(`❌ [Tunnel Spawn Exception]: ${err.message}`);
      resolve(null);
    }
  });
}

function stopQuickTunnel() {
  if (activeTunnelProcess) {
    console.log('🛑 [Tunnel] Terminating cloudflared quick tunnel...');
    try {
      activeTunnelProcess.kill('SIGTERM');
    } catch (_) {}
    activeTunnelProcess = null;
    activeTunnelUrl = null;
  }
}

console.log(`=======================================================`);
console.log(`🤖 Ashk24 Worker Engine v4.0.10 Starting...`);
console.log(`🆔 Agent ID: ${AGENT_ID}`);
console.log(`🌐 Orchestrator: ${CPANEL_URL}`);
console.log(`🎯 Target Job ID: ${TARGET_JOB_ID || 'None (Auto-Claim Any Pending)'}`);
console.log(`🏷️ Platform Target: ${PLATFORM_TARGET}`);
console.log(`🖥️ Mode: ${IS_HEADLESS ? 'Headless (Cloud Scale-to-Zero)' : 'Headed (Desktop GUI)'}`);
console.log(`🔄 Execution Type: ${IS_ONCE ? 'Single Job Execution (--once)' : 'Continuous Polling'}`);
console.log(`=======================================================`);

let agentToken = null;

async function handshake() {
  try {
    const initRes = await fetch(`${CPANEL_URL}?route=bridge/handshake/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}` },
      body: JSON.stringify({ agentId: AGENT_ID, platform: IS_HEADLESS ? 'cloud_ubuntu_worker' : 'desktop' })
    });
    const initData = await initRes.json();
    if (!initData.success) throw new Error(initData.message || 'Handshake init failed');

    const compRes = await fetch(`${CPANEL_URL}?route=bridge/handshake/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}` },
      body: JSON.stringify({ agentId: AGENT_ID, handshakeToken: initData.handshakeToken })
    });
    const compData = await compRes.json();
    if (!compData.success) throw new Error(compData.message || 'Handshake complete failed');

    agentToken = initData.handshakeToken;
    console.log(`✅ [Handshake] Connected successfully to cPanel Orchestrator.`);
    return true;
  } catch (err) {
    console.error(`⚠️ [Handshake Notice]: ${err.message} (Will continue with direct API access)`);
    return true; // Allow direct job processing even if handshake bridge is optional
  }
}

async function pollPendingJobs() {
  try {
    const res = await fetch(`${CPANEL_URL}?route=jobs`, { headers: { 'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}` } });
    if (!res.ok) return [];
    const jobs = await res.json();
    if (!Array.isArray(jobs)) return [];
    if (TARGET_JOB_ID) {
      return jobs.filter(j => j.id === TARGET_JOB_ID);
    }
    return jobs.filter(j => {
      const isPendingStatus = j.status === 'pending' || j.status === 'queued' || j.status === 'waiting_otp';
      const isMatchingPlatform = !j.platform || j.platform === PLATFORM_TARGET || PLATFORM_TARGET === 'all';
      return isPendingStatus && isMatchingPlatform;
    });
  } catch (err) {
    console.error(`⚠️ [Poll Error]: ${err.message}`);
    return [];
  }
}

async function claimJob(jobId) {
  try {
    const res = await fetch(`${CPANEL_URL}?route=jobs/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}` },
      body: JSON.stringify({ jobId, agentId: AGENT_ID })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data : null;
  } catch (err) {
    console.error(`❌ [Claim Error]: ${err.message}`);
    return null;
  }
}

async function updateJobState(jobId, payload) {
  try {
    const res = await fetch(`${CPANEL_URL}?route=jobs/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}` },
      body: JSON.stringify({ jobId, ...payload })
    });
    return await res.json();
  } catch (err) {
    console.error(`⚠️ [Job State Update Error]: ${err.message}`);
    return null;
  }
}

async function executeJob(job, claimData) {
  console.log(`🚀 [Job Execution] Claimed Job: ${job.id} | Platform: ${job.platformName || job.platformId}`);

  let browser = null;
  const startTime = Date.now();
  try {
    // 1. Fetch pre-existing session from cPanel if available
    let savedStorageState = null;
    const platformKey = job.platformId || 'plat_divar';
    try {
      const sessionRes = await fetch(`${CPANEL_URL}?route=sessions/storage-state&platformId=${platformKey}`, { headers: { 'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}` } });
      const sessionData = await sessionRes.json();
      if (sessionData.success && sessionData.storageState) {
        savedStorageState = sessionData.storageState;
        console.log(`🔑 [Session] Valid storageState restored from cPanel for ${platformKey}`);
      }
    } catch (e) {
      console.warn(`⚠️ [Session Retrieval]: ${e.message}`);
    }

    const proxyUrl = process.env.IRAN_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || null;
    const launchOptions = {
      headless: IS_HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
    if (proxyUrl) {
      console.log(`🌐 [Proxy] Using network proxy for browser context.`);
      launchOptions.proxy = { server: proxyUrl };
    }

    browser = await chromium.launch(launchOptions);

    const contextOptions = {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'fa-IR'
    };
    if (savedStorageState) {
      contextOptions.storageState = savedStorageState;
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    let targetUrl = job.targetUrl;
    if (!targetUrl) {
      if (job.platformId === 'plat_divar' || (job.platformDomain && job.platformDomain.includes('divar'))) {
        targetUrl = 'https://divar.ir/new';
      } else if (job.platformId === 'plat_sheypoor' || (job.platformDomain && job.platformDomain.includes('sheypoor'))) {
        targetUrl = 'https://www.sheypoor.com/session';
      } else {
        targetUrl = 'https://divar.ir/new';
      }
    }

    console.log(`🌐 [Browser] Navigating to target: ${targetUrl}`);
    const navResponse = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    const httpStatus = navResponse ? navResponse.status() : 0;
    console.log(`📡 [Navigation] HTTP Status: ${httpStatus}`);

    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`📄 [DOM] Page Title: "${title}"`);

    // Check for phone input with dynamic DOM hydration wait
    const phoneSelector = 'input[type="tel"], input[name="phone"], input[name="mobile"], input[autocomplete="tel-national"]';
    let phoneInput = null;
    try {
      console.log('⏳ [DOM Interaction] Waiting for phone input field to hydrate on Divar...');
      phoneInput = await page.waitForSelector(phoneSelector, { state: 'visible', timeout: 12000 });
    } catch (e) {
      console.log('ℹ️ Phone input not found within timeout. Checking for alternative form elements...');
    }

    if (phoneInput) {
      console.log('📝 [Form Interaction] Detected phone input field. Entering contact number...');
      const contactPhone = job.contactPhone || '09153108763';
      await phoneInput.click();
      await phoneInput.fill(contactPhone);
      console.log(`✅ [Form Interaction] Filled phone: ${contactPhone}`);

      // Save screenshot
      const screen1 = path.join(EVIDENCE_DIR, `job_${job.id}_step1.png`);
      await page.screenshot({ path: screen1 });

      // Click next button
      const buttons = await page.$$('button');
      let submitBtn = null;
      for (const btn of buttons) {
        const txt = (await btn.innerText()).trim();
        if (txt.includes('بعدی') || txt.includes('تایید') || txt.includes('ورود') || txt.includes('ارسال')) {
          submitBtn = btn;
          break;
        }
      }

      if (submitBtn) {
        console.log('👉 [Form Interaction] Submitting step 1 to inspect challenge...');
        await submitBtn.click();
        await page.waitForTimeout(4000);

        const content = await page.content();
        const hasArcaptcha = content.includes('arcaptcha') || (await page.$('.arcaptcha-frame, iframe[src*="arcaptcha"]')) !== null;
        const hasOtpPrompt = content.includes('کد تایید') || (await page.$('input[autocomplete="one-time-code"], input[type="number"]')) !== null;

        const screen2 = path.join(EVIDENCE_DIR, `job_${job.id}_step2_challenge.png`);
        await page.screenshot({ path: screen2 });

        if (hasArcaptcha || hasOtpPrompt) {
          const challengeType = hasArcaptcha ? 'CAPTCHA_CHALLENGE' : 'OTP_REQUIRED';
          console.log(`⚠️ [Challenge Detected]: ${challengeType}. Activating on-demand Quick Tunnel...`);
          
          // Spawn quick tunnel for live human interaction
          const tunnelUrl = await startQuickTunnel();

          await updateJobState(job.id, {
            status: 'paused_user_action',
            currentStep: hasArcaptcha
              ? 'چالش امنیتی آرکپچا شناسایی شد. دسترسی زنده به مرورگر ابری فعال گردید.'
              : 'کد تایید پیامکی ارسال شد. دسترسی زنده به مرورگر ابری فعال گردید.',
            challengeType,
            evidenceScreenshot: screen2,
            interactiveUrl: tunnelUrl,
            humanActionRequired: true
          });

          // Wait for real human interaction or resolution (max 180s timeout)
          console.log('⏳ [Waiting for Real Human Action] User can interact via noVNC or submit OTP in cPanel...');
          const maxWaitMs = 180000;
          const waitStart = Date.now();
          let humanResolved = false;

          while (Date.now() - waitStart < maxWaitMs) {
            await new Promise(r => setTimeout(r, 5000));

            // Check if page advanced in browser (human solved via noVNC)
            const currentContent = await page.content();
            const stillHasArcaptcha = currentContent.includes('arcaptcha') || (await page.$('.arcaptcha-frame, iframe[src*="arcaptcha"]')) !== null;
            const stillHasOtp = currentContent.includes('کد تایید') || (await page.$('input[autocomplete="one-time-code"]')) !== null;

            // Check if cPanel job was resumed via resolve-challenge API
            const checkRes = await fetch(`${CPANEL_URL}?route=jobs/${job.id}`, { headers: { 'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}` } });
            const checkJob = await checkRes.json();

            if (!stillHasArcaptcha && !stillHasOtp) {
              console.log('✅ [Browser Advanced] Human solved challenge directly in live browser!');
              humanResolved = true;
              break;
            } else if (checkJob && checkJob.status === 'resumed' && checkJob.humanActionVerified) {
              console.log('✅ [cPanel Verified] Human resolution verified via cPanel channel!');
              if (checkJob.otpCode && stillHasOtp) {
                const otpField = await page.$('input[autocomplete="one-time-code"], input[type="number"], input[type="tel"]');
                if (otpField) {
                  await otpField.fill(checkJob.otpCode);
                  await page.keyboard.press('Enter');
                  await page.waitForTimeout(3000);
                }
              }
              humanResolved = true;
              break;
            }
          }

          // Shut down tunnel immediately to preserve security
          stopQuickTunnel();

          if (humanResolved) {
            console.log('💾 [Session Capture] Capturing authenticated storageState...');
            const finalStorageState = await context.storageState();
            await fetch(`${CPANEL_URL}?route=sessions/storage-state`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}` },
              body: JSON.stringify({
                platformId: platformKey,
                storageState: finalStorageState
              })
            });
            console.log('✅ [Session Persistence] StorageState securely saved to cPanel.');

            await updateJobState(job.id, {
              status: 'in_progress',
              currentStep: 'احراز هویت انسانی با موفقیت تایید و نشست کاری ذخیره شد. در حال ارسال آگهی...'
            });
          } else {
            console.log('⏱️ [Timeout] Human action was not performed within 180s.');
            await updateJobState(job.id, {
              status: 'paused_user_action',
              currentStep: 'زمان انتظار برای حل چالش انسانی به پایان رسید. نوبت کاری متوقف باقی می‌ماند.'
            });
            return false;
          }
        } else {
          console.log('ℹ️ [Progress]: Direct progression without challenge.');
          await updateJobState(job.id, {
            status: 'in_progress',
            currentStep: 'مرحله اول ورود انجام شد. در حال تکمیل فرم آگهی...',
            evidenceScreenshot: screen2
          });
        }
      }
    } else {
      console.log('ℹ️ No phone input on initial page, taking inspection screenshot.');
      const screenDefault = path.join(EVIDENCE_DIR, `job_${job.id}_loaded.png`);
      await page.screenshot({ path: screenDefault });
      await updateJobState(job.id, {
        status: 'in_progress',
        currentStep: `صفحه ${targetUrl} بارگذاری گردید.`,
        evidenceScreenshot: screenDefault
      });
    }

    console.log(`✅ [Job Handled] Execution completed in ${Date.now() - startTime}ms.`);
    return true;
  } catch (err) {
    console.error(`❌ [Execution Error]: ${err.message}`);
    await updateJobState(job.id, {
      status: 'failed',
      currentStep: `خطای پردازش مرورگر: ${err.message}`,
      error: err.message
    });
    return false;
  } finally {
    stopQuickTunnel();
    if (browser) {
      console.log('🛑 [Browser] Terminating Chromium instance (Scale-to-Zero).');
      await browser.close();
    }
  }
}

async function main() {
  await handshake();

  if (IS_ONCE) {
    console.log(`🔍 [Single Execution Mode] Checking for pending jobs...`);
    const pending = await pollPendingJobs();
    if (pending.length > 0) {
      const targetJob = pending[0];
      const claim = await claimJob(targetJob.id);
      if (claim) {
        const success = await executeJob(targetJob, claim);
        if (!success) {
          console.error(`❌ [Execution Finished] Job ${targetJob.id} could not complete successfully.`);
          process.exit(1);
        }
      } else {
        console.error(`⚠️ Could not claim job ${targetJob.id}.`);
        process.exit(1);
      }
    } else {
      console.log(`✅ No pending jobs found in queue. Worker gracefully terminating.`);
    }
    process.exit(0);
  } else {
    console.log(`🔄 [Continuous Loop Started] Interval: ${POLL_INTERVAL_MS}ms`);
    setInterval(async () => {
      const pending = await pollPendingJobs();
      if (pending.length > 0) {
        const targetJob = pending[0];
        const claim = await claimJob(targetJob.id);
        if (claim) {
          await executeJob(targetJob, claim);
        }
      }
    }, POLL_INTERVAL_MS);
  }
}

main();

