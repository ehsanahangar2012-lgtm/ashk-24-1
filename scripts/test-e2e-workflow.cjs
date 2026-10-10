/**
 * End-to-End Workflow Verification Script
 * Ashk24 Enterprise Architecture - v5.9.36
 * Real-world workflow execution testing across all 3 workers:
 * - Priority 1: GitHub Orchestrator (Network probe, Content generation, Publication Verification)
 * - Priority 2: Extension Worker (Real DOM inspection, Field injection, OTP injection)
 * - Priority 3: Local Worker (Alternative execution for supported tasks via Local Agent Daemon)
 * 
 * ضوابط تست:
 * - حذف کامل mockDomResponse و داده‌های ساختگی ثابت
 * - در صورت عدم دسترسی به ورکر یا سرویس، اعلام قطعی وضعیت BLOCKED
 * - طبقه‌بندی شفاف هر مرحله به صورت: REAL، PARTIAL و BLOCKED
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { verifyPublicationEvidence } = require('../src/services/unifiedVerificationService.js');

let activeVersion = '5.9.40';
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  activeVersion = pkg.version || activeVersion;
} catch (e) {}

console.log('===============================================================');
console.log(`🧪 اجرای تست جامع و کنترل‌شده End-to-End بر مبنای کمپین و پلتفرم واقعی (نسخه v${activeVersion})`);
console.log('===============================================================');

// استخراج کمپین واقعی از دیتابیس پروژه (عدم استفاده از اطلاعات ساختگی یا جایگزین هاردکد شده)
function loadRealCampaign() {
  try {
    const dbPath = path.resolve(__dirname, '../data/ashk24_db.json');
    if (fs.existsSync(dbPath)) {
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      if (Array.isArray(db.campaigns) && db.campaigns.length > 0) {
        const cmp = db.campaigns[0];
        const profile = db.companyProfile || {};
        const title = (cmp.title || cmp.productName || '').trim();
        const description = (cmp.productDescription || profile.aboutUsSummary || '').trim();
        const phone = (cmp.contactPhone || profile.phoneNumber || profile.mobilePhone || '').trim();

        if (title && phone) {
          return {
            id: cmp.id || 'cmp_real_01',
            title,
            description,
            phone,
            contactPerson: profile.contactPerson || '',
            city: cmp.targetCity || profile.city || 'مشهد',
            province: profile.province || 'خراسان رضوی',
            keywords: Array.isArray(cmp.targetKeywords) ? cmp.targetKeywords : []
          };
        }
      }
    }
  } catch (_) {}

  // بازگرداندن صریح null در نبود کمپین معتبر (حذف کامل هرگونه fallback ساختگی)
  return null;
}

async function checkLocalAgentDaemon() {
  const t0 = Date.now();
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3824/health', { timeout: 1500 }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ online: res.statusCode === 200, output: json, durationMs: Date.now() - t0 });
        } catch (_) {
          resolve({ online: res.statusCode === 200, output: null, durationMs: Date.now() - t0 });
        }
      });
    });
    req.on('error', () => resolve({ online: false, output: null, durationMs: Date.now() - t0 }));
    req.on('timeout', () => { req.destroy(); resolve({ online: false, output: null, durationMs: Date.now() - t0 }); });
  });
}

// استعلام اتصال واقعی افزونه بر اساس heartbeat، شناسه افزونه و زمان آخرین پاسخ
async function checkExtensionLiveStatus() {
  const t0 = Date.now();
  // الف) بررسی هارت‌بیت و وضعیت ثبت‌شده در دیتابیس cPanel
  try {
    const dbPath = path.resolve(__dirname, '../cpanel-backend/data/database.json');
    if (fs.existsSync(dbPath)) {
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const extChannel = db?.orchestrator?.channels?.extension;
      if (extChannel && extChannel.agentId && extChannel.lastHeartbeat) {
        const nowSec = Math.floor(Date.now() / 1000);
        const ageSec = nowSec - extChannel.lastHeartbeat;
        if (ageSec <= 120) {
          return {
            online: true,
            extensionId: extChannel.agentId,
            lastHeartbeat: new Date(extChannel.lastHeartbeat * 1000).toISOString(),
            durationMs: Date.now() - t0,
            details: `افزونه با شناسه ${extChannel.agentId} آنلاین است (آخرین هارت‌بیت: ${ageSec} ثانیه قبل)`
          };
        }
      }
    }
  } catch (_) {}

  // ب) استعلام وضعیت زنده از دیمون محلی
  try {
    const localStatus = await new Promise((resolve) => {
      const req = http.get('http://127.0.0.1:3824/extension-status', { timeout: 1200 }, (res) => {
        let b = '';
        res.on('data', chunk => { b += chunk; });
        res.on('end', () => {
          try {
            const j = JSON.parse(b);
            resolve(j && j.connected === true ? j : null);
          } catch (_) { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });

    if (localStatus && localStatus.extensionId) {
      return {
        online: true,
        extensionId: localStatus.extensionId,
        lastHeartbeat: new Date().toISOString(),
        durationMs: Date.now() - t0,
        details: `افزونه از طریق پورت محلی متصل است (${localStatus.extensionId})`
      };
    }
  } catch (_) {}

  return {
    online: false,
    extensionId: null,
    lastHeartbeat: null,
    durationMs: Date.now() - t0,
    details: 'افزونه متصل نیست؛ هیچ هارت‌بیت یا هندشیک زنده‌ای در ۱۲۰ ثانیه اخیر یافت نشد. توکن یا سابقه قبلی به تنهایی نشانه آنلاین بودن نیست.'
  };
}

// ارسال تسک واقعی به ورکر با تمام شناسه‌های مشترک و ردیابی پاسخ واقعی
async function dispatchTaskToWorker(taskPayload) {
  const t0 = Date.now();
  return new Promise((resolve) => {
    const payloadStr = JSON.stringify(taskPayload);
    const req = http.request('http://127.0.0.1:3824/execute-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadStr)
      },
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({
            executed: true,
            success: json.success === true,
            statusCode: res.statusCode,
            response: json,
            durationMs: Date.now() - t0
          });
        } catch (_) {
          resolve({
            executed: false,
            success: false,
            statusCode: res.statusCode,
            error: 'پاسخ ورکر به صورت JSON معتبر دریافت نشد',
            durationMs: Date.now() - t0
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        executed: false,
        success: false,
        error: `عدم امکان برقراری ارتباط مستقیم با ورکر: ${err.message}`,
        durationMs: Date.now() - t0
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        executed: false,
        success: false,
        error: 'پاسخی از ورکر دریافت نشد (Timeout)',
        durationMs: Date.now() - t0
      });
    });

    req.write(payloadStr);
    req.end();
  });
}

async function probeDestinationPortal(url) {
  const t0 = Date.now();
  return new Promise((resolve) => {
    const req = https.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 400,
          statusCode: res.statusCode,
          durationMs: Date.now() - t0,
          bodyLength: data.length,
          body: data
        });
      });
    });
    req.on('error', (err) => resolve({ ok: false, statusCode: 0, durationMs: Date.now() - t0, error: err.message, bodyLength: 0, body: '' }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, statusCode: 0, durationMs: Date.now() - t0, error: 'Timeout', bodyLength: 0, body: '' }); });
  });
}

async function runE2eTest() {
  const testResults = [];
  const targetPortal = 'https://agahi24.com';

  // ۱. بررسی فوری و توقف قطعی در نبود کمپین معتبر (بدون تولید هیچ مرحله، شناسه یا داده جایگزین)
  const realCampaign = loadRealCampaign();
  if (!realCampaign) {
    console.error('❌ [خطا] هیچ کمپین معتبری در دیتابیس پروژه یافت نشد.');
    console.error('   طبق الزامات کیفی، داده جایگزین ثابت (Fallback) حذف شده و آزمون فوراً متوقف گردید.');
    console.error('   هیچ مرحله دیگری اجرا نخواهد شد و هیچ داده یا شناسه ساختگی تولید نگردید.\n');
    console.log('===============================================================');
    console.log('⚠️ نتیجه نهایی تست End-to-End: وضعیت [BLOCKED] (نبود کمپین معتبر)');
    console.log('===============================================================');
    process.exit(2);
  }

  console.log(`📌 کمپین انتخاب‌شده: «${realCampaign.title}»`);
  console.log(`🏢 شرکت: اشک قلم | تلفن: ${realCampaign.phone} | شهر: ${realCampaign.city}`);
  console.log(`🎯 پلتفرم مقصد: ${targetPortal}\n`);

  // مرحله ۱: DISCOVERY & REACHABILITY (ارتباط زنده با پلتفرم مقصد)
  console.log(`[مرحله ۱: DISCOVERY / تست ارتباط زنده با پلتفرم مقصد (${targetPortal})]`);
  const probe = await probeDestinationPortal(targetPortal);
  const stage1Success = probe.ok;
  testResults.push({
    step: '1. DISCOVERY & REACHABILITY',
    worker: 'gh_orchestrator_main (GitHub Worker)',
    executionType: stage1Success ? 'REAL' : 'BLOCKED',
    status: stage1Success ? 'COMPLETED' : 'BLOCKED',
    durationMs: probe.durationMs,
    input: { targetPortal },
    output: { statusCode: probe.statusCode, bodyLength: probe.bodyLength },
    error: stage1Success ? undefined : probe.error,
    details: stage1Success
      ? `ارتباط زنده با پلتفرم برقرار شد (کد ${probe.statusCode}، حجم پاسخ: ${probe.bodyLength} بایت، تاخیر: ${probe.durationMs}ms)`
      : `عدم دسترسی به پلتفرم: ${probe.error}`
  });
  console.log(`  نتیجه: ${stage1Success ? '✓ REAL (موفق)' : '❌ BLOCKED'} | زمان: ${probe.durationMs}ms`);

  // مرحله ۲: AD_GENERATING & MAPPING (ساخت و اعتبارسنجی فیلدهای واقعی کمپین)
  console.log('\n[مرحله ۲: AD_GENERATING & MAPPING / ساخت و اعتبارسنجی فیلدهای واقعی]');
  const t2 = Date.now();
  const hasValidTitle = Boolean(realCampaign.title && realCampaign.title.length >= 5);
  const hasValidPhone = Boolean(realCampaign.phone && realCampaign.phone.startsWith('09'));
  const hasValidContent = Boolean(realCampaign.description && realCampaign.description.length >= 10);
  const stage2Valid = Boolean(hasValidTitle && hasValidPhone && hasValidContent);
  const dur2 = Date.now() - t2;

  testResults.push({
    step: '2. AD_GENERATING & MAPPING',
    worker: 'gh_orchestrator_main (GitHub Worker)',
    executionType: stage2Valid ? 'REAL' : 'BLOCKED',
    status: stage2Valid ? 'COMPLETED' : 'BLOCKED',
    durationMs: dur2,
    input: { campaignId: realCampaign.id },
    output: {
      title: realCampaign.title,
      phone: realCampaign.phone,
      city: realCampaign.city,
      keywordsCount: realCampaign.keywords.length
    },
    details: stage2Valid
      ? `داده‌های واقعی کمپین با موفقیت اعتبارسنجی شدند: [عنوان=${realCampaign.title}، تلفن=${realCampaign.phone}]`
      : 'نقص در داده‌های کمپین واقعی؛ توقف اجرا.'
  });
  console.log(`  نتیجه: ${stage2Valid ? '✓ REAL (موفق)' : '❌ BLOCKED'} | زمان: ${dur2}ms`);

  // مرحله ۳: REAL WORKER TASK EXECUTION (ارسال تسک واقعی با شناسه‌های یکتا و ردیابی اجرای واقعی)
  console.log('\n[مرحله ۳: REAL WORKER TASK EXECUTION / ارسال تسک واقعی به Worker مناسب]');
  const workflowId = `wf_e2e_${Date.now()}`;
  const executionId = `exec_e2e_${Date.now()}`;
  const jobId = realCampaign.id;
  const actionId = `act_publish_${Date.now()}`;

  const taskPayload = {
    workflowId,
    executionId,
    jobId,
    actionId,
    action: 'publish_ad',
    state: 'PENDING_EXECUTION',
    input: {
      url: targetPortal,
      title: realCampaign.title,
      description: realCampaign.description,
      phone: realCampaign.phone,
      city: realCampaign.city,
      province: realCampaign.province,
      keywords: realCampaign.keywords
    }
  };

  // بررسی وضعیت دیمون و اقدام به اجرای تسک واقعی
  const daemonCheck = await checkLocalAgentDaemon();
  let workerDispatchRes = null;
  let workerExecuted = false;

  if (daemonCheck.online) {
    console.log(`  دیمون محلی در پورت ۳۸۲۴ پاسخگو است. ارسال فرمان با شناسه‌های [${workflowId}, ${jobId}]...`);
    workerDispatchRes = await dispatchTaskToWorker(taskPayload);
    workerExecuted = workerDispatchRes.executed && workerDispatchRes.success;
  }

  const stage3Real = workerExecuted;
  testResults.push({
    step: '3. REAL_WORKER_TASK_EXECUTION',
    worker: daemonCheck.online ? 'local_agent_worker (Local Worker)' : 'none_available',
    executionType: stage3Real ? 'REAL' : 'BLOCKED',
    status: stage3Real ? 'COMPLETED' : 'BLOCKED',
    durationMs: daemonCheck.durationMs + (workerDispatchRes ? workerDispatchRes.durationMs : 0),
    input: { workflowId, executionId, jobId, actionId, action: taskPayload.action },
    output: {
      daemonOnline: daemonCheck.online,
      taskDispatched: Boolean(workerDispatchRes),
      executionResult: workerDispatchRes ? workerDispatchRes.response : null
    },
    error: stage3Real ? undefined : (workerDispatchRes?.error || 'هیچ ورکر فعالی برای اجرای تسک در این محیط آزمایشی در دسترس نیست.'),
    details: stage3Real
      ? `تسک واقعی با موفقیت توسط ورکر اجرا گردید (شناسه اقدام: ${actionId}).`
      : `تسک واقعی با شناسه‌های [${workflowId}, ${actionId}] تولید شد، اما ورکر پاسخگو در دسترس نبود. صرف health check یا قرارگیری در صف به عنوان اجرای واقعی پذیرفته نشد و مرحله BLOCKED گردید.`
  });
  console.log(`  نتیجه: ${stage3Real ? '✓ REAL (اجرای واقعی موفق)' : '⚠️ BLOCKED (ورکر آنلاین نیست؛ رد داده ساختگی)'}`);

  // مرحله ۴: EXTENSION WORKER LIVE STATUS (بررسی هارت‌بیت، شناسه افزونه و زمان آخرین پاسخ)
  console.log('\n[مرحله ۴: EXTENSION WORKER LIVE STATUS / استعلام اتصال زنده افزونه]');
  const extStatus = await checkExtensionLiveStatus();
  testResults.push({
    step: '4. EXTENSION_LIVE_STATUS',
    worker: 'ext_worker_v5 (Extension Worker)',
    executionType: extStatus.online ? 'REAL' : 'BLOCKED',
    status: extStatus.online ? 'COMPLETED' : 'BLOCKED',
    durationMs: extStatus.durationMs,
    input: { channel: 'extension', checkTimeoutSec: 120 },
    output: { online: extStatus.online, extensionId: extStatus.extensionId, lastHeartbeat: extStatus.lastHeartbeat },
    error: extStatus.online ? undefined : extStatus.details,
    details: extStatus.details
  });
  console.log(`  نتیجه: ${extStatus.online ? `✓ REAL (متصل با شناسه ${extStatus.extensionId})` : '⚠️ BLOCKED (عدم وجود هارت‌بیت زنده یا افزونه فعال)'}`);

  // مرحله ۵: OTP LIFECYCLE & RESOLUTION (تعیین تکلیف بر اساس وضعیت واقعی صفحه، نه BLOCKED ثابت)
  console.log('\n[مرحله ۵: OTP LIFECYCLE & RESOLUTION]');
  let otpStatus = 'BLOCKED';
  let otpDetails = '';
  let otpOutput = {};

  if (workerExecuted && workerDispatchRes?.response) {
    const pageOutput = workerDispatchRes.response.output || {};
    if (pageOutput.otpRequired === true) {
      if (pageOutput.otpVerified === true) {
        otpStatus = 'COMPLETED';
        otpDetails = 'کد تایید OTP با موفقیت دریافت، تزریق و توسط سایت تایید شد.';
        otpOutput = { otpRequired: true, otpVerified: true };
      } else {
        otpStatus = 'BLOCKED';
        otpDetails = 'صفحه نیازمند کد OTP است و سیستم در انتظار دریافت کد پیامک معتبر متوقف گردید.';
        otpOutput = { otpRequired: true, otpVerified: false, waitingForInput: true };
      }
    } else {
      otpStatus = 'COMPLETED';
      otpDetails = 'وضعیت صفحه بررسی شد؛ این سناریو نیازی به ورود OTP نداشت یا نشست از قبل فعال بود.';
      otpOutput = { otpRequired: false, otpNotRequired: true };
    }
  } else {
    // در صورت عدم اجرای مرحله قبل توسط ورکر، این مرحله وابسته است و نمی‌تواند به صورت فرضی اجرا شود
    otpStatus = 'BLOCKED';
    otpDetails = 'تعیین تکلیف OTP وابسته به تکمیل مرحله ارسال فرم توسط ورکر است؛ به دلیل عدم اجرای ورکر، این مرحله متوقف ماند.';
    otpOutput = { otpRequired: null, dependencyBlocked: true };
  }

  testResults.push({
    step: '5. OTP_LIFECYCLE_AND_RESOLUTION',
    worker: 'portal_gate / extension',
    executionType: otpStatus === 'COMPLETED' ? 'REAL' : 'BLOCKED',
    status: otpStatus,
    durationMs: 0,
    input: { jobId, workflowId },
    output: otpOutput,
    error: otpStatus === 'COMPLETED' ? undefined : otpDetails,
    details: otpDetails
  });
  console.log(`  نتیجه: ${otpStatus === 'COMPLETED' ? '✓ REAL (تعیین تکلیف معتبر)' : '⚠️ BLOCKED (وابسته به اجرای ورکر)'}`);

  // مرحله ۶: PUBLIC AD URL VERIFICATION (راستی‌آزمایی URL واقعی آگهی پس از ارسال، نه URL نامرتبط)
  console.log('\n[مرحله ۶: PUBLIC AD URL VERIFICATION]');
  let publishedAdUrl = null;
  if (workerExecuted && workerDispatchRes?.response?.output?.publicUrl) {
    publishedAdUrl = workerDispatchRes.response.output.publicUrl;
  }

  let stage6Status = 'BLOCKED';
  let stage6Details = '';
  let stage6Output = {};
  let dur6 = 0;

  if (publishedAdUrl) {
    const t6 = Date.now();
    const verRes = await verifyPublicationEvidence({
      url: publishedAdUrl,
      expectedTitle: realCampaign.title,
      expectedJobId: realCampaign.id,
      expectedPhone: realCampaign.phone,
      timeoutMs: 6000
    });
    dur6 = Date.now() - t6;
    if (verRes.verified) {
      stage6Status = 'COMPLETED';
      stage6Details = `آگهی منتشرشده در نشانی (${publishedAdUrl}) مستقلاً با محتوای کمپین راستی‌آزمایی و تأیید شد.`;
      stage6Output = { verified: true, publicUrl: publishedAdUrl, matchedKeywords: verRes.matchedKeywords };
    } else {
      stage6Status = 'FAILED';
      stage6Details = `نشانی ادعاشده (${publishedAdUrl}) محتوای کمپین را دربر نداشت و راستی‌آزمایی رد شد.`;
      stage6Output = { verified: false, publicUrl: publishedAdUrl };
    }
  } else {
    stage6Status = 'BLOCKED';
    stage6Details = 'آدرس عمومی معتبری از خروجی مرحله انتشار دریافت نشد؛ مرحله راستی‌آزمایی در انتظار انتشار واقعی باقی ماند.';
    stage6Output = { verified: false, publicUrl: null };
  }

  testResults.push({
    step: '6. PUBLIC_AD_URL_VERIFICATION',
    worker: 'gh_orchestrator_main (Unified Verifier)',
    executionType: stage6Status === 'COMPLETED' ? 'REAL' : 'BLOCKED',
    status: stage6Status,
    durationMs: dur6,
    input: { expectedTitle: realCampaign.title, expectedJobId: realCampaign.id },
    output: stage6Output,
    details: stage6Details
  });
  console.log(`  نتیجه: ${stage6Status === 'COMPLETED' ? '✓ REAL (راستی‌آزمایی موفق)' : '⚠️ BLOCKED (در انتظار آدرس معتبر حاصل از انتشار)'}`);

  console.log('\n===============================================================');
  console.log('📊 خلاصه نتایج اجرای تست کنترل‌شده End-to-End:');
  console.log('===============================================================');
  testResults.forEach(r => {
    console.log(`- [${r.status} | ${r.executionType}] ${r.step} | مجری: ${r.worker} | زمان: ${r.durationMs}ms | جزئیات: ${r.details}`);
  });

  // ۵ معیار اساسی برای اثبات اجرای واقعی:
  // ۱. انتخاب کمپین واقعی معتبر
  const criterion1_CampaignSelected = Boolean(
    realCampaign && realCampaign.id && realCampaign.title && realCampaign.phone && realCampaign.description
  );
  // ۲. اجرای Task واقعی توسط ورکر
  const criterion2_WorkerExecuted = testResults.some(
    r => r.step.includes('REAL_WORKER_TASK') && r.status === 'COMPLETED' && r.executionType === 'REAL'
  );
  // ۳. ارسال فرم واقعی
  const criterion3_FormSubmitted = Boolean(
    workerExecuted && workerDispatchRes?.response?.output?.submitted === true
  );
  // ۴. تعیین تکلیف رویداد OTP
  const criterion4_OtpDetermined = testResults.some(
    r => r.step.includes('OTP') && r.status === 'COMPLETED' && (r.output?.otpVerified === true || r.output?.otpNotRequired === true)
  );
  // ۵. استخراج و راستی‌آزمایی مستقل URL عمومی واقعی آگهی
  const criterion5_PublicUrlVerified = testResults.some(
    r => r.step.includes('PUBLIC_AD_URL') && r.status === 'COMPLETED' && r.output?.verified === true && r.output?.publicUrl
  );

  const isFullE2eSuccess = Boolean(
    criterion1_CampaignSelected &&
    criterion2_WorkerExecuted &&
    criterion3_FormSubmitted &&
    criterion4_OtpDetermined &&
    criterion5_PublicUrlVerified
  );

  const hasFailedStep = testResults.some(r => r.status === 'FAILED');

  if (isFullE2eSuccess) {
    console.log('\n===============================================================');
    console.log('🎉 گردش کار کامل End-to-End با موفقیت ۱۰۰٪ اجرا و انتشار واقعی آگهی مستقلاً تایید شد.');
    console.log('===============================================================');
    process.exit(0);
  } else if (hasFailedStep) {
    console.log('\n===============================================================');
    console.log('❌ نتیجه نهایی تست End-to-End: وضعیت [FAIL]');
    console.log('===============================================================');
    process.exit(1);
  } else {
    const blockedSteps = testResults.filter(r => r.status === 'BLOCKED' || r.status === 'WAITING_FOR_WORKER');
    console.log('\n===============================================================');
    console.log('⚠️ نتیجه نهایی تست End-to-End: وضعیت [BLOCKED]');
    console.log('===============================================================');
    console.log('📌 وضعیت گردش کار انتشار: BLOCKED (محیط مرورگر واقعی، ورکر آنلاین یا افزونه در دسترس نیست)');
    console.log('🚫 طبق ضوابط پروژه، هیچ پیام موفقیت انتشاری چاپ نشد و داده ساختگی تولید نگردید.');
    console.log('📋 وضعیت ۵ معیار اساسی E2E واقعی:');
    console.log(`  1. انتخاب کمپین واقعی: ${criterion1_CampaignSelected ? '✓ محقق شد' : '❌ ناموفق'}`);
    console.log(`  2. اجرای Task توسط Worker واقعی: ${criterion2_WorkerExecuted ? '✓ محقق شد' : '⚠️ متوقف (BLOCKED)'}`);
    console.log(`  3. بررسی و ارسال فرم واقعی: ${criterion3_FormSubmitted ? '✓ محقق شد' : '⚠️ متوقف (BLOCKED)'}`);
    console.log(`  4. تعیین تکلیف رویداد OTP: ${criterion4_OtpDetermined ? '✓ محقق شد' : '⚠️ متوقف (BLOCKED)'}`);
    console.log(`  5. استخراج و راستی‌آزمایی مستقل URL عمومی: ${criterion5_PublicUrlVerified ? '✓ محقق شد' : '⚠️ متوقف (BLOCKED)'}`);
    console.log('\n📋 مراحل متوقف‌شده:');
    blockedSteps.forEach(s => {
      console.log(`  - [${s.status}] ${s.step}: ${s.details}`);
    });
    console.log('===============================================================');
    // خروج با کد غیرصفر (کد ۲) برای ممانعت قطعی از تلقی BLOCKED به عنوان اجرای موفق
    process.exit(2);
  }
}

runE2eTest().catch((err) => {
  console.error('❌ [Fatal E2E Error]:', err.message);
  process.exit(1);
});
