/**
 * Ashk24 Autonomous Agent / Cloud Worker v4.0.11-e2e
 * Executes real browser missions using Playwright Chromium connected to cPanel Orchestrator.
 * Supports both Cloud Headless (GitHub Actions / Linux VPS) and Local Headed mode.
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import SessionManager, { saveSession, restoreSession, deleteSession, validateSession } from './session_manager.js';
import { verifyPublicationEvidence, evaluatePageContentEvidence, validatePublicAdUrlFormat } from '../src/services/unifiedVerificationService.js';

// Ignore self-signed / untrusted SSL certificate errors common in cPanel environments
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration with sensible default for cPanel backend orchestrator
const CPANEL_URL = process.env.CPANEL_URL || 'https://secret.ashkghalam.ir/cpanel-backend/api/index.php';
const CPANEL_AGENT_TOKEN = process.env.CPANEL_AGENT_TOKEN || 'secret_9153108763';
const AGENT_ID = process.env.AGENT_ID || (process.env.CI ? `gh_actions_${Date.now()}` : `agent_desktop_${Date.now()}`);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);
const IS_ONCE = process.argv.includes('--once');
const IS_HEADLESS = process.env.HEADLESS === 'true' || process.argv.includes('--headless');
const TARGET_JOB_ID = process.env.TARGET_JOB_ID || null;
const PLATFORM_TARGET = process.env.PLATFORM_TARGET || process.env.TARGET_PLATFORM || 'agahi24';
const WORKFLOW_ID = process.env.WORKFLOW_ID || null;
const EXECUTION_ID = process.env.EXECUTION_ID || null;
const ACTION_ID = process.env.ACTION_ID || null;
const TASK_ACTION = process.env.TASK_ACTION || null;
const TASK_STATE = process.env.TASK_STATE || null;
let TASK_INPUT = null;
try {
  TASK_INPUT = process.env.TASK_INPUT ? (typeof process.env.TASK_INPUT === 'string' && process.env.TASK_INPUT.startsWith('{') ? JSON.parse(process.env.TASK_INPUT) : process.env.TASK_INPUT) : null;
} catch (_) {
  TASK_INPUT = null;
}
const LOCAL_AGENT_PORT = parseInt(process.env.LOCAL_AGENT_PORT || '3824', 10);

let AGENT_VERSION = '5.9.40';
try {
  const rootPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
  AGENT_VERSION = rootPkg.version || AGENT_VERSION;
} catch (_) {}

const EVIDENCE_DIR = path.resolve(__dirname, 'evidence');
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
console.log(`🤖 Ashk24 Worker Engine v${AGENT_VERSION} Starting...`);
console.log(`🆔 Agent ID: ${AGENT_ID}`);
console.log(`🌐 Orchestrator: ${CPANEL_URL}`);
console.log(`🎯 Target Job ID: ${TARGET_JOB_ID || 'None (Auto-Claim Any Pending)'}`);
console.log(`🏷️ Platform Target: ${PLATFORM_TARGET}`);
console.log(`🖥️ Mode: ${IS_HEADLESS ? 'Headless (Cloud Scale-to-Zero)' : 'Headed (Desktop GUI)'}`);
console.log(`🔄 Execution Type: ${IS_ONCE ? 'Single Job Execution (--once)' : 'Continuous Polling'}`);
console.log(`=======================================================`);

let agentToken = null;

async function handshake(options = {}) {
  try {
    const initRes = await fetch(`${CPANEL_URL}?route=bridge/handshake/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}` },
      body: JSON.stringify({ agentId: AGENT_ID, platform: IS_HEADLESS ? 'cloud_ubuntu_worker' : 'desktop' })
    });
    if (!initRes.ok) throw new Error(`Handshake init failed with status: ${initRes.status}`);
    const initData = await initRes.json();
    if (!initData.success) throw new Error(initData.message || 'Handshake init failed');

    const compRes = await fetch(`${CPANEL_URL}?route=bridge/handshake/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}` },
      body: JSON.stringify({ agentId: AGENT_ID, handshakeToken: initData.handshakeToken })
    });
    if (!compRes.ok) throw new Error(`Handshake complete failed with status: ${compRes.status}`);
    const compData = await compRes.json();
    if (!compData.success) throw new Error(compData.message || 'Handshake complete failed');

    agentToken = initData.handshakeToken;
    console.log(`✅ [Handshake] Connected successfully to cPanel Orchestrator.`);
    return true;
  } catch (err) {
    console.error(`❌ [Handshake Error]: ${err.message}`, err.cause ? `| Cause: ${JSON.stringify(err.cause)}` : '');
    
    // در حالت اجرای مستقیم تسک (TASK_ACTION)، عدم دسترسی به cPanel نباید مانع اجرای خود تسک شود
    if (options.isDirectTask || TASK_ACTION) {
      console.warn(`⚠️ [Handshake Notice] ارتباط با cPanel برقرار نشد (${err.message}). اجرای مستقیم تسک ادامه می‌یابد...`);
      return false;
    }

    if (CPANEL_URL.includes('secret.ashkghalam.ir') || err.code === 'ENOTFOUND' || (err.cause && err.cause.code === 'ENOTFOUND')) {
      console.error(`\n=======================================================`);
      console.error(`⚠️ [خطای عدم یافتن آدرس سرور سی‌پنل / DNS Error]`);
      console.error(`آدرس «${CPANEL_URL}» در اینترنت وجود ندارد!`);
      console.error(`توضیح: آدرس secret.ashkghalam.ir یک آدرس دمو و فرضی است.`);
      console.error(`لطفاً آدرس واقعی هاست خود را که فایل‌های cpanel-backend را روی آن آپلود کرده‌اید وارد نمایید.`);
      console.error(`مثال: https://your-domain.com/cpanel-backend/api/index.php`);
      console.error(`=======================================================\n`);
    }

    if (process.env.CI) {
      console.warn(`\n=======================================================`);
      console.warn(`ℹ️ [اطلاعیه استقرار ابری - Cloud Worker Graceful Exit]`);
      console.warn(`سرور cPanel در آدرس «${CPANEL_URL}» هنوز در دسترس یا فعال نیست.`);
      console.warn(`جهت جلوگیری از ارسال ایمیل‌های اخطار مکرر گیت‌هاب، پروسه با وضعیت موفق (0) خاتمه می‌یابد.`);
      console.warn(`به محض استقرار کامل فایل zip روی هاست، ورکر به صورت خودکار متصل خواهد شد.`);
      console.warn(`=======================================================\n`);
      process.exit(0);
    }
    process.exit(1);
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
      const isPendingStatus = j.status === 'pending' || j.status === 'queued' || j.status === 'waiting_otp' || j.status === 'resumed';
      const isMatchingPlatform = !j.platform || j.platform === PLATFORM_TARGET || PLATFORM_TARGET === 'all';
      return isPendingStatus && isMatchingPlatform;
    });
  } catch (err) {
    console.error(`⚠️ [Poll Error]: ${err.message}`);
    return [];
  }
}

async function sendWorkerHeartbeat() {
  try {
    await fetch(`${CPANEL_URL}?route=orchestrator/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}` },
      body: JSON.stringify({
        agentId: AGENT_ID,
        channelType: 'worker',
        platform: IS_HEADLESS ? 'headless_worker' : 'desktop_headed',
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) {}
}

async function claimBalancedJob() {
  try {
    await sendWorkerHeartbeat();
    const res = await fetch(`${CPANEL_URL}?route=orchestrator/claim-balanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}` },
      body: JSON.stringify({
        channel: 'worker',
        agentId: AGENT_ID
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success && data.job ? data : null;
  } catch (err) {
    console.error(`❌ [Claim Balanced Error]: ${err.message}`);
    return null;
  }
}

async function claimJob(jobId) {
  try {
    await sendWorkerHeartbeat();
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
    const wfId = payload.workflowId || WORKFLOW_ID;
    const execId = payload.executionId || EXECUTION_ID;

    const res = await fetch(`${CPANEL_URL}?route=jobs/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}` },
      body: JSON.stringify({ jobId, workflowId: wfId, executionId: execId, ...payload })
    });
    if (!res.ok) throw new Error(`Job update failed with status: ${res.status}`);
    const resData = await res.json();

    // یکپارچه‌سازی بی‌درنگ با Workflow Trace (عدم تولید تاریخچه‌های جداگانه)
    if (wfId && execId) {
      await reportWorkflowActionToBackend({
        workflowId: wfId,
        executionId: execId,
        jobId,
        state: payload.status === 'published' ? 'PUBLISHED' : (payload.status === 'blocked' ? 'BLOCKED' : (payload.status === 'unknown' ? 'UNKNOWN' : 'FILLING_FIELDS')),
        action: payload.action || 'agent_job_step',
        status: payload.status === 'failed' || payload.status === 'blocked' ? 'failed' : (payload.status === 'published' ? 'completed' : 'running'),
        input: { jobId, currentStep: payload.currentStep },
        output: { ...payload, syncedFromJobQueue: true },
        publicUrl: payload.adUrl || null,
        durationMs: payload.durationMs || 0
      });
    }

    return resData;
  } catch (err) {
    console.error(`❌ [Job State Update Error]: ${err.message}`);
    throw err; // Ensure failure is propagated
  }
}

async function reportWorkflowActionToBackend(payload) {
  const wfId = payload.workflowId || WORKFLOW_ID;
  const execId = payload.executionId || EXECUTION_ID;
  if (!wfId || !execId) return;

  try {
    const res = await fetch(`${CPANEL_URL}?route=workflows/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}`
      },
      body: JSON.stringify({
        workflowId: wfId,
        executionId: execId,
        jobId: payload.jobId || TARGET_JOB_ID,
        workerId: AGENT_ID,
        worker: process.env.CI ? 'github' : 'local',
        state: payload.state || 'PUBLICATION_PENDING',
        action: payload.action || 'worker_execution',
        status: payload.status || 'completed',
        input: payload.input || {},
        output: payload.output || {},
        publicUrl: payload.publicUrl || null,
        durationMs: payload.durationMs || 0
      })
    });
    if (res.ok) {
      console.log(`📡 [Backend Sync] Workflow action '${payload.action}' recorded for workflow ${wfId}`);
    }
  } catch (err) {
    console.warn(`⚠️ [Backend Sync Warning]: ${err.message}`);
  }
}

let cachedChromium = null;
async function getChromium() {
  if (cachedChromium) return cachedChromium;
  try {
    const pw = await import('playwright');
    cachedChromium = pw.chromium;
    return cachedChromium;
  } catch (err) {
    throw new Error(`پکیج Playwright در دسترس نیست (${err.message}). لطفاً در پوشه local-agent پکیج‌ها را نصب فرمایید.`);
  }
}

let activeLocalBrowser = null;
let activeLocalPage = null;

async function getOrInitLocalPage() {
  if (!activeLocalBrowser) {
    const chromium = await getChromium();
    activeLocalBrowser = await chromium.launch({
      headless: IS_HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  }
  if (!activeLocalPage || activeLocalPage.isClosed()) {
    const context = await activeLocalBrowser.newContext();
    activeLocalPage = await context.newPage();
  }
  return activeLocalPage;
}

const SUPPORTED_WORKER_ACTIONS = [
  'open_target_url',
  'check_login_state',
  'inspect_auth_form',
  'authenticate_user',
  'discover_dom_fields',
  'inject_field_values',
  'click_submit_button',
  'inject_and_verify_otp',
  'check_otp_acceptance',
  'verify_publication_url'
];

/**
 * تابع مشترک و مستقل اجرای وظایف Worker (قابل استفاده توسط Local Server و GitHub Direct Run)
 * @param {object} task - شیء حاوی اطلاعات کامل وظیفه (action, actionId, input, workflowId, executionId, jobId)
 * @param {object|null} providedPage - شیء اختیاری صفحه مرورگر Playwright
 * @returns {Promise<object>} نتیجه استاندارد اجرای تسک
 */
async function executeWorkerTask(task, providedPage = null) {
  const startTime = Date.now();
  const action = task?.action || null;
  const workflowId = task?.workflowId || null;
  const executionId = task?.executionId || null;
  const jobId = task?.jobId || null;
  const actionId = task?.actionId || null;
  const state = task?.state || 'AUTO';
  const input = task?.input !== undefined ? task.input : {};

  console.log(`🤖 [Worker Task Execution] Action: ${action || 'None'} | ActionID: ${actionId || 'auto'} | Workflow: ${workflowId || 'none'} | State: ${state}`);

  if (!action || !SUPPORTED_WORKER_ACTIONS.includes(action)) {
    const durationMs = Date.now() - startTime;
    const errorMsg = `UNSUPPORTED_ACTION: فرمان '${action || 'null'}' در این Worker پشتیبانی نمی‌شود.`;
    console.warn(`⚠️ [Unsupported Worker Action]: ${errorMsg}`);
    return {
      success: false,
      action: action || 'UNKNOWN',
      state,
      workerId: AGENT_ID,
      workerRole: process.env.CI ? 'cloud_worker' : 'local',
      workflowId,
      executionId,
      jobId,
      actionId,
      input,
      output: {
        error: errorMsg,
        status: 'UNSUPPORTED_ACTION',
        supportedActions: SUPPORTED_WORKER_ACTIONS
      },
      error: errorMsg,
      durationMs
    };
  }

  let taskOutput = {};
  let taskSuccess = true;
  let taskError = null;

  try {
    let page = providedPage;
    if (!page && action !== 'verify_publication_url') {
      page = await getOrInitLocalPage();
      if (!page) {
        throw new Error('مرورگر Playwright در دسترس نیست.');
      }
    }

    if (action === 'open_target_url') {
      const targetUrl = input?.targetUrl || (task.platformDomain ? `https://${task.platformDomain}` : 'https://agahi24.com');
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      taskSuccess = true;
      taskOutput = {
        openedUrl: page.url(),
        title: await page.title(),
        tabDispatched: true
      };
    } else if (action === 'check_login_state') {
      const content = await page.content();
      const currentUrl = page.url();

      const hasLogoutBtn = await page.$('a[href*="logout"], button[id*="logout"], a:has-text("خروج"), button:has-text("خروج")');
      const hasUserProfile = await page.$('.user-profile, .user-menu, .dashboard, [aria-label*="پروفایل"], a[href*="profile"], a[href*="panel"]');
      const isLoggedIn = Boolean(hasLogoutBtn || hasUserProfile || content.includes('خروج از حساب') || content.includes('پنل کاربری') || content.includes('ناحیه کاربری'));

      const isRegistrationPage = currentUrl.includes('register') || currentUrl.includes('signup') || content.includes('ثبت‌نام') || content.includes('ایجاد حساب');
      const hasLoginForm = Boolean(await page.$('form[action*="login"], form[id*="login"], input[name*="user"], input[name*="pass"], input[name*="mobile"]'));

      const hasAdFields = Boolean(await page.$('input[name*="title" i], textarea[name*="desc" i], input[name*="price" i], select[name*="cat" i]'));
      const detectedFormType = hasAdFields ? 'ad' : (hasLoginForm || isRegistrationPage ? 'auth' : 'unknown');

      taskSuccess = true;
      taskOutput = {
        sessionActive: isLoggedIn,
        isLoggedIn,
        loginRequired: !isLoggedIn,
        registrationRequired: !isLoggedIn && isRegistrationPage,
        detectedFormType,
        currentUrl
      };
    } else if (action === 'inspect_auth_form' || action === 'authenticate_user') {
      const content = await page.content();
      const currentUrl = page.url();

      const hasCaptcha = Boolean(await page.$('.g-recaptcha, iframe[src*="captcha"], #captcha, input[name*="captcha" i]'));
      if (hasCaptcha) {
        taskSuccess = false;
        taskError = 'چالش کپچا یا اعتبارسنجی امنیتی نیازمند اقدام دستی کاربر است.';
        taskOutput = {
          needsHumanIntervention: true,
          pageState: 'WAITING_FOR_HUMAN',
          reason: 'captcha_detected',
          currentUrl
        };
      } else {
        const phoneInput = await page.$('input[name*="mobile" i], input[name*="phone" i], input[type="tel"], input[id*="mobile" i]');
        const phoneVal = input?.phoneNumber || input?.phone || '';
        if (phoneInput && phoneVal) {
          await phoneInput.fill(String(phoneVal));
          const loginSubmit = await page.$('button[type="submit"], button:has-text("ورود"), button:has-text("ادامه"), button:has-text("ارسال کد")');
          if (loginSubmit) {
            await loginSubmit.click({ force: true });
            await page.waitForTimeout(2500);
          }
        }

        const postPageText = await page.content();
        const postUrl = page.url();
        const otpInput = await page.$('input[name*="otp" i], input[name*="code" i], input[id*="code" i]');
        const isOtpRequired = Boolean(otpInput || postPageText.includes('کد تایید') || postPageText.includes('رمز یکبار مصرف'));
        const isNowLoggedIn = postPageText.includes('خروج') || postPageText.includes('پنل کاربری') || postUrl.includes('panel') || postUrl.includes('dashboard');

        if (isNowLoggedIn) {
          taskSuccess = true;
          taskOutput = {
            loginVerified: true,
            sessionActive: true,
            isLoggedIn: true,
            pageState: 'LOGGED_IN',
            currentUrl: postUrl
          };
        } else if (isOtpRequired) {
          taskSuccess = true;
          taskOutput = {
            otpRequired: true,
            otpGateDetected: true,
            pageState: 'OTP_REQUIRED',
            currentUrl: postUrl
          };
        } else {
          taskSuccess = false;
          taskError = 'ورود به سامانه تکمیل نشد یا نیازمند اقدام انسانی است.';
          taskOutput = {
            loginVerified: false,
            needsHumanIntervention: true,
            pageState: 'WAITING_FOR_HUMAN',
            currentUrl: postUrl
          };
        }
      }
    } else if (action === 'discover_dom_fields') {
      const inputs = await page.$$eval('input, textarea, select', els => els.map(el => {
        let labelText = '';
        if (el.labels && el.labels.length > 0) {
          labelText = el.labels[0].innerText || '';
        } else if (el.id) {
          const lbl = document.querySelector(`label[for="${el.id}"]`);
          if (lbl) labelText = lbl.innerText || '';
        }
        if (!labelText) {
          const parentLabel = el.closest('label');
          if (parentLabel) labelText = parentLabel.innerText || '';
        }

        return {
          name: el.getAttribute('name') || '',
          id: el.getAttribute('id') || '',
          type: el.getAttribute('type') || el.tagName.toLowerCase(),
          placeholder: el.getAttribute('placeholder') || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          labelText: labelText.trim(),
          required: el.hasAttribute('required'),
          tagName: el.tagName.toLowerCase()
        };
      }));

      const hasOtp = inputs.some(i =>
        i.name.includes('otp') || i.name.includes('code') || i.id.includes('code') || i.labelText.includes('کد تایید')
      );

      taskSuccess = true;
      taskOutput = {
        fields: inputs,
        fieldsFound: inputs.length,
        hasOtpGate: hasOtp,
        formType: inputs.some(i => i.name.includes('title') || i.labelText.includes('عنوان')) ? 'ad_creation' : 'auth'
      };
    } else if (action === 'inject_field_values') {
      const mappings = input?.mappings || {};
      const requiredKeys = ['title', 'description', 'phone'];

      const allInputs = await page.$$('input, textarea, select');
      const fieldsFound = allInputs.length;

      let filledCount = 0;
      const missingRequired = [];
      const validationErrors = [];

      for (const [key, val] of Object.entries(mappings)) {
        if (!val || String(val).trim() === '') {
          if (requiredKeys.includes(key)) {
            missingRequired.push(key);
          }
          continue;
        }

        const selectorList = [
          `input[name*="${key}" i]`,
          `textarea[name*="${key}" i]`,
          `input[id*="${key}" i]`,
          `textarea[id*="${key}" i]`,
          `input[placeholder*="${key}" i]`,
          `textarea[placeholder*="${key}" i]`,
          `[aria-label*="${key}" i]`
        ];

        if (key === 'title') {
          selectorList.push('input[name*="عنوان" i]', 'input[id*="عنوان" i]', 'input[placeholder*="عنوان" i]');
        } else if (key === 'description') {
          selectorList.push('textarea[name*="توضیح" i]', 'textarea[id*="توضیح" i]', 'textarea[placeholder*="توضیح" i]');
        } else if (key === 'phone') {
          selectorList.push('input[name*="موبایل" i]', 'input[name*="تلفن" i]', 'input[type="tel"]');
        }

        let field = null;
        for (const sel of selectorList) {
          field = await page.$(sel);
          if (field) break;
        }

        if (field) {
          try {
            await field.fill(String(val));
            filledCount++;
          } catch (fillErr) {
            validationErrors.push(`خطا در درج فیلد ${key}: ${fillErr.message}`);
          }
        } else if (requiredKeys.includes(key)) {
          missingRequired.push(key);
        }
      }

      const canSubmit = filledCount > 0 && missingRequired.length === 0 && validationErrors.length === 0;
      taskSuccess = canSubmit;
      if (!taskSuccess) {
        taskError = missingRequired.length > 0
          ? `فیلدهای اجباری آگهی در فرم پر نشدند: [${missingRequired.join('، ')}]`
          : (filledCount === 0 ? 'هیچ فیلدی در فرم تطبیق نیافت یا پر نشد.' : `خطای اعتبارسنجی: [${validationErrors.join('، ')}]`);
      }

      taskOutput = {
        fieldsFound,
        mappedFields: Object.keys(mappings).length,
        filledFields: filledCount,
        missingRequiredFields: missingRequired,
        validationErrors,
        canSubmit
      };
    } else if (action === 'click_submit_button') {
      const submitBtn = await page.$('button[type="submit"], input[type="submit"], button:has-text("ثبت"), button:has-text("ارسال"), button:has-text("انتشار")');
      if (!submitBtn) {
        taskSuccess = false;
        taskError = 'دکمه ارسال فرم در ساختار صفحه یافت نشد.';
        taskOutput = {
          clicked: false,
          submitted: false,
          pageState: 'FORM_ERROR',
          formError: 'دکمه ارسال فرم در ساختار صفحه موجود نیست.'
        };
      } else {
        try {
          await submitBtn.click({ force: true });
          await page.waitForTimeout(3000);

          const postUrl = page.url();
          const pageText = await page.content();

          const hasFormError = pageText.includes('خطا در ثبت') ||
                               pageText.includes('الزامی است') ||
                               pageText.includes('نامعتبر است') ||
                               Boolean(await page.$('.error, .alert-danger, [aria-invalid="true"]'));

          const otpGateDetected = pageText.includes('کد تایید') ||
                                  pageText.includes('کد پیامک') ||
                                  postUrl.includes('verify') ||
                                  postUrl.includes('otp') ||
                                  Boolean(await page.$('input[name*="otp" i], input[name*="code" i], input[id*="otp" i]'));

          const isSubmitted = pageText.includes('با موفقیت ثبت شد') ||
                              pageText.includes('در صف انتشار') ||
                              pageText.includes('در انتظار تایید') ||
                              postUrl.includes('success') ||
                              postUrl.includes('manage');

          let detectedState = 'UNKNOWN';
          if (hasFormError) {
            detectedState = 'FORM_ERROR';
            taskSuccess = false;
            taskError = 'خطای اعتبارسنجی در صفحه پس از ارسال فرم مشاهده شد.';
          } else if (otpGateDetected) {
            detectedState = 'OTP_REQUIRED';
            taskSuccess = true;
          } else if (isSubmitted) {
            detectedState = 'SUBMITTED';
            taskSuccess = true;
          } else {
            detectedState = 'UNKNOWN';
            taskSuccess = false;
            taskError = 'پس از کلیک دکمه ارسال، وضعیت صفحه نامشخص است (پاسخ قطعی دریافت نشد).';
          }

          taskOutput = {
            clicked: true,
            submitted: detectedState === 'SUBMITTED' || detectedState === 'OTP_REQUIRED',
            pageState: detectedState,
            otpGateDetected: detectedState === 'OTP_REQUIRED',
            hasFormError: detectedState === 'FORM_ERROR',
            currentUrl: postUrl
          };
        } catch (clickErr) {
          taskSuccess = false;
          taskError = `خطا در کلیک دکمه ارسال: ${clickErr.message}`;
          taskOutput = {
            clicked: false,
            submitted: false,
            pageState: 'FORM_ERROR',
            formError: clickErr.message
          };
        }
      }
    } else if (action === 'inject_and_verify_otp') {
      const otpCode = input?.otpCode;
      if (!otpCode) {
        taskSuccess = false;
        taskError = 'کد تایید OTP برای درج در صفحه فراهم نشده است.';
        taskOutput = { otpInjected: false, verifiedByPlatform: false };
      } else {
        const otpInput = await page.$('input[name*="otp" i], input[name*="code" i], input[id*="otp" i], input[id*="code" i], input[type="tel"], input[type="number"], input.otp-input');
        if (!otpInput) {
          taskSuccess = false;
          taskError = 'فیلد ورود کد تایید OTP در صفحه مرورگر یافت نشد.';
          taskOutput = { otpInjected: false, verifiedByPlatform: false };
        } else {
          try {
            await otpInput.fill(String(otpCode));
            const confirmBtn = await page.$('button:has-text("تایید"), button:has-text("ثبت"), button:has-text("ارسال"), button[type="submit"]');
            if (confirmBtn) {
              await confirmBtn.click({ force: true });
              await page.waitForTimeout(2000);
            }
            taskSuccess = true;
            taskOutput = {
              otpInjected: true,
              verifiedByPlatform: false,
              otpCodeSubmitted: true
            };
          } catch (injectErr) {
            taskSuccess = false;
            taskError = `خطا در درج یا ارسال کد OTP: ${injectErr.message}`;
            taskOutput = { otpInjected: false, verifiedByPlatform: false };
          }
        }
      }
    } else if (action === 'check_otp_acceptance') {
      const pageText = await page.content();
      const postUrl = page.url();

      const isInvalid = pageText.includes('کد نادرست') || pageText.includes('کد منقضی') || pageText.includes('اشتباه است');
      const isAccepted = pageText.includes('با موفقیت تایید شد') ||
                         pageText.includes('تایید شماره انجام شد') ||
                         pageText.includes('در صف انتشار') ||
                         pageText.includes('آگهی شما ثبت شد');

      if (isInvalid) {
        taskSuccess = false;
        taskError = 'کد تایید واردشده توسط سامانه مقصد رد شد.';
        taskOutput = {
          rejected: true,
          invalidCode: true,
          otpVerified: false
        };
      } else if (isAccepted) {
        taskSuccess = true;
        taskOutput = {
          accepted: true,
          verifiedByPlatform: true,
          otpVerified: true,
          adUrl: (postUrl.includes('manage') || postUrl.includes('post') || postUrl.includes('view')) ? postUrl : null
        };
      } else {
        taskSuccess = false;
        taskError = 'شواهد قطعی مبنی بر پذیرش کد توسط سامانه مقصد یافت نشد (وجود ریدایرکت به‌تنهایی کافی نیست).';
        taskOutput = {
          accepted: false,
          verifiedByPlatform: false,
          otpVerified: false,
          redirectUrl: postUrl
        };
      }
    } else if (action === 'verify_publication_url') {
      const targetUrl = input?.url || page.url();
      const expectedTitle = input?.expectedTitle || '';
      const expectedJobId = input?.expectedJobId || jobId || '';

      const verifyResult = await verifyPublicationEvidence({
        url: targetUrl,
        expectedTitle,
        expectedJobId
      });

      taskSuccess = verifyResult.verified;
      taskError = verifyResult.error;
      taskOutput = {
        verified: verifyResult.verified,
        httpStatus: verifyResult.httpStatus,
        matchedTitle: verifyResult.matchedTitle,
        matchedId: verifyResult.matchedId,
        matchedKeywords: verifyResult.matchedKeywords,
        publicUrl: verifyResult.url
      };
    }
  } catch (execErr) {
    console.error(`❌ [Worker Task Execution Failure]: ${execErr.message}`);
    taskSuccess = false;
    taskError = execErr.message;
    taskOutput = {
      error: execErr.message,
      status: 'FAILED'
    };
  }

  const durationMs = Date.now() - startTime;
  const result = {
    success: taskSuccess,
    action: action || 'UNKNOWN',
    state,
    workerId: AGENT_ID,
    workerRole: process.env.CI ? 'cloud_worker' : 'local',
    workflowId,
    executionId,
    jobId,
    actionId,
    input,
    output: taskOutput,
    error: taskError,
    durationMs
  };

  if (workflowId && executionId) {
    try {
      await reportWorkflowActionToBackend({
        workflowId,
        executionId,
        jobId,
        state,
        action: action || 'UNKNOWN',
        status: taskSuccess ? 'completed' : 'failed',
        input,
        output: taskOutput,
        durationMs
      });
    } catch (repErr) {
      console.warn(`⚠️ [Workflow Action Report Warning]: ${repErr.message}`);
    }
  }

  return result;
}

/**
 * تابع اجرایی مشترک جهت پشتیبانی از فراخوانی مستقیم executeTask در تمام اسکریپت‌ها و ورکرها
 * @param {object} task - شیء وظیفه
 * @param {object|null} page - شیء اختیاری مرورگر
 */
async function executeTask(task, page = null) {
  return executeWorkerTask(task, page);
}

function startLocalTaskServer() {
  if (process.env.CI || IS_ONCE) return;

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        agentId: AGENT_ID,
        role: 'local',
        headless: IS_HEADLESS,
        version: AGENT_VERSION
      }));
      return;
    }

    if (req.method === 'POST' && req.url === '/execute-task') {
      let bodyStr = '';
      req.on('data', chunk => { bodyStr += chunk; });
      req.on('end', async () => {
        try {
          const task = JSON.parse(bodyStr || '{}');
          const result = await executeWorkerTask(task);
          res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            action: 'PARSE_ERROR',
            error: err.message,
            durationMs: 0
          }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`ℹ️ [Local Agent Daemon] Port ${LOCAL_AGENT_PORT} in use, continuing in background.`);
    } else {
      console.warn(`⚠️ [Local Agent Daemon Error]: ${err.message}`);
    }
  });

  server.listen(LOCAL_AGENT_PORT, '127.0.0.1', () => {
    console.log(`🟢 [Local Agent Daemon] HTTP Task Server active on http://127.0.0.1:${LOCAL_AGENT_PORT}`);
  });
}

async function executeJob(job, claimData) {
  console.log(`🚀 [Job Execution] Claimed Job: ${job.id} | Platform: ${job.platformName || job.platformId} | Status: ${job.status}`);

  let browser = null;
  const startTime = Date.now();
  const platformKey = job.platformId || 'plat_agahi24';
  const isResumingJob = job.status === 'resumed' || Boolean(job.humanActionVerified);

  let sessionRestored = false;
  let restoredAt = null;
  let resumeSupported = true;
  let restoredSessionData = null;

  try {
    // 1. Session Resolution:
    // Check if this existing job has a saved session in SessionManager
    const sessionValidation = await validateSession(job.id);
    let activeStorageState = null;

    if (isResumingJob) {
      if (sessionValidation.valid) {
        restoredSessionData = await restoreSession(job.id);
        activeStorageState = restoredSessionData.storageState;
        sessionRestored = true;
        restoredAt = restoredSessionData.restoredAt;
        console.log(`🔑 [Session Resume] Restoring exact saved browser context for existing job ${job.id} (Saved step: ${restoredSessionData.currentStep || 'Unknown'})`);
      } else {
        // Strict Rule: Never initialize a clean context on resume when session is missing
        console.error(`❌ [Session Error] Resumed job ${job.id} requested, but no saved session state was found! (${sessionValidation.reason})`);
        await updateJobState(job.id, {
          status: 'failed',
          error: 'SESSION_MISSING_FOR_RESUME',
          currentStep: 'خطا: نشست ذخیره‌شده مرورگر برای این نوبت کاری یافت نشد. طبق استاندارد اجرای کانتکست خام در وضعیت resume مجاز نیست.',
          resume_supported: true,
          session_restored: false
        });
        return false;
      }
    } else if (sessionValidation.valid) {
      // Prior session found for this job
      restoredSessionData = await restoreSession(job.id);
      activeStorageState = restoredSessionData.storageState;
      sessionRestored = true;
      restoredAt = restoredSessionData.restoredAt;
      console.log(`🔑 [Session Found] Restored prior session state for job ${job.id}`);
    } else {
      // Fresh execution: Check platform-level saved session from cPanel if available
      try {
        const sessionRes = await fetch(`${CPANEL_URL}?route=sessions/storage-state&platformId=${platformKey}`, { headers: { 'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}` } });
        const sessionData = await sessionRes.json();
        if (sessionData.success && sessionData.storageState) {
          activeStorageState = sessionData.storageState;
          console.log(`🔑 [Platform Session] Valid platform storageState retrieved from cPanel for ${platformKey}`);
        }
      } catch (e) {
        console.warn(`⚠️ [Platform Session Retrieval]: ${e.message}`);
      }
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

    const chromium = await getChromium();
    browser = await chromium.launch(launchOptions);

    const contextOptions = {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'fa-IR',
      ignoreHTTPSErrors: true
    };
    if (activeStorageState) {
      contextOptions.storageState = activeStorageState;
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    const PLATFORM_URL_MAP = {
      plat_irantejarat: 'https://iran-tejarat.com/register.html',
      plat_baskool: 'https://www.baskool.com/',
      plat_niazerooz: 'https://www.niazerooz.com/register',
      plat_niazpardaz: 'https://www.niazpardaz.com/register',
      plat_locopoc: 'https://www.locopoc.com/register',
      plat_shahrema: 'https://shahrema.com/register',
      plat_parscenter: 'https://parscenter.com/User/Register',
      plat_payamsara: 'https://payamsara.com/framework/user/register',
      plat_agahi24: 'https://www.agahi24.com/register',
      plat_istgah: 'https://www.istgah.com/register/',
      plat_divar: 'https://divar.ir/download',
      plat_sheypoor: 'https://www.sheypoor.com/auth'
    };

    let targetUrl = (restoredSessionData && restoredSessionData.currentUrl) || job.targetUrl;
    if (!targetUrl) {
      const pid = (job.platformId || '').toLowerCase();
      const pdom = (job.platformDomain || '').toLowerCase();

      if (PLATFORM_URL_MAP[pid]) {
        targetUrl = PLATFORM_URL_MAP[pid];
      } else {
        const domainCandidate = pdom || 'agahi24.com';
        let cleanDomain = domainCandidate.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
        if (cleanDomain.startsWith('plat_')) {
          cleanDomain = cleanDomain.replace('plat_', '');
        }

        if (cleanDomain.includes('agahi24')) {
          targetUrl = 'https://www.agahi24.com/register';
        } else if (cleanDomain.includes('payamsara')) {
          targetUrl = 'https://payamsara.com/framework/user/register';
        } else if (cleanDomain.includes('parscenter')) {
          targetUrl = 'https://parscenter.com/User/Register';
        } else if (cleanDomain.includes('istgah')) {
          targetUrl = 'https://www.istgah.com/register/';
        } else if (cleanDomain.includes('niazerooz')) {
          targetUrl = 'https://www.niazerooz.com/register';
        } else if (cleanDomain.includes('niazpardaz')) {
          targetUrl = 'https://www.niazpardaz.com/register';
        } else if (cleanDomain.includes('locopoc')) {
          targetUrl = 'https://www.locopoc.com/register';
        } else if (cleanDomain.includes('irantejarat') || cleanDomain.includes('iran-tejarat')) {
          targetUrl = 'https://iran-tejarat.com/register.html';
        } else if (cleanDomain.includes('baskool')) {
          targetUrl = 'https://www.baskool.com/';
        } else if (cleanDomain.includes('shahrema') || cleanDomain.includes('shahr.ma')) {
          targetUrl = 'https://shahrema.com/register';
        } else {
          targetUrl = `https://www.${cleanDomain}`;
        }
      }
    }

    console.log(`🌐 [Browser] Navigating to target: ${targetUrl}`);
    let navResponse = null;
    try {
      navResponse = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    } catch (gotoErr) {
      console.warn(`⚠️ [Navigation Retry] Primary navigation failed (${gotoErr.message}). Retrying navigation...`);
      await page.waitForTimeout(2000);
      try {
        navResponse = await page.goto(targetUrl, { waitUntil: 'load', timeout: 35000 });
      } catch (retryErr) {
        console.error(`❌ [Navigation Failed]: ${retryErr.message}`);
        throw retryErr;
      }
    }
    const httpStatus = navResponse ? navResponse.status() : 0;
    console.log(`📡 [Navigation] HTTP Status: ${httpStatus}`);

    await page.waitForTimeout(3000);

    // Dismiss any blackout overlays or modal popups that could intercept pointer events
    try {
      await page.evaluate(() => {
        const overlays = [
          '#fvpp-blackout',
          '.fvpp-blackout',
          '[id*="blackout" i]',
          '[class*="blackout" i]',
          '[id*="overlay" i]',
          '[class*="overlay" i]',
          '.modal-backdrop',
          '.backdrop',
          '.modal',
          '.popup-dialog'
        ];
        overlays.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            try { el.style.display = 'none'; } catch (e) {}
            try { el.remove(); } catch (e) {}
          });
        });
      });
      console.log('🧹 [DOM Cleanup] Intercepting blackout overlays removed successfully.');
    } catch (e) {}

    const title = await page.title();
    console.log(`📄 [DOM] Page Title: "${title}" | Current URL: ${page.url()}`);

    // If this is a resumed job with human resolution already provided
    if (isResumingJob && job.otpCode) {
      console.log(`🔑 [Resume Processing] Applying human provided OTP code: ${job.otpCode}...`);
      const otpInput = await page.$('input[autocomplete="one-time-code"], input[name="digits_otp"], input[type="number"], input[type="tel"]');
      if (otpInput) {
        await otpInput.fill(job.otpCode);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(4000);
      }
    }

    const phoneSelector = 'input[name="digits_phone"], input[name="user_mobile"], input#user_mobile, input[type="tel"], input[name="phone"], input[name="mobile"], input[autocomplete="tel-national"], input[placeholder*="موبایل"], input[placeholder*="همراه"], input[placeholder*="تلفن"], input[id*="mobile" i], input[id*="phone" i]';
    let phoneInput = null;
    try {
      console.log('⏳ [DOM Interaction] Checking for phone input field with platform-aware selectors...');
      phoneInput = await page.waitForSelector(phoneSelector, { state: 'visible', timeout: 8000 });
    } catch (e) {
      console.log('ℹ️ Primary phone input not found directly. Checking for login/register modal triggers...');
      try {
        const triggers = await page.$$('a:has-text("ورود"), button:has-text("ورود"), a:has-text("ثبت نام"), button:has-text("ثبت نام"), .login-btn, .register-btn');
        if (triggers.length > 0) {
          await triggers[0].click({ force: true }).catch(() => {});
          await page.waitForTimeout(2000);
          phoneInput = await page.$(phoneSelector);
        }
      } catch (triggerErr) {
        console.warn('⚠️ Modal trigger search failed:', triggerErr.message);
      }
    }

    if (phoneInput && !isResumingJob) {
      console.log('📝 [Form Interaction] Detected phone input field. Entering contact number...');
      const contactPhone = job.contactPhone || '09153108763';
      try {
        await phoneInput.click({ force: true, timeout: 5000 });
      } catch (err) {
        try { await phoneInput.focus(); } catch (_) {}
      }
      await phoneInput.fill(contactPhone);
      console.log(`✅ [Form Interaction] Filled phone: ${contactPhone}`);

      // If email input is also present on registration forms (e.g. Agahi24, Payamsara)
      const emailInput = await page.$('input[name="digits_email"], input[name="email"], input[type="email"]');
      if (emailInput) {
        const contactEmail = job.contactEmail || 'info@ashkghalam.ir';
        await emailInput.fill(contactEmail);
        console.log(`✅ [Form Interaction] Filled email: ${contactEmail}`);
      }

      // If name input is present (e.g. Payamsara)
      const nameInput = await page.$('input[name="name"]');
      if (nameInput) {
        await nameInput.fill(job.contactPerson || 'مهندس احسان آهنگر');
        console.log(`✅ [Form Interaction] Filled name`);
      }

      // Save screenshot
      const screen1 = path.join(EVIDENCE_DIR, `job_${job.id}_step1.png`);
      await page.screenshot({ path: screen1 });

      // Click submit / send OTP button:
      // Agahi24 uses button.digits-form_submit, button.digits-form_button
      // Payamsara uses button:has-text("ثبت نام")
      const digitsBtn = await page.$('button.digits-form_submit, button.digits-form_button');
      let submitBtn = digitsBtn;

      if (!submitBtn) {
        const buttons = await page.$$('button, input[type="submit"]');
        for (const btn of buttons) {
          const txt = (await btn.innerText ? await btn.innerText() : await btn.getAttribute('value') || '').trim();
          if (txt.includes('بعدی') || txt.includes('تایید') || txt.includes('ورود') || txt.includes('ارسال') || txt.includes('ثبت نام') || txt.includes('ادامه')) {
            submitBtn = btn;
            break;
          }
        }
      }

      if (submitBtn) {
        console.log('👉 [Form Interaction] Submitting step 1 (triggering real OTP dispatch)...');
        await submitBtn.click({ force: true });
        await page.waitForTimeout(4500);
      }
    }

    // Inspect challenge
    const content = await page.content();
    const hasArcaptcha = content.includes('arcaptcha') || (await page.$('.arcaptcha-frame, iframe[src*="arcaptcha"]')) !== null;
    const hasOtpPrompt = content.includes('کد تایید') || (await page.$('input[autocomplete="one-time-code"], input[type="number"]')) !== null;

    const screen2 = path.join(EVIDENCE_DIR, `job_${job.id}_step2_challenge.png`);
    await page.screenshot({ path: screen2 });

    if (hasArcaptcha || hasOtpPrompt) {
      const challengeType = hasArcaptcha ? 'CAPTCHA_CHALLENGE' : 'OTP_REQUIRED';
      const stepDesc = hasArcaptcha
        ? 'چالش امنیتی آرکپچا شناسایی شد. نشست مرورگر ذخیره و دسترسی زنده به مرورگر فعال گردید.'
        : 'کد تایید پیامکی ارسال شد. نشست مرورگر ذخیره و دسترسی زنده به مرورگر فعال گردید.';

      console.log(`⚠️ [Challenge Detected]: ${challengeType}. Saving session state via SessionManager...`);

      // 1. SAVE Playwright storageState, URL, step, timestamp in SessionManager
      const savedSessionRecord = await saveSession(job.id, context, {
        currentUrl: page.url(),
        currentStep: stepDesc,
        challengeType,
        platformId: platformKey,
        contactPhone: job.contactPhone || '09153108763',
        timestamp: new Date().toISOString()
      });

      // Determine if running locally on desktop (Windows/local headed without CI) vs Cloud/GitHub container
      const isLocalHeaded = !IS_HEADLESS && (process.platform === 'win32' || process.env.LOCAL_MODE === 'true' || process.env.LOCAL_AGENT === 'true' || !process.env.CI);
      let tunnelUrl = null;
      if (isLocalHeaded) {
        console.log('🖥️ [Local Headed Mode] Skipping cloudflared / noVNC tunnel. Please solve CAPTCHA directly in the open Chrome browser window on your desktop.');
      } else {
        tunnelUrl = await startQuickTunnel();
      }

      // 2. PAUSE the job safely with evidence
      await updateJobState(job.id, {
        status: 'paused_user_action',
        currentStep: stepDesc,
        challengeType,
        evidenceScreenshot: screen2,
        interactiveUrl: tunnelUrl,
        humanActionRequired: true,
        resume_supported: true,
        session_saved: true,
        saved_step: stepDesc,
        saved_url: page.url(),
        saved_at: savedSessionRecord.savedAt
      });

      // 3. Wait for real human action or resolution (max 180s timeout)
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
        const updatedStorageState = await context.storageState();

        // Update SessionManager session
        await saveSession(job.id, context, {
          currentUrl: page.url(),
          currentStep: 'احراز هویت انسانی با موفقیت تایید و نشست کاری ذخیره شد. در حال ارسال آگهی...',
          platformId: platformKey,
          timestamp: new Date().toISOString()
        });

        // Sync to cPanel platform session vault
        await fetch(`${CPANEL_URL}?route=sessions/storage-state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CPANEL_AGENT_TOKEN}` },
          body: JSON.stringify({
            platformId: platformKey,
            storageState: updatedStorageState
          })
        });

        sessionRestored = true;
        restoredAt = new Date().toISOString();

        await updateJobState(job.id, {
          status: 'in_progress',
          currentStep: 'احراز هویت انسانی با موفقیت تایید و نشست کاری ذخیره شد. در حال ارسال آگهی...',
          resume_supported: true,
          session_restored: true,
          restored_at: restoredAt
        });
      } else {
        console.log('⏱️ [Timeout] Human action was not performed within 180s. Job remains paused_user_action.');
        await updateJobState(job.id, {
          status: 'paused_user_action',
          currentStep: 'زمان انتظار برای حل چالش انسانی به پایان رسید. نوبت کاری متوقف باقی می‌ماند.',
          resume_supported: true,
          session_saved: true
        });
        return false;
      }
    } else {
      console.log('ℹ️ [Progress]: Direct progression without challenge.');
      await updateJobState(job.id, {
        status: 'in_progress',
        currentStep: 'مرحله اول ورود انجام شد. در حال تکمیل فرم آگهی...',
        evidenceScreenshot: screen2,
        resume_supported: true,
        session_restored: sessionRestored,
        restored_at: restoredAt
      });
    }

    // مرحله ۲: هدایت به فرم درج آگهی پس از ورود / احراز هویت
    const AD_FORM_MAP = {
      plat_agahi24: 'https://agahi24.com/post-new-ad',
      plat_niazpardaz: 'https://www.niazpardaz.com/add-ad',
      plat_istgah: 'https://www.istgah.com/insert_ad',
      plat_payamsara: 'https://www.payamsara.com/post_ad',
      plat_parscenter: 'https://parscenter.com/Product/Create',
      plat_shahrema: 'https://shahrema.com/add-ad',
      plat_locopoc: 'https://www.locopoc.com/add-ad',
      plat_divar: 'https://divar.ir/new',
      plat_sheypoor: 'https://www.sheypoor.com/new-ad'
    };

    let adFormUrl = AD_FORM_MAP[platformKey];
    const currentUrlNow = page.url();
    const isStillOnAuth = currentUrlNow.includes('register') || currentUrlNow.includes('login') || currentUrlNow.includes('auth');

    if (isStillOnAuth && adFormUrl) {
      console.log(`🧭 [Form Navigation] Moving from auth page to ad form: ${adFormUrl}`);
      await updateJobState(job.id, {
        status: 'in_progress',
        currentStep: 'احراز هویت تایید شد. در حال پیمایش به فرم درج آگهی...',
        resume_supported: true
      });
      try {
        await page.goto(adFormUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(2500);
      } catch (navErr) {
        console.warn(`⚠️ [Ad Form Navigation Warning]: ${navErr.message}`);
      }
    }

    // مرحله ۳: تحلیل فیلدهای فرم آگهی (Inspecting Form & Mapping Fields)
    console.log('🔍 [DOM Inspection] Scanning for ad form fields (title, content, phone, person)...');
    const formFields = await page.$$('input, textarea, select');
    const fieldsFoundCount = formFields.length;

    await updateJobState(job.id, {
      status: 'in_progress',
      currentStep: `فرم آگهی شناسایی شد (${fieldsFoundCount} فیلد ورودی). در حال تطبیق و پر کردن مقادیر واقعی...`,
      resume_supported: true,
      fieldsFound: fieldsFoundCount
    });

    // مرحله ۴: اعتبارسنجی دقیق و تکمیل فیلدهای آگهی با داده‌های واقعی کمپین
    const adTitleVal = (job.campaignTitle || job.title || '').trim();
    const adContentVal = (job.campaignContent || job.content || job.description || '').trim();
    const contactPhoneVal = (job.contactPhone || job.phone || '').trim();
    const contactPersonVal = (job.contactPerson || job.contactName || job.brandName || '').trim();

    // حذف کامل مقادیر پیش‌فرض ساختگی: اگر داده‌های کمپین ناقص است، اجرا متوقف می‌شود
    if (!adTitleVal || adTitleVal.length < 5 || !adContentVal || adContentVal.length < 15 || !contactPhoneVal) {
      console.error(`❌ [Payload Error] Job ${job.id} lacks valid campaign payload.`);
      const missing = [];
      if (!adTitleVal || adTitleVal.length < 5) missing.push('عنوان آگهی (حداقل ۵ کاراکتر)');
      if (!adContentVal || adContentVal.length < 15) missing.push('متن آگهی (حداقل ۱۵ کاراکتر)');
      if (!contactPhoneVal) missing.push('شماره تماس معتبر');

      await updateJobState(job.id, {
        status: 'blocked',
        error: 'INVALID_OR_MISSING_CAMPAIGN_PAYLOAD',
        currentStep: `توقف اجرای ورکر: داده‌های ضروری کمپین ناقص است [${missing.join('، ')}]. استفاده از مقادیر پیش‌فرض ممنوع است.`,
        workflowId: job.workflowId || WORKFLOW_ID,
        executionId: job.executionId || EXECUTION_ID
      });
      return false;
    }

    // درج عنوان
    const titleField = await page.$('input[name*="title" i], input[id*="title" i], input[placeholder*="عنوان" i]');
    if (titleField) {
      await titleField.fill(adTitleVal);
      console.log(`✍️ [Ad Form] Real Title filled: ${adTitleVal.substring(0, 30)}...`);
    }

    // درج متن آگهی
    const descField = await page.$('textarea[name*="desc" i], textarea[name*="content" i], textarea[id*="desc" i], textarea[placeholder*="متن" i], textarea[placeholder*="شرح" i]');
    if (descField) {
      await descField.fill(adContentVal);
      console.log('✍️ [Ad Form] Real Content filled successfully.');
    }

    // درج شماره و شخص
    const phoneField = await page.$('input[name*="phone" i], input[name*="mobile" i], input[id*="mobile" i]');
    if (phoneField && (await phoneField.inputValue()) === '') {
      await phoneField.fill(contactPhoneVal);
    }
    const personField = await page.$('input[name*="name" i], input[name*="contact" i]');
    if (personField && (await personField.inputValue()) === '') {
      await personField.fill(contactPersonVal || 'مسئول فروش');
    }

    const filledScreenshot = path.join(EVIDENCE_DIR, `job_${job.id}_form_filled.png`);
    await page.screenshot({ path: filledScreenshot });

    // مرحله ۵: ارسال فرم آگهی (Submit Ad Form)
    await updateJobState(job.id, {
      status: 'in_progress',
      currentStep: 'فیلدهای آگهی با داده‌های واقعی کمپین تکمیل شد. در حال ارسال فرم نهایی...',
      evidenceScreenshot: filledScreenshot,
      resume_supported: true,
      workflowId: job.workflowId || WORKFLOW_ID,
      executionId: job.executionId || EXECUTION_ID
    });

    console.log('🚀 [Ad Form Submit] Clicking publication submit button...');
    const adSubmitBtn = await page.$('button[type="submit"], input[type="submit"], button:has-text("ثبت آگهی"), button:has-text("ارسال آگهی"), button:has-text("ذخیره"), button:has-text("ارسال"), button:has-text("ثبت")');
    if (!adSubmitBtn) {
      console.error(`❌ [Submit Error] Submit button not found on page for job ${job.id}`);
      await updateJobState(job.id, {
        status: 'failed',
        error: 'SUBMIT_BUTTON_NOT_FOUND',
        currentStep: 'دکمه ارسال آگهی در صفحه مرورگر یافت نشد. وضعیت: FORM_ERROR.',
        workflowId: job.workflowId || WORKFLOW_ID,
        executionId: job.executionId || EXECUTION_ID
      });
      return false;
    }

    try {
      await adSubmitBtn.click({ force: true });
      await page.waitForTimeout(4000);
    } catch (clickErr) {
      console.error(`❌ [Click Error] Failed clicking submit button: ${clickErr.message}`);
      await updateJobState(job.id, {
        status: 'failed',
        error: 'SUBMIT_CLICK_FAILED',
        currentStep: `خطا در کلیک دکمه ارسال: ${clickErr.message}`,
        workflowId: job.workflowId || WORKFLOW_ID,
        executionId: job.executionId || EXECUTION_ID
      });
      return false;
    }

    // مرحله ۶: استخراج نتیجه واقعی صفحه پس از ارسال
    const postSubmitUrl = page.url();
    const finalScreenshot = path.join(EVIDENCE_DIR, `job_${job.id}_submitted.png`);
    await page.screenshot({ path: finalScreenshot });

    const postContent = await page.content();
    const hasFormError = postContent.includes('خطا در ثبت') ||
                         postContent.includes('الزامی است') ||
                         postContent.includes('نامعتبر است') ||
                         Boolean(await page.$('.error, .alert-danger, [aria-invalid="true"]'));

    if (hasFormError) {
      console.error(`❌ [Form Validation Error] Page rejected submission with validation errors.`);
      await updateJobState(job.id, {
        status: 'failed',
        error: 'FORM_VALIDATION_ERROR',
        currentStep: 'سامانه مقصد پس از ارسال فرم خطای اعتبارسنجی نمایش داد. وضعیت: FORM_ERROR.',
        evidenceScreenshot: finalScreenshot,
        workflowId: job.workflowId || WORKFLOW_ID,
        executionId: job.executionId || EXECUTION_ID
      });
      return false;
    }

    // بررسی چالش OTP احتمالی
    const otpGateDetected = postContent.includes('کد تایید') ||
                            postContent.includes('کد پیامک') ||
                            postSubmitUrl.includes('verify') ||
                            postSubmitUrl.includes('otp') ||
                            Boolean(await page.$('input[name*="otp" i], input[name*="code" i], input[id*="otp" i]'));

    if (otpGateDetected) {
      console.log(`🔐 [OTP Required] Platform requested OTP confirmation.`);
      await updateJobState(job.id, {
        status: 'waiting_otp',
        currentStep: 'سایت مقصد برای تکمیل ارسال آگهی درخواست کد تایید (OTP) داده است. وضعیت: OTP_REQUIRED.',
        evidenceScreenshot: finalScreenshot,
        workflowId: job.workflowId || WORKFLOW_ID,
        executionId: job.executionId || EXECUTION_ID
      });
      return true;
    }

    const lowerPostUrl = postSubmitUrl.toLowerCase();
    const isStillAuthOrRegister = lowerPostUrl.includes('register') ||
                                  lowerPostUrl.includes('login') ||
                                  lowerPostUrl.includes('auth') ||
                                  lowerPostUrl.includes('user/register');

    if (isStillAuthOrRegister) {
      console.warn(`⚠️ [URL Guard] Current URL is still an auth/registration URL (${postSubmitUrl}). Not treating as publication URL.`);
      await updateJobState(job.id, {
        status: 'blocked',
        currentStep: 'آگهی در مرحله ورود/ثبت‌نام متوقف شد و به صفحه انتشار عمومی منتقل نشد.',
        error: 'AUTH_REQUIRED_OR_BLOCKED',
        evidenceScreenshot: finalScreenshot,
        workflowId: job.workflowId || WORKFLOW_ID,
        executionId: job.executionId || EXECUTION_ID
      });
      return false;
    }

    // بررسی وجود لینک عمومی در صفحه
    let publicAdUrl = null;
    const viewAdLink = await page.$('a:has-text("مشاهده آگهی"), a:has-text("صفحه آگهی"), a[href*="/ad/"], a[href*="/post/"], a[href*="/item/"]');
    if (viewAdLink) {
      publicAdUrl = await viewAdLink.getAttribute('href');
      if (publicAdUrl && !publicAdUrl.startsWith('http')) {
        const base = new URL(postSubmitUrl).origin;
        publicAdUrl = base + (publicAdUrl.startsWith('/') ? '' : '/') + publicAdUrl;
      }
    }

    if (!publicAdUrl && (lowerPostUrl.includes('/ad/') || lowerPostUrl.includes('/post/') || lowerPostUrl.includes('/item/') || lowerPostUrl.includes('/detail/'))) {
      publicAdUrl = postSubmitUrl;
    }

    // اگر آگهی در صف تایید یا بررسی است (فاقد لینک فوری عمومی)
    const isUnderReview = postContent.includes('در انتظار تایید') ||
                          postContent.includes('پس از تایید مدیریت') ||
                          postContent.includes('در حال بررسی') ||
                          postContent.includes('با موفقیت ثبت شد');

    if (!publicAdUrl && isUnderReview) {
      console.log('ℹ️ [Moderation Queue] Ad submitted successfully, currently pending platform review.');
      await updateJobState(job.id, {
        status: 'waiting_human',
        currentStep: 'آگهی با موفقیت ارسال شد و در انتظار تایید ناظر پلتفرم قرار گرفت. لینک پس از بررسی فعال خواهد شد.',
        evidenceScreenshot: finalScreenshot,
        workflowId: job.workflowId || WORKFLOW_ID,
        executionId: job.executionId || EXECUTION_ID
      });
      return true;
    }

    if (!publicAdUrl) {
      console.warn('⚠️ [No Public URL] Platform did not return an observable public ad link.');
      await updateJobState(job.id, {
        status: 'unknown',
        currentStep: 'آگهی ارسال شد اما لینک عمومی معتبری توسط سامانه صادر نگردید. وضعیت: UNKNOWN.',
        error: 'NO_PUBLIC_URL_DETECTED',
        evidenceScreenshot: finalScreenshot,
        workflowId: job.workflowId || WORKFLOW_ID,
        executionId: job.executionId || EXECUTION_ID
      });
      return false;
    }

    // مرحله ۷: راستی‌آزمایی مستقل و اثبات واقعی انتشار با Unified Verification Service
    console.log(`🔎 [Unified Verification] Verifying public ad link with shared engine: ${publicAdUrl}`);
    const verifyEvidence = await verifyPublicationEvidence({
      url: publicAdUrl,
      expectedTitle: adTitleVal,
      expectedJobId: job.id,
      expectedPhone: contactPhoneVal,
      timeoutMs: 8000
    });

    if (verifyEvidence.verified) {
      const matchDetails = verifyEvidence.matchedKeywords?.join('، ') || 'عنوان و شناسه کمپین';
      await updateJobState(job.id, {
        status: 'published',
        currentStep: `آگهی در صفحه عمومی راستی‌آزمایی شد (شاهد قطعی: تطبیق ${matchDetails}).`,
        progressPercent: 100,
        evidenceScreenshot: finalScreenshot,
        adUrl: publicAdUrl,
        publicationVerified: true,
        workflowId: job.workflowId || WORKFLOW_ID,
        executionId: job.executionId || EXECUTION_ID
      });
      console.log(`✅ [Job Completed] Verified published ad: ${publicAdUrl}`);
      return true;
    } else {
      console.warn(`⚠️ [Verification Failed] Evidence check rejected: ${verifyEvidence.error}`);
      await updateJobState(job.id, {
        status: 'unknown',
        currentStep: `لینک آگهی صادر شد اما محتوای اختصاصی کمپین در صفحه احراز نشد (${verifyEvidence.error || 'عدم تطبیق محتوا'}). وضعیت: UNKNOWN.`,
        error: verifyEvidence.error || 'CONTENT_VERIFICATION_MISMATCH',
        adUrl: publicAdUrl,
        publicationVerified: false,
        evidenceScreenshot: finalScreenshot,
        workflowId: job.workflowId || WORKFLOW_ID,
        executionId: job.executionId || EXECUTION_ID
      });
      return false;
    }
  } catch (err) {
    console.error(`❌ [Execution Error]: ${err.message}`);
    await updateJobState(job.id, {
      status: 'failed',
      currentStep: `خطای پردازش مرورگر: ${err.message}`,
      error: err.message,
      resume_supported: true,
      session_restored: sessionRestored
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
  if (TASK_ACTION) {
    console.log(`🎯 [Direct Task Execution Mode] Action: ${TASK_ACTION}, ActionID: ${ACTION_ID || 'auto'}, State: ${TASK_STATE || 'AUTO'}`);
    
    // تلاش برای Handshake با cPanel در صورت در دسترس بودن سرور (بدون سد کردن اجرای مستقیم در صورت عدم دسترسی)
    try {
      await handshake({ isDirectTask: true });
    } catch (_) {}

    let parsedInput = {};
    if (typeof TASK_INPUT === 'string') {
      try {
        parsedInput = JSON.parse(TASK_INPUT);
      } catch (_) {
        parsedInput = { raw: TASK_INPUT };
      }
    } else if (TASK_INPUT && typeof TASK_INPUT === 'object') {
      parsedInput = TASK_INPUT;
    }

    const directTask = {
      action: TASK_ACTION,
      actionId: ACTION_ID || `act_${Date.now()}`,
      state: TASK_STATE || 'AUTO',
      workflowId: WORKFLOW_ID || null,
      executionId: EXECUTION_ID || null,
      jobId: TARGET_JOB_ID || null,
      platform: PLATFORM_TARGET,
      input: parsedInput
    };

    let taskResult = null;
    try {
      taskResult = await executeTask(directTask);
      console.log(`📊 [Direct Task Result]:`, JSON.stringify(taskResult, null, 2));
    } finally {
      if (activeLocalBrowser) {
        try {
          console.log('🛑 [Browser] Terminating active Chromium instance (Scale-to-Zero).');
          await activeLocalBrowser.close();
          activeLocalBrowser = null;
          activeLocalPage = null;
        } catch (_) {}
      }
    }

    if (!taskResult || !taskResult.success) {
      console.error(`❌ [Direct Task Failed]: ${taskResult?.error || 'Execution did not complete successfully.'}`);
      process.exit(1);
    } else {
      console.log(`✅ [Direct Task Completed Successfully]`);
      process.exit(0);
    }
    return;
  }

  await handshake();
  startLocalTaskServer();

  if (IS_ONCE) {
    console.log(`🔍 [Single Execution Mode] Checking for balanced pending jobs via Orchestrator...`);
    let targetJob = null;
    let claim = null;

    if (TARGET_JOB_ID) {
      claim = await claimJob(TARGET_JOB_ID);
      if (claim && claim.job) targetJob = claim.job;
    } else {
      claim = await claimBalancedJob();
      if (claim && claim.job) targetJob = claim.job;
    }

    if (targetJob && claim) {
      const success = await executeJob(targetJob, claim);
      if (!success) {
        console.error(`❌ [Execution Finished] Job ${targetJob.id} could not complete successfully.`);
        process.exit(1);
      }
    } else {
      if (TARGET_JOB_ID) {
        console.error(`❌ [Target Job Claim Failed] Specified task ${TARGET_JOB_ID} was not found or already claimed.`);
        process.exit(1);
      }
      console.log(`✅ No eligible balanced jobs found in queue. Worker gracefully terminating.`);
    }
    process.exit(0);
  } else {
    console.log(`🔄 [Continuous Loop Started] Interval: ${POLL_INTERVAL_MS}ms`);
    setInterval(async () => {
      let claim = null;
      if (TARGET_JOB_ID) {
        claim = await claimJob(TARGET_JOB_ID);
      } else {
        claim = await claimBalancedJob();
      }

      if (claim && claim.job) {
        await executeJob(claim.job, claim);
      }
    }, POLL_INTERVAL_MS);
  }
}

const isDirectExecution = process.argv[1] && (
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('local-agent/index.js') ||
  process.argv[1].endsWith('local-agent\\index.js')
);

if (isDirectExecution) {
  main().catch((err) => {
    console.error(`❌ [Fatal Worker Exception]: ${err.message}`);
    process.exit(1);
  });
}

export { executeWorkerTask, executeTask, SUPPORTED_WORKER_ACTIONS };


