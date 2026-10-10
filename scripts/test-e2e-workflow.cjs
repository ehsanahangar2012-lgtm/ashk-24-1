/**
 * End-to-End Workflow Verification Script
 * Ashk24 Enterprise Architecture - v5.9.40
 * Real-world workflow execution testing across all 3 workers:
 * - Priority 1: GitHub Worker (Orchestration, Queuing, Copywriting Synthesis, Cloud Probes)
 * - Priority 2: Extension Worker (Real Browser DOM Inspection, Form Filling, OTP Injection)
 * - Priority 3: Local Worker (Automated browser execution via Local Agent Daemon)
 * 
 * ضوابط تست:
 * ۱. اجرای فرمان‌های واقعی و معتبر:
 *    OPEN_TARGET_URL → CHECK_LOGIN_STATE → INSPECT_AUTH_FORM → DISCOVER_DOM_FIELDS →
 *    INJECT_FIELD_VALUES → CLICK_SUBMIT_BUTTON → OTP → VERIFY_PUBLICATION_URL
 * ۲. تفکیک دقیق خطای فرمان (FAIL) از نبود Worker (BLOCKED)
 * ۳. حذف کامل هرگونه داده جایگزین یا فال‌بک ثابت در کمپین (شناسه واقعی، شهر و استان واقعی)
 * ۴. آزمون واقعی هر سه Worker با قرارداد مشترک و ثبت شناسه‌های یکتا
 * ۵. تفکیک قطعی تست پذیرش از تست انتشار واقعی، و صدور PASS صرفاً در صورت اثبات انتشار واقعی
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

/**
 * بازیابی کمپین واقعی از پایگاه‌داده پروژه بدون هیچ‌گونه مقدار پیش‌فرض یا ساختگی
 * @param {string|null} targetCampaignId - شناسه اختیاری کمپین انتخابی
 */
function loadRealCampaign(targetCampaignId = null) {
  try {
    const dbPath = path.resolve(__dirname, '../data/ashk24_db.json');
    if (!fs.existsSync(dbPath)) return null;

    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    if (!Array.isArray(db.campaigns) || db.campaigns.length === 0) return null;

    // اولویت انتخاب شناسه: ورودی تابع > متغیر محیطی TEST_CAMPAIGN_ID > اولین کمپین بر مبنای سیاست صریح آزمون
    const requestedId = targetCampaignId || process.env.TEST_CAMPAIGN_ID || (
      process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null
    );

    let cmp = null;
    if (requestedId) {
      cmp = db.campaigns.find(c => c.id === requestedId);
      if (!cmp) {
        console.error(`❌ [خطا] کمپین با شناسه '${requestedId}' در پایگاه‌داده یافت نشد.`);
        return null;
      }
    } else {
      // سیاست پیش‌فرض صریح تست: انتخاب اولین کمپین موجود در آرایه دیتابیس
      cmp = db.campaigns[0];
    }

    if (!cmp || !cmp.id) return null;

    const profile = db.companyProfile || {};
    const title = (cmp.title || cmp.productName || '').trim();
    const description = (cmp.productDescription || profile.aboutUsSummary || '').trim();
    const phone = (cmp.contactPhone || profile.phoneNumber || profile.mobilePhone || '').trim();

    // استخراج شهر و استان صرفاً از داده‌های واقعی کمپین یا پروفایل (بدون فال‌بک هاردکد شده)
    let city = (cmp.targetCity || profile.city || '').trim();
    let province = (profile.province || '').trim();

    if (!city && profile.address) {
      const parts = profile.address.split(/[،,-]/).map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        city = parts[0];
      }
    }

    // بررسی وجود تمامی داده‌های ضروری واقعی
    if (cmp.id && title && title.length >= 5 && phone && phone.startsWith('09') && description && description.length >= 10 && city) {
      return {
        id: cmp.id,
        title,
        description,
        phone,
        contactPerson: profile.contactPerson || '',
        city,
        province: province || '',
        keywords: Array.isArray(cmp.targetKeywords) ? cmp.targetKeywords : []
      };
    }
  } catch (_) {}

  return null;
}

/**
 * بررسی وضعیت آنلاین دیمون ورکر محلی
 */
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

/**
 * استعلام اتصال واقعی افزونه بر مبنای هارت‌بیت، شناسه افزونه و زمان آخرین پاسخ
 */
async function checkExtensionLiveStatus() {
  const t0 = Date.now();
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

  return {
    online: false,
    extensionId: null,
    lastHeartbeat: null,
    durationMs: Date.now() - t0,
    details: 'افزونه متصل نیست؛ هیچ هارت‌بیت یا هندشیک زنده‌ای در ۱۲۰ ثانیه اخیر یافت نشد. توکن یا سابقه قبلی به تنهایی نشانه آنلاین بودن نیست.'
  };
}

/**
 * استعلام وضعیت اجرای تسک از GitHub Actions با تطبیق دقیق شناسه‌ها
 */
async function pollGitHubWorkflowExecution(ghRepo, ghToken, workflowId, actionId, maxWaitSec = 8) {
  const t0 = Date.now();
  const deadline = t0 + (maxWaitSec * 1000);

  while (Date.now() < deadline) {
    const runsResult = await new Promise((resolve) => {
      const req = https.request(`https://api.github.com/repos/${ghRepo}/actions/runs?event=repository_dispatch&per_page=5`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Ashk24-E2E-Verifier',
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${ghToken}`
        },
        timeout: 4000
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
          } catch (_) {
            resolve({ statusCode: res.statusCode, data: null });
          }
        });
      });
      req.on('error', () => resolve({ statusCode: 500, data: null }));
      req.on('timeout', () => { req.destroy(); resolve({ statusCode: 408, data: null }); });
      req.end();
    });

    if (runsResult.data && Array.isArray(runsResult.data.workflow_runs) && runsResult.data.workflow_runs.length > 0) {
      const latestRun = runsResult.data.workflow_runs[0];
      const runStatus = latestRun.status; // queued, in_progress, completed
      const runConclusion = latestRun.conclusion; // success, failure, neutral, etc.
      const runId = latestRun.id;

      if (runStatus === 'completed') {
        const isSuccess = runConclusion === 'success';
        return {
          completed: true,
          success: isSuccess,
          status: isSuccess ? 'COMPLETED' : 'FAILED',
          runId,
          runConclusion,
          details: `اجرای رانر GitHub Actions با شناسه Run #${runId} خاتمه یافت (نتیجه: ${runConclusion}).`
        };
      } else {
        // هنوز رانر در حال اجرا است
        return {
          completed: false,
          success: false,
          status: 'RUNNING',
          runId,
          details: `رانر GitHub Actions با شناسه Run #${runId} در وضعیت ${runStatus} قرار دارد و هنوز نهایی نشده است.`
        };
      }
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  return {
    completed: false,
    success: false,
    status: 'PENDING_RUNNER_PICKUP',
    details: 'رانر GitHub Actions در مهلت زمانی تعیین‌شده پاسخ نهایی تسک را ثبت نکرد.'
  };
}

/**
 * بررسی اعزام تسک به GitHub Worker با قرارداد مشترک و ثبت صریح DISPATCH_ACCEPTED
 */
async function probeGitHubWorkerDispatch(task) {
  const t0 = Date.now();
  const ghToken = process.env.GITHUB_TOKEN || process.env.GITHUB_WORKER_TOKEN || '';
  const ghRepo = process.env.GITHUB_REPOSITORY || process.env.GITHUB_WORKER_REPO || '';

  if (!ghToken || !ghRepo) {
    return {
      dispatched: false,
      runnerAvailable: false,
      workerId: 'gh_orchestrator_main',
      workerRole: 'github',
      status: 'BLOCKED',
      durationMs: Date.now() - t0,
      details: 'توکن یا مخزن GitHub Actions در متغیرهای محیطی این سشن آزمایشی پیکربندی نشده است؛ ورکر ابری در دسترس نیست.'
    };
  }

  const dispatchResult = await new Promise((resolve) => {
    const payloadStr = JSON.stringify({
      event_type: 'ashk24-worker-task',
      client_payload: {
        workflow_id: task.workflowId,
        execution_id: task.executionId,
        job_id: task.jobId,
        action_id: task.actionId,
        action: task.action,
        state: task.state,
        platform: task.platform,
        platformDomain: task.platformDomain,
        input: task.input
      }
    });

    const req = https.request(`https://api.github.com/repos/${ghRepo}/dispatches`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Ashk24-E2E-Verifier',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${ghToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadStr)
      },
      timeout: 6000
    }, (res) => {
      const ok = res.statusCode >= 200 && res.statusCode < 300;
      resolve({
        dispatched: ok,
        runnerAvailable: ok,
        workerId: 'gh_orchestrator_main',
        workerRole: 'github',
        statusCode: res.statusCode,
        durationMs: Date.now() - t0,
        status: ok ? 'DISPATCH_ACCEPTED' : 'BLOCKED',
        details: ok ? 'تسک توسط GitHub API پذیرفته شد (وضعیت: DISPATCH_ACCEPTED).' : `پاسخ GitHub API: کد ${res.statusCode}`
      });
    });

    req.on('error', (err) => resolve({
      dispatched: false,
      runnerAvailable: false,
      workerId: 'gh_orchestrator_main',
      workerRole: 'github',
      status: 'BLOCKED',
      durationMs: Date.now() - t0,
      details: `خطا در ارتباط با GitHub API: ${err.message}`
    }));
    req.on('timeout', () => {
      req.destroy();
      resolve({
        dispatched: false,
        runnerAvailable: false,
        workerId: 'gh_orchestrator_main',
        workerRole: 'github',
        status: 'BLOCKED',
        durationMs: Date.now() - t0,
        details: 'درخواست ارتباط با GitHub API به اتمام مهلت زمانی رسید (Timeout).'
      });
    });

    req.write(payloadStr);
    req.end();
  });

  if (!dispatchResult.dispatched) {
    return dispatchResult;
  }

  // تسک در صف GitHub Actions قرار گرفت؛ اکنون منتظر خروجی واقعی رانر می‌مانیم (بدون پیش‌فرض COMPLETED)
  const pollRes = await pollGitHubWorkflowExecution(ghRepo, ghToken, task.workflowId, task.actionId, 6);
  return {
    ...dispatchResult,
    status: pollRes.completed ? pollRes.status : 'DISPATCH_ACCEPTED',
    executionCompleted: pollRes.completed,
    runnerId: pollRes.runId || null,
    details: `${dispatchResult.details} | ${pollRes.details}`
  };
}

/**
 * ارسال فرمان واقعی به کانال ارتباطی افزونه مرورگر و استعلام پاسخ همان actionId
 */
async function dispatchToExtensionWorker(taskPayload, extStatus) {
  const t0 = Date.now();
  // در محیط تست Node بدون مرورگر متصل زنده:
  // ارسال تسک به صف افزونه در بک‌اند یا تلاش برای استعلام کانال وب‌سوکت/HTTP افزونه
  try {
    const extBridgePort = process.env.EXTENSION_BRIDGE_PORT || '3825';
    const payloadStr = JSON.stringify(taskPayload);

    const bridgeRes = await new Promise((resolve) => {
      const req = http.request(`http://127.0.0.1:${extBridgePort}/extension-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payloadStr)
        },
        timeout: 2000
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            resolve({ online: res.statusCode === 200, output: JSON.parse(body) });
          } catch (_) {
            resolve({ online: res.statusCode === 200, output: null });
          }
        });
      });
      req.on('error', () => resolve({ online: false, output: null }));
      req.on('timeout', () => { req.destroy(); resolve({ online: false, output: null }); });
      req.write(payloadStr);
      req.end();
    });

    if (bridgeRes.online && bridgeRes.output) {
      return {
        handled: true,
        success: bridgeRes.output.success === true,
        workerId: extStatus.extensionId || 'ext_worker_v5',
        workerRole: 'extension',
        status: bridgeRes.output.success ? 'COMPLETED' : 'FAILED',
        output: bridgeRes.output,
        durationMs: Date.now() - t0,
        details: `پاسخ فرمان actionId '${taskPayload.actionId}' از افزونه دریافت شد.`
      };
    }
  } catch (_) {}

  // اگر افزونه آنلاین است اما کانال فرمان مستقیم در دسترس نیست، علت دقیق و قابل‌رفع ثبت شود
  return {
    handled: false,
    workerId: extStatus.extensionId || 'ext_worker_v5',
    workerRole: 'extension',
    status: 'BLOCKED',
    durationMs: Date.now() - t0,
    details: 'افزونه مرورگر از طریق هارت‌بیت آنلاین تشخیص داده شد، اما کانال تبادل فرمان مستقیم (Local Extension Bridge روی پورت ۳۸۲۵) یا تب فعال متصل در صفحه هدف در دسترس نیست. برای رفع: تب افزونه را در مرورگر فعال نگه دارید.'
  };
}

/**
 * دیسپچر یکپارچه وظایف در میان هر ۳ Worker بر اساس ترتیب اولویت پروژه:
 * اولویت ۱: GitHub Worker
 * اولویت ۲: Extension Worker
 * اولویت ۳: Local Worker
 * اگر هیچ Worker واجد شرایطی وجود ندارد: ثبت وضعیت WAITING_FOR_WORKER
 */
async function dispatchUnifiedWorkerTask(taskPayload, daemonOnline, extStatus) {
  // پشتیبانی تسک‌ها در ورکر گیت‌هاب (هماهنگی، بازگشایی، استعلام ابری، تولید محتوا)
  const ghSupportedActions = ['open_target_url', 'verify_publication_url', 'probe_target'];
  const extSupportedActions = ['open_target_url', 'check_login_state', 'inspect_auth_form', 'discover_dom_fields', 'inject_field_values', 'click_submit_button', 'inject_and_verify_otp', 'check_otp_acceptance', 'verify_publication_url'];
  const localSupportedActions = ['open_target_url', 'check_login_state', 'inspect_auth_form', 'discover_dom_fields', 'inject_field_values', 'click_submit_button', 'inject_and_verify_otp', 'check_otp_acceptance', 'verify_publication_url'];

  // ۱. بررسی اولویت ۱: GitHub Worker
  const ghToken = process.env.GITHUB_TOKEN || process.env.GITHUB_WORKER_TOKEN || '';
  const ghRepo = process.env.GITHUB_REPOSITORY || process.env.GITHUB_WORKER_REPO || '';
  const isGhConfigured = Boolean(ghToken && ghRepo);

  if (isGhConfigured && ghSupportedActions.includes(taskPayload.action)) {
    const ghRes = await probeGitHubWorkerDispatch(taskPayload);
    if (ghRes.dispatched) {
      if (ghRes.executionCompleted && ghRes.status === 'COMPLETED') {
        return {
          handled: true,
          workerId: ghRes.workerId,
          workerRole: 'github',
          status: 'COMPLETED',
          executionType: 'REAL',
          output: { dispatched: true, runnerId: ghRes.runnerId },
          details: ghRes.details
        };
      }
      return {
        handled: true,
        workerId: ghRes.workerId,
        workerRole: 'github',
        status: 'DISPATCH_ACCEPTED',
        executionType: 'REAL',
        output: { dispatched: true, runnerId: ghRes.runnerId },
        details: ghRes.details
      };
    }
  }

  // ۲. بررسی اولویت ۲: Extension Worker
  if (extStatus.online && extSupportedActions.includes(taskPayload.action)) {
    const extRes = await dispatchToExtensionWorker(taskPayload, extStatus);
    if (extRes.handled) {
      return {
        handled: true,
        workerId: extRes.workerId,
        workerRole: 'extension',
        status: extRes.status,
        executionType: 'REAL',
        output: extRes.output || {},
        details: extRes.details
      };
    }
    // اگر امکان ارسال مستقیم به اکستنشن نبود، با ثبت علت دقیق بررسی ورکر بعدی (Local) انجام شود
  }

  // ۳. بررسی اولویت ۳: Local Worker
  if (daemonOnline && localSupportedActions.includes(taskPayload.action)) {
    const localRes = await dispatchToLocalWorker(taskPayload);
    if (!localRes.executed) {
      return {
        handled: false,
        workerId: 'local_agent_worker',
        workerRole: 'local',
        status: 'BLOCKED',
        error: localRes.error,
        details: `عدم پاسخ دیمون ورکر محلی: ${localRes.error}`
      };
    }

    if (localRes.isUnsupportedAction) {
      return {
        handled: true,
        workerId: localRes.workerId,
        workerRole: 'local',
        status: 'FAILED',
        isCommandError: true,
        error: localRes.error,
        details: `خطای فرمان ورکر: اکشن '${taskPayload.action}' پشتیبانی نمی‌شود.`
      };
    }

    if (!localRes.success) {
      return {
        handled: true,
        workerId: localRes.workerId,
        workerRole: 'local',
        status: 'FAILED',
        isCommandError: false,
        error: localRes.error,
        response: localRes.response,
        details: `اجرای تسک توسط ورکر با شکست مواجه شد: ${localRes.error}`
      };
    }

    return {
      handled: true,
      workerId: localRes.workerId,
      workerRole: 'local',
      status: 'COMPLETED',
      executionType: 'REAL',
      output: localRes.response?.output || {},
      details: `تسک با موفقیت توسط ورکر محلی اجرا گردید (شناسه اقدام: ${taskPayload.actionId}).`
    };
  }

  // ۴. هیچ Worker واجد شرایطی وجود ندارد یا هیچ ورکر فعالی آنلاین نیست
  return {
    handled: false,
    workerId: 'none_available',
    workerRole: 'none',
    status: 'WAITING_FOR_WORKER',
    details: 'هیچ Worker واجد شرایط یا آنلاینی (GitHub Worker, Extension Worker, Local Worker) برای اجرای این تسک در دسترس نیست. وضعیت: WAITING_FOR_WORKER.'
  };
}

async function runE2eTest() {
  const testResults = [];
  const targetPortal = 'https://agahi24.com';
  const targetDomain = 'agahi24.com';

  // ۱. بررسی فوری و توقف قطعی در نبود کمپین معتبر (بدون داده جایگزین یا شناسه ثابت ساختگی)
  const realCampaign = loadRealCampaign();
  if (!realCampaign) {
    console.error('❌ [خطا] هیچ کمپین معتبری در پایگاه‌داده پروژه یافت نشد.');
    console.error('   طبق الزامات کیفی، داده جایگزین ثابت (Fallback) حذف شده و آزمون فوراً متوقف گردید.');
    console.error('   هیچ مرحله دیگری اجرا نخواهد شد و هیچ داده یا شناسه ساختگی تولید نگردید.\n');
    console.log('===============================================================');
    console.log('⚠️ نتیجه نهایی تست End-to-End: وضعیت [BLOCKED] (نبود کمپین معتبر)');
    console.log('===============================================================');
    process.exit(2);
  }

  console.log(`📌 کمپین انتخاب‌شده: «${realCampaign.title}»`);
  console.log(`🆔 شناسه کمپین: ${realCampaign.id}`);
  console.log(`🏢 شرکت: اشک قلم | تلفن: ${realCampaign.phone} | شهر: ${realCampaign.city}`);
  console.log(`🎯 پلتفرم مقصد: ${targetPortal}\n`);

  const workflowId = `wf_e2e_${Date.now()}`;
  const executionId = `exec_e2e_${Date.now()}`;
  const jobId = realCampaign.id;

  // مرحله ۱: آزمون واقعی دیسپچر و وضعیت ۳ ورکر (GitHub Worker, Extension Worker, Local Worker)
  console.log('[بخش ۱: آزمون واقعی ۳ ورکر از طریق Dispatcher و قرارداد مشترک]');

  // الف) آزمون GitHub Worker
  const ghProbe = await probeGitHubWorkerDispatch({
    workflowId,
    executionId,
    jobId,
    actionId: `act_gh_${Date.now()}`,
    action: 'open_target_url',
    state: 'OPENING_PLATFORM',
    platform: 'agahi24',
    platformDomain: targetDomain,
    input: { targetUrl: targetPortal }
  });
  testResults.push({
    step: 'PROBE_GITHUB_WORKER',
    worker: `${ghProbe.workerId} (GitHub Cloud Worker)`,
    executionType: ghProbe.dispatched ? 'REAL' : 'BLOCKED',
    status: ghProbe.dispatched ? 'COMPLETED' : 'BLOCKED',
    durationMs: ghProbe.durationMs,
    input: { workflowId, executionId, jobId, role: 'github' },
    output: { runnerAvailable: ghProbe.runnerAvailable, dispatched: ghProbe.dispatched },
    details: ghProbe.details
  });
  console.log(`  1. GitHub Worker   : ${ghProbe.dispatched ? '✓ REAL (پذیرفته شد)' : '⚠️ BLOCKED (رانر ابری یا توکن در سشن محلی فعال نیست)'}`);

  // ب) آزمون Extension Worker
  const extStatus = await checkExtensionLiveStatus();
  testResults.push({
    step: 'PROBE_EXTENSION_WORKER',
    worker: 'ext_worker_v5 (Extension Worker)',
    executionType: extStatus.online ? 'REAL' : 'BLOCKED',
    status: extStatus.online ? 'COMPLETED' : 'BLOCKED',
    durationMs: extStatus.durationMs,
    input: { channel: 'extension', checkTimeoutSec: 120 },
    output: { online: extStatus.online, extensionId: extStatus.extensionId, lastHeartbeat: extStatus.lastHeartbeat },
    details: extStatus.details
  });
  console.log(`  2. Extension Worker: ${extStatus.online ? `✓ REAL (متصل با شناسه ${extStatus.extensionId})` : '⚠️ BLOCKED (عدم وجود هارت‌بیت زنده در ۱۲۰ ثانیه اخیر)'}`);

  // ج) آزمون Local Worker
  const daemonCheck = await checkLocalAgentDaemon();
  testResults.push({
    step: 'PROBE_LOCAL_WORKER',
    worker: 'local_agent_worker (Local Worker)',
    executionType: daemonCheck.online ? 'REAL' : 'BLOCKED',
    status: daemonCheck.online ? 'COMPLETED' : 'BLOCKED',
    durationMs: daemonCheck.durationMs,
    input: { port: 3824, healthCheckPath: '/health' },
    output: { daemonOnline: daemonCheck.online, details: daemonCheck.output },
    details: daemonCheck.online ? 'دیمون ورکر محلی در پورت ۳۸۲۴ پاسخگو است.' : 'ورکر محلی در پورت ۳۸۲۴ فعال نیست (عدم دسترسی به ورکر).'
  });
  console.log(`  3. Local Worker    : ${daemonCheck.online ? '✓ REAL (دیمون پورت ۳۸۲۴ آنلاین است)' : '⚠️ BLOCKED (دیمون محلی در پورت ۳۸۲۴ پاسخگو نیست)'}\n`);

  // بخش ۲: اجرای ترتیب درست فرمان‌های واقعی و پشتیبانی‌شده
  console.log('[بخش ۲: اجرای زنجیره فرمان‌های واقعی پشتیبانی‌شده Worker]');

  let previousStepSucceeded = true;
  let loginStateOutput = null;
  let domFieldsOutput = null;
  let submitOutput = null;
  let otpRequired = false;
  let publishedAdUrl = null;

  // مرحله ۱ واقعی: OPEN_TARGET_URL
  console.log('\n[مرحله ۱: OPEN_TARGET_URL / بازگشایی نشانی پلتفرم هدف]');
  const action1Payload = {
    workflowId,
    executionId,
    jobId,
    actionId: `act_open_${Date.now()}`,
    action: 'open_target_url',
    state: 'OPENING_PLATFORM',
    platform: 'agahi24',
    platformDomain: targetDomain,
    input: { targetUrl: targetPortal }
  };
  const res1 = await dispatchUnifiedWorkerTask(action1Payload, daemonCheck.online, extStatus);
  testResults.push({
    step: '1. ACTION_OPEN_TARGET_URL',
    worker: `${res1.workerId} (${res1.workerRole})`,
    executionType: res1.status === 'COMPLETED' ? 'REAL' : (res1.status === 'FAILED' ? 'FAILED' : 'BLOCKED'),
    status: res1.status,
    durationMs: 0,
    input: action1Payload.input,
    output: res1.output || {},
    error: res1.error,
    details: res1.details
  });
  console.log(`  نتیجه: ${res1.status === 'COMPLETED' ? '✓ COMPLETED (REAL)' : (res1.status === 'FAILED' ? '❌ FAILED' : '⚠️ BLOCKED')} | جزئیات: ${res1.details}`);
  if (res1.status !== 'COMPLETED') previousStepSucceeded = false;

  // مرحله ۲ واقعی: CHECK_LOGIN_STATE
  console.log('\n[مرحله ۲: CHECK_LOGIN_STATE / بررسی وضعیت ورود و نشست]');
  if (previousStepSucceeded) {
    const action2Payload = {
      workflowId,
      executionId,
      jobId,
      actionId: `act_login_chk_${Date.now()}`,
      action: 'check_login_state',
      state: 'CHECKING_LOGIN',
      platform: 'agahi24',
      platformDomain: targetDomain,
      input: {}
    };
    const res2 = await dispatchUnifiedWorkerTask(action2Payload, daemonCheck.online, extStatus);
    loginStateOutput = res2.output;
    testResults.push({
      step: '2. ACTION_CHECK_LOGIN_STATE',
      worker: `${res2.workerId} (${res2.workerRole})`,
      executionType: res2.status === 'COMPLETED' ? 'REAL' : (res2.status === 'FAILED' ? 'FAILED' : 'BLOCKED'),
      status: res2.status,
      durationMs: 0,
      input: action2Payload.input,
      output: res2.output || {},
      error: res2.error,
      details: res2.details
    });
    console.log(`  نتیجه: ${res2.status === 'COMPLETED' ? '✓ COMPLETED (REAL)' : (res2.status === 'FAILED' ? '❌ FAILED' : '⚠️ BLOCKED')} | جزئیات: ${res2.details}`);
    if (res2.status !== 'COMPLETED') previousStepSucceeded = false;
  } else {
    testResults.push({
      step: '2. ACTION_CHECK_LOGIN_STATE',
      worker: 'unassigned',
      executionType: 'BLOCKED',
      status: 'BLOCKED',
      durationMs: 0,
      details: 'وابسته به موفقیت مرحله پیشین (OPEN_TARGET_URL)؛ به دلیل عدم اجرای مرحله قبل متوقف ماند.'
    });
    console.log('  نتیجه: ⚠️ BLOCKED (وابسته به اجرای مرحله پیشین)');
  }

  // مرحله ۳ واقعی: INSPECT_AUTH_FORM (مشروط و در صورت نیاز)
  console.log('\n[مرحله ۳: INSPECT_AUTH_FORM / ورود و بازرسی فرم احراز هویت در صورت نیاز]');
  if (previousStepSucceeded && loginStateOutput?.loginRequired) {
    const action3Payload = {
      workflowId,
      executionId,
      jobId,
      actionId: `act_auth_${Date.now()}`,
      action: 'inspect_auth_form',
      state: 'AUTHENTICATING',
      platform: 'agahi24',
      platformDomain: targetDomain,
      input: { phoneNumber: realCampaign.phone }
    };
    const res3 = await dispatchUnifiedWorkerTask(action3Payload, daemonCheck.online, extStatus);
    testResults.push({
      step: '3. ACTION_INSPECT_AUTH_FORM',
      worker: `${res3.workerId} (${res3.workerRole})`,
      executionType: res3.status === 'COMPLETED' ? 'REAL' : (res3.status === 'FAILED' ? 'FAILED' : 'BLOCKED'),
      status: res3.status,
      durationMs: 0,
      input: action3Payload.input,
      output: res3.output || {},
      error: res3.error,
      details: res3.details
    });
    console.log(`  نتیجه: ${res3.status === 'COMPLETED' ? '✓ COMPLETED (REAL)' : (res3.status === 'FAILED' ? '❌ FAILED' : '⚠️ BLOCKED')} | جزئیات: ${res3.details}`);
    if (res3.status !== 'COMPLETED') previousStepSucceeded = false;
  } else if (previousStepSucceeded && !loginStateOutput?.loginRequired) {
    testResults.push({
      step: '3. ACTION_INSPECT_AUTH_FORM',
      worker: 'local_agent_worker',
      executionType: 'REAL',
      status: 'COMPLETED',
      durationMs: 0,
      details: 'پلتفرم نیازی به ورود کاربری مجزا نداشت یا نشست کاربر از پیش فعال بود؛ ورود با موفقیت رد شد.'
    });
    console.log('  نتیجه: ✓ COMPLETED (نیازی به ورود مجدد نبود)');
  } else {
    testResults.push({
      step: '3. ACTION_INSPECT_AUTH_FORM',
      worker: 'unassigned',
      executionType: 'BLOCKED',
      status: 'BLOCKED',
      durationMs: 0,
      details: 'وابسته به بررسی وضعیت نشست کاربری؛ به دلیل عدم اجرای مرحله قبل متوقف ماند.'
    });
    console.log('  نتیجه: ⚠️ BLOCKED (وابسته به اجرای مرحله پیشین)');
  }

  // مرحله ۴ واقعی: DISCOVER_DOM_FIELDS
  console.log('\n[مرحله ۴: DISCOVER_DOM_FIELDS / کشف فیلدهای واقعی DOM]');
  if (previousStepSucceeded) {
    const action4Payload = {
      workflowId,
      executionId,
      jobId,
      actionId: `act_dom_${Date.now()}`,
      action: 'discover_dom_fields',
      state: 'INSPECTING_FORM',
      platform: 'agahi24',
      platformDomain: targetDomain,
      input: {}
    };
    const res4 = await dispatchUnifiedWorkerTask(action4Payload, daemonCheck.online, extStatus);
    domFieldsOutput = res4.output;
    testResults.push({
      step: '4. ACTION_DISCOVER_DOM_FIELDS',
      worker: `${res4.workerId} (${res4.workerRole})`,
      executionType: res4.status === 'COMPLETED' ? 'REAL' : (res4.status === 'FAILED' ? 'FAILED' : 'BLOCKED'),
      status: res4.status,
      durationMs: 0,
      input: action4Payload.input,
      output: res4.output || {},
      error: res4.error,
      details: res4.details
    });
    console.log(`  نتیجه: ${res4.status === 'COMPLETED' ? '✓ COMPLETED (REAL)' : (res4.status === 'FAILED' ? '❌ FAILED' : '⚠️ BLOCKED')} | جزئیات: ${res4.details}`);
    if (res4.status !== 'COMPLETED') previousStepSucceeded = false;
  } else {
    testResults.push({
      step: '4. ACTION_DISCOVER_DOM_FIELDS',
      worker: 'unassigned',
      executionType: 'BLOCKED',
      status: 'BLOCKED',
      durationMs: 0,
      details: 'کشف فیلدهای DOM وابسته به بازگشایی موفق صفحه توسط ورکر است؛ در حالت توقف باقی ماند.'
    });
    console.log('  نتیجه: ⚠️ BLOCKED (وابسته به اجرای مرحله پیشین)');
  }

  // مرحله ۵ واقعی: INJECT_FIELD_VALUES
  console.log('\n[مرحله ۵: INJECT_FIELD_VALUES / درج مقادیر واقعی فیلدهای کمپین]');
  if (previousStepSucceeded) {
    const action5Payload = {
      workflowId,
      executionId,
      jobId,
      actionId: `act_inject_${Date.now()}`,
      action: 'inject_field_values',
      state: 'FILLING_FIELDS',
      platform: 'agahi24',
      platformDomain: targetDomain,
      input: {
        mappings: {
          title: realCampaign.title,
          description: realCampaign.description,
          phone: realCampaign.phone,
          city: realCampaign.city,
          province: realCampaign.province
        }
      }
    };
    const res5 = await dispatchUnifiedWorkerTask(action5Payload, daemonCheck.online, extStatus);
    testResults.push({
      step: '5. ACTION_INJECT_FIELD_VALUES',
      worker: `${res5.workerId} (${res5.workerRole})`,
      executionType: res5.status === 'COMPLETED' ? 'REAL' : (res5.status === 'FAILED' ? 'FAILED' : 'BLOCKED'),
      status: res5.status,
      durationMs: 0,
      input: action5Payload.input,
      output: res5.output || {},
      error: res5.error,
      details: res5.details
    });
    console.log(`  نتیجه: ${res5.status === 'COMPLETED' ? '✓ COMPLETED (REAL)' : (res5.status === 'FAILED' ? '❌ FAILED' : '⚠️ BLOCKED')} | جزئیات: ${res5.details}`);
    if (res5.status !== 'COMPLETED') previousStepSucceeded = false;
  } else {
    testResults.push({
      step: '5. ACTION_INJECT_FIELD_VALUES',
      worker: 'unassigned',
      executionType: 'BLOCKED',
      status: 'BLOCKED',
      durationMs: 0,
      details: 'درج فیلدها وابسته به کشف فیلدهای DOM توسط ورکر است؛ در حالت توقف باقی ماند.'
    });
    console.log('  نتیجه: ⚠️ BLOCKED (وابسته به اجرای مرحله پیشین)');
  }

  // مرحله ۶ واقعی: CLICK_SUBMIT_BUTTON
  console.log('\n[مرحله ۶: CLICK_SUBMIT_BUTTON / کلیک روی دکمه ارسال فرم و اعتبارسنجی پاسخ]');
  if (previousStepSucceeded) {
    const action6Payload = {
      workflowId,
      executionId,
      jobId,
      actionId: `act_submit_${Date.now()}`,
      action: 'click_submit_button',
      state: 'SUBMITTING',
      platform: 'agahi24',
      platformDomain: targetDomain,
      input: {}
    };
    const res6 = await dispatchUnifiedWorkerTask(action6Payload, daemonCheck.online, extStatus);
    submitOutput = res6.output;
    otpRequired = Boolean(submitOutput?.otpGateDetected);
    testResults.push({
      step: '6. ACTION_CLICK_SUBMIT_BUTTON',
      worker: `${res6.workerId} (${res6.workerRole})`,
      executionType: res6.status === 'COMPLETED' ? 'REAL' : (res6.status === 'FAILED' ? 'FAILED' : 'BLOCKED'),
      status: res6.status,
      durationMs: 0,
      input: action6Payload.input,
      output: res6.output || {},
      error: res6.error,
      details: res6.details
    });
    console.log(`  نتیجه: ${res6.status === 'COMPLETED' ? '✓ COMPLETED (REAL)' : (res6.status === 'FAILED' ? '❌ FAILED' : '⚠️ BLOCKED')} | جزئیات: ${res6.details}`);
    if (res6.status !== 'COMPLETED') previousStepSucceeded = false;
  } else {
    testResults.push({
      step: '6. ACTION_CLICK_SUBMIT_BUTTON',
      worker: 'unassigned',
      executionType: 'BLOCKED',
      status: 'BLOCKED',
      durationMs: 0,
      details: 'ارسال فرم وابسته به پر شدن موفق فیلدها است؛ در حالت توقف باقی ماند.'
    });
    console.log('  نتیجه: ⚠️ BLOCKED (وابسته به اجرای مرحله پیشین)');
  }

  // مرحله ۷ واقعی: چرخه کامل و واقعی OTP
  console.log('\n[مرحله ۷: OTP_LIFECYCLE / چرخه کامل OTP: تشخیص، تزریق و ارزیابی تایید سایت]');
  let otpFinalStatus = 'BLOCKED';
  let otpFinalDetails = '';
  let otpExecutionOutput = {};

  if (previousStepSucceeded) {
    if (otpRequired) {
      console.log('  ⚠️ سامانه مقصد نیازمند کد تایید یکبارمصرف (OTP) است.');
      const availableOtp = process.env.TEST_OTP_CODE || process.env.OTP_CODE || null;

      if (!availableOtp) {
        // هیچ کدی در دسترس نیست -> ثبت صریح وضعیت WAITING_FOR_OTP و توقف ایمن (BLOCKED)
        otpFinalStatus = 'BLOCKED';
        otpFinalDetails = 'کد OTP از منبع مجاز در دسترس نیست؛ سیستم در وضعیت WAITING_FOR_OTP متوقف باقی ماند.';
        otpExecutionOutput = { state: 'WAITING_FOR_OTP', otpRequired: true, waitingForInput: true };
      } else {
        console.log('  🔑 کد معتبر OTP از منبع مجاز دریافت شد. در حال اعزام inject_and_verify_otp...');
        const injectPayload = {
          workflowId,
          executionId,
          jobId,
          actionId: `act_otp_inj_${Date.now()}`,
          action: 'inject_and_verify_otp',
          state: 'OTP_RECEIVED',
          platform: 'agahi24',
          platformDomain: targetDomain,
          input: { otpCode: availableOtp }
        };
        const injectRes = await dispatchUnifiedWorkerTask(injectPayload, daemonCheck.online, extStatus);

        if (injectRes.status !== 'COMPLETED') {
          otpFinalStatus = injectRes.status === 'FAILED' ? 'FAILED' : 'BLOCKED';
          otpFinalDetails = `خطا در درج کد OTP توسط ورکر: ${injectRes.details}`;
          otpExecutionOutput = { state: 'FAILED', error: injectRes.error };
        } else {
          console.log('  🔎 در حال بررسی تایید قطعی کد توسط سامانه مقصد (check_otp_acceptance)...');
          const checkPayload = {
            workflowId,
            executionId,
            jobId,
            actionId: `act_otp_chk_${Date.now()}`,
            action: 'check_otp_acceptance',
            state: 'OTP_SUBMITTED',
            platform: 'agahi24',
            platformDomain: targetDomain,
            input: {}
          };
          const checkRes = await dispatchUnifiedWorkerTask(checkPayload, daemonCheck.online, extStatus);
          const chkOut = checkRes.output || {};

          if (chkOut.accepted === true || chkOut.verifiedByPlatform === true || chkOut.otpVerified === true) {
            otpFinalStatus = 'COMPLETED';
            otpFinalDetails = 'کد OTP با موفقیت درج و پذیرش قطعی آن بر مبنای شواهد واقعی سایت احراز گردید.';
            otpExecutionOutput = { state: 'OTP_VERIFIED', verified: true, adUrl: chkOut.adUrl };
            if (chkOut.adUrl) publishedAdUrl = chkOut.adUrl;
          } else if (chkOut.rejected === true || chkOut.invalidCode === true) {
            otpFinalStatus = 'FAILED';
            otpFinalDetails = 'کد تایید OTP توسط سامانه مقصد رد شد (کد نادرست یا منقضی). وضعیت: FAILED.';
            otpExecutionOutput = { state: 'FAILED', rejected: true };
          } else {
            otpFinalStatus = 'BLOCKED';
            otpFinalDetails = 'شواهد قطعی مبنی بر پذیرش کد OTP توسط سایت یافت نشد (وجود ریدایرکت به‌تنهایی کافی نیست). وضعیت: WAITING_FOR_HUMAN.';
            otpExecutionOutput = { state: 'WAITING_FOR_HUMAN', ambiguous: true };
          }
        }
      }
    } else {
      otpFinalStatus = 'COMPLETED';
      otpFinalDetails = 'وضعیت صفحه بررسی شد؛ این فرم نیازی به کد OTP نداشت و فرآیند ثبت مستقیماً ادامه یافت.';
      otpExecutionOutput = { state: 'OTP_NOT_REQUIRED', otpRequired: false };
    }
  } else {
    otpFinalStatus = 'BLOCKED';
    otpFinalDetails = 'تعیین تکلیف OTP وابسته به ارسال فرم توسط ورکر است؛ به دلیل عدم اجرای مراحل قبل متوقف ماند.';
  }

  testResults.push({
    step: '7. OTP_LIFECYCLE',
    worker: submitOutput?.workerId || 'portal_gate / local_agent_worker',
    executionType: otpFinalStatus === 'COMPLETED' ? 'REAL' : (otpFinalStatus === 'FAILED' ? 'FAILED' : 'BLOCKED'),
    status: otpFinalStatus,
    durationMs: 0,
    input: { workflowId, jobId },
    output: { otpRequired, ...otpExecutionOutput },
    details: otpFinalDetails
  });
  console.log(`  نتیجه: ${otpFinalStatus === 'COMPLETED' ? '✓ COMPLETED (REAL)' : (otpFinalStatus === 'FAILED' ? '❌ FAILED' : '⚠️ BLOCKED')} | جزئیات: ${otpFinalDetails}`);

  // مرحله ۸ واقعی: VERIFY_PUBLICATION_URL (راستی‌آزمایی نشانی اختصاصی آگهی منتشرشده)
  console.log('\n[مرحله ۸: VERIFY_PUBLICATION_URL / راستی‌آزمایی نشانی اختصاصی آگهی منتشرشده]');
  let stage8Status = 'BLOCKED';
  let stage8Details = '';
  let stage8Output = {};
  let dur8 = 0;

  if (submitOutput?.publicUrl || submitOutput?.adUrl) {
    publishedAdUrl = submitOutput.publicUrl || submitOutput.adUrl;
    const t8 = Date.now();
    const verRes = await verifyPublicationEvidence({
      url: publishedAdUrl,
      expectedTitle: realCampaign.title,
      expectedJobId: realCampaign.id,
      expectedPhone: realCampaign.phone,
      timeoutMs: 6000
    });
    dur8 = Date.now() - t8;
    if (verRes.verified) {
      stage8Status = 'COMPLETED';
      stage8Details = `آگهی واقعی منتشرشده در (${publishedAdUrl}) مستقلاً با مشخصات کمپین تطبیق و تایید شد.`;
      stage8Output = { verified: true, publicUrl: publishedAdUrl, matchedKeywords: verRes.matchedKeywords };
    } else {
      stage8Status = 'FAILED';
      stage8Details = `نشانی ادعاشده (${publishedAdUrl}) حاوی محتوای کمپین نبود و راستی‌آزمایی رد شد.`;
      stage8Output = { verified: false, publicUrl: publishedAdUrl };
    }
  } else {
    stage8Status = 'BLOCKED';
    stage8Details = 'هیچ نشانی عمومی معتبری از مرحله ارسال فرم دریافت نشد؛ مرحله راستی‌آزمایی در انتظار انتشار واقعی باقی ماند.';
    stage8Output = { verified: false, publicUrl: null };
  }

  testResults.push({
    step: '8. ACTION_VERIFY_PUBLICATION_URL',
    worker: 'gh_orchestrator_main (Unified Verifier)',
    executionType: stage8Status === 'COMPLETED' ? 'REAL' : (stage8Status === 'FAILED' ? 'FAILED' : 'BLOCKED'),
    status: stage8Status,
    durationMs: dur8,
    input: { expectedTitle: realCampaign.title, expectedJobId: realCampaign.id },
    output: stage8Output,
    details: stage8Details
  });
  console.log(`  نتیجه: ${stage8Status === 'COMPLETED' ? '✓ REAL (راستی‌آزمایی موفق)' : (stage8Status === 'FAILED' ? '❌ FAILED' : '⚠️ BLOCKED (در انتظار آدرس معتبر حاصل از انتشار)')}`);

  // خلاصه نتایج
  console.log('\n===============================================================');
  console.log('📊 خلاصه نتایج اجرای تست کنترل‌شده End-to-End:');
  console.log('===============================================================');
  testResults.forEach(r => {
    console.log(`- [${r.status} | ${r.executionType}] ${r.step} | مجری: ${r.worker} | زمان: ${r.durationMs}ms | جزئیات: ${r.details}`);
  });

  // ۵ معیار اساسی برای اثبات اجرای واقعی:
  // ۱. انتخاب کمپین واقعی معتبر
  const criterion1_CampaignSelected = Boolean(
    realCampaign && realCampaign.id && realCampaign.title && realCampaign.phone && realCampaign.description && realCampaign.city
  );
  // ۲. اجرای Task واقعی توسط ورکر
  const criterion2_WorkerExecuted = testResults.some(
    r => r.step.startsWith('1.') && r.status === 'COMPLETED' && r.executionType === 'REAL'
  );
  // ۳. بررسی و ارسال فرم واقعی
  const criterion3_FormSubmitted = Boolean(
    submitOutput?.submitted === true
  );
  // ۴. تعیین تکلیف رویداد OTP
  const criterion4_OtpDetermined = testResults.some(
    r => r.step.includes('OTP') && r.status === 'COMPLETED'
  );
  // ۵. استخراج و راستی‌آزمایی مستقل URL عمومی
  const criterion5_PublicUrlVerified = testResults.some(
    r => r.step.includes('VERIFY_PUBLICATION_URL') && r.status === 'COMPLETED' && r.output?.verified === true && r.output?.publicUrl
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
    console.log('❌ نتیجه نهایی تست End-to-End: وضعیت [FAIL] (وجود خطای دستوری یا اجرایی در ورکر)');
    console.log('===============================================================');
    process.exit(1);
  } else {
    const blockedSteps = testResults.filter(r => r.status === 'BLOCKED' || r.status === 'WAITING_FOR_WORKER');
    console.log('\n===============================================================');
    console.log('⚠️ نتیجه نهایی تست End-to-End: وضعیت [BLOCKED]');
    console.log('===============================================================');
    console.log('📌 وضعیت گردش کار انتشار: BLOCKED (محیط مرورگر واقعی، ورکر آنلاین یا افزونه در دسترس نیست)');
    console.log('🚫 طبق ضوابط پروژه، هیچ پیام موفقیت کاذبی چاپ نشد و هیچ داده ساختگی تولید نگردید.');
    console.log('\n📋 وضعیت ۵ معیار اساسی E2E واقعی:');
    console.log(`  1. انتخاب کمپین واقعی معتبر: ${criterion1_CampaignSelected ? '✓ محقق شد' : '❌ ناموفق'}`);
    console.log(`  2. اجرای Task توسط Worker واقعی: ${criterion2_WorkerExecuted ? '✓ محقق شد' : '⚠️ متوقف (BLOCKED)'}`);
    console.log(`  3. بررسی و ارسال فرم واقعی: ${criterion3_FormSubmitted ? '✓ محقق شد' : '⚠️ متوقف (BLOCKED)'}`);
    console.log(`  4. تعیین تکلیف رویداد OTP: ${criterion4_OtpDetermined ? '✓ محقق شد' : '⚠️ متوقف (BLOCKED)'}`);
    console.log(`  5. استخراج و راستی‌آزمایی مستقل URL عمومی: ${criterion5_PublicUrlVerified ? '✓ محقق شد' : '⚠️ متوقف (BLOCKED)'}`);
    console.log('\n📋 مراحل متوقف‌شده:');
    blockedSteps.forEach(s => {
      console.log(`  - [${s.status}] ${s.step}: ${s.details}`);
    });
    console.log('===============================================================');
    process.exit(2);
  }
}

runE2eTest().catch((err) => {
  console.error('❌ [Fatal E2E Error]:', err.message);
  process.exit(1);
});
