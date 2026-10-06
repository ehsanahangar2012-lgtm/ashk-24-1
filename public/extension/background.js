/**
 * ASHK 24 Autonomous Worker & Session Synchronizer - Background Service Worker
 * Version: 5.8.3
 *
 * Capabilities:
 * 1. Persistent Autonomous Background Worker Node (Always connected to cPanel API).
 * 2. Real-time Passive Cookie & Token Harvester for 40+ Iranian advertising and business portals.
 * 3. Autonomous Queue Engine for automated multi-portal registration and session verification.
 * 4. Offline Resilient Queue (flushes harvested credentials when internet/cPanel reconnects).
 * 5. Instant Bidirectional Bridge with ASHK 24 Web App and cPanel Server.
 */

const EXT_VERSION = (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version) || '5.8.3';
const DEFAULT_ORCHESTRATOR = "http://localhost:3000";

const TARGET_DOMAINS = [
  'divar.ir', 'sheypoor.com', 'niazpardaz.com', 'iran-tejarat.com', 'agahicenter.com',
  'locopoc.com', 'niazerooz.com', 'istgah.com', 'payam-hamrah.ir', 'rahnama.com',
  'bazarha.ir', 'fooladbalad.com', 'anboh.com', 'karshenasan.com', 'postgah.com',
  'shahr24.com', 'agahionline.com', 'niazestan.com', 'parset.com', 'payamresan.ir',
  'sodagaran.com', 'takro.net', 'soodiran.com', 'sakhtemoon.com', 'bama.ir',
  'parscenter.com', 'payamsara.com', 'agahi24.com', 'niazroo.com', 'agahinama.com',
  'dehkade.com', 'payameavval.com', 'iranianclass.com', 'novinagahi.com', 'tablighkar.com'
];

let workerState = {
  isWorkerEnabled: true,
  workerId: 'ashk24_worker_' + Math.random().toString(36).substring(2, 10),
  isRunning: false,
  isPaused: false,
  currentIndex: 0,
  targets: [],
  orchestratorUrl: DEFAULT_ORCHESTRATOR,
  lastHeartbeatTime: null,
  syncedSessionsCount: 0,
  offlineQueue: [],
  credentials: {
    phone: "09153108763",
    email: "ashkghalam@gmail.com",
    username: "ashkghalam",
    password: "AshkPassword!2026",
    fullName: "سامانه اشک ۲۴"
  },
  activeTabId: null,
  activeTarget: null
};

// -------------------------------------------------------------
// Initialization & Storage Management
// -------------------------------------------------------------
chrome.runtime.onStartup.addListener(initWorker);
chrome.runtime.onInstalled.addListener(initWorker);

function initWorker() {
  chrome.storage.local.get([
    'ashk_worker_state',
    'ashk_harvest_credentials',
    'ashk_orchestrator_url',
    'ashk_worker_offline_queue',
    'ashk_worker_id'
  ], (result) => {
    if (result.ashk_worker_id) {
      workerState.workerId = result.ashk_worker_id;
    } else {
      chrome.storage.local.set({ ashk_worker_id: workerState.workerId });
    }

    if (result.ashk_orchestrator_url) {
      workerState.orchestratorUrl = result.ashk_orchestrator_url;
    }
    if (result.ashk_harvest_credentials) {
      workerState.credentials = { ...workerState.credentials, ...result.ashk_harvest_credentials };
    }
    if (result.ashk_worker_offline_queue && Array.isArray(result.ashk_worker_offline_queue)) {
      workerState.offlineQueue = result.ashk_worker_offline_queue;
    }
    if (result.ashk_worker_state) {
      const saved = result.ashk_worker_state;
      workerState.isWorkerEnabled = saved.isWorkerEnabled !== false;
      workerState.targets = saved.targets || [];
      workerState.currentIndex = saved.currentIndex || 0;
      workerState.syncedSessionsCount = saved.syncedSessionsCount || 0;
      workerState.isRunning = false;
    }

    setupAlarms();
    executeHeartbeat();
  });
}

function setupAlarms() {
  try {
    chrome.alarms.create('ashk_worker_heartbeat', { periodInMinutes: 1 });
    chrome.alarms.create('ashk_queue_poll', { periodInMinutes: 3 });
  } catch (e) {
    console.warn('[ASHK Alarms Setup]', e);
  }
}

function saveWorkerState() {
  chrome.storage.local.set({
    ashk_worker_state: {
      isWorkerEnabled: workerState.isWorkerEnabled,
      targets: workerState.targets,
      currentIndex: workerState.currentIndex,
      isRunning: workerState.isRunning,
      isPaused: workerState.isPaused,
      activeTarget: workerState.activeTarget,
      syncedSessionsCount: workerState.syncedSessionsCount,
      lastHeartbeatTime: workerState.lastHeartbeatTime
    },
    ashk_worker_offline_queue: workerState.offlineQueue,
    ashk_harvest_credentials: workerState.credentials,
    ashk_orchestrator_url: workerState.orchestratorUrl
  });
}

// -------------------------------------------------------------
// Persistent Heartbeat & Autonomous Worker Node Loop
// -------------------------------------------------------------
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'ashk_worker_heartbeat') {
    executeHeartbeat();
  } else if (alarm.name === 'ashk_queue_poll') {
    pollOrchestratorTasks();
  }
});

async function executeHeartbeat() {
  if (!workerState.isWorkerEnabled) return;

  const base = (workerState.orchestratorUrl || DEFAULT_ORCHESTRATOR).replace(/\/$/, '');
  const candidateUrls = [
    `${base}/cpanel-backend/api/index.php/orchestrator/heartbeat`,
    `${base}/api/index.php/orchestrator/heartbeat`,
    `${base}/cpanel-backend/api/index.php?route=orchestrator/heartbeat`,
    `${base}/api/index.php?route=orchestrator/heartbeat`
  ];

  try {
    const payload = {
      agentId: workerState.workerId,
      channelType: 'extension',
      browser: navigator.userAgent || 'Chrome Browser Autonomous Extension',
      activeSessionsCount: workerState.syncedSessionsCount,
      queueStatus: workerState.isRunning ? 'running' : 'idle',
      isUserActive: true,
      timestamp: new Date().toISOString()
    };

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => null);

        if (res && res.ok) {
          workerState.lastHeartbeatTime = new Date().toLocaleTimeString('fa-IR');
          saveWorkerState();

          if (workerState.offlineQueue.length > 0) {
            flushOfflineQueue();
          }
          break;
        }
      } catch (err) {}
    }

    // بلافاصله چک کردن کارهای ناتمام در زمان آنلاین بودن کاربر
    pollOrchestratorTasks();
  } catch (err) {
    // Quietly handle network isolation
  }
}

let detectedApiPrefix = null;

async function fetchCpanelApi(route, options = {}) {
  const base = (workerState.orchestratorUrl || DEFAULT_ORCHESTRATOR).replace(/\/$/, '');
  const cleanRoute = route.replace(/^\//, '');

  const prefixes = detectedApiPrefix
    ? [detectedApiPrefix, '/cpanel-backend/api/index.php', '/api/index.php']
    : ['/cpanel-backend/api/index.php', '/api/index.php'];

  for (const prefix of prefixes) {
    const urlsToTry = [
      `${base}${prefix}/${cleanRoute}`,
      `${base}${prefix}?route=${cleanRoute}`
    ];

    for (const url of urlsToTry) {
      try {
        const res = await fetch(url, options);
        if (res && res.status !== 404) {
          detectedApiPrefix = prefix;
          return res;
        }
      } catch (e) {}
    }
  }

  return null;
}

let isAutoJobRunning = false;

async function pollOrchestratorTasks() {
  if (!workerState.isWorkerEnabled || isAutoJobRunning) return;

  try {
    const res = await fetchCpanelApi('orchestrator/claim-balanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'extension',
        agentId: workerState.workerId
      })
    });

    if (res && res.ok) {
      const data = await res.json();
      if (data.success && data.job) {
        console.log(`[ASHK Orchestrator] Claimed balanced job for extension: ${data.job.id} (${data.job.platformName})`);
        isAutoJobRunning = true;
        try {
          await executeDirectPublicationJob(data.job, {
            title: data.job.campaignTitle,
            content: data.job.campaignContent
          }, {
            phoneNumber: data.job.contactPhone,
            contactPerson: data.job.contactPerson,
            email: data.job.contactEmail
          });
        } finally {
          setTimeout(() => { isAutoJobRunning = false; }, 8000);
        }
      }
    }
  } catch (e) {
    isAutoJobRunning = false;
  }
}

async function flushOfflineQueue() {
  if (workerState.offlineQueue.length === 0) return;

  try {
    const toFlush = [...workerState.offlineQueue];
    const res = await fetchCpanelApi('sessions/sync-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions: toFlush })
    });

    if (res.ok) {
      console.log(`[ASHK Worker] Successfully flushed ${toFlush.length} queued offline sessions.`);
      workerState.offlineQueue = [];
      saveWorkerState();
    }
  } catch (e) {}
}

// -------------------------------------------------------------
// Autonomous Passive Cookie Sniffer (شکار خودکار و بی‌درنگ سشن)
// -------------------------------------------------------------
let cookieDebounceTimers = {};

chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.removed) return;
  const cookie = changeInfo.cookie;
  if (!cookie || !cookie.domain) return;

  const domain = cookie.domain.replace(/^\./, '').toLowerCase();
  const matchedTarget = TARGET_DOMAINS.find(td => domain.includes(td));
  if (!matchedTarget) return;

  if (cookieDebounceTimers[matchedTarget]) {
    clearTimeout(cookieDebounceTimers[matchedTarget]);
  }

  cookieDebounceTimers[matchedTarget] = setTimeout(async () => {
    delete cookieDebounceTimers[matchedTarget];
    await passivelyHarvestDomain(matchedTarget);
  }, 1500);
});

async function passivelyHarvestDomain(domain) {
  try {
    const cookies = await chrome.cookies.getAll({ domain });
    if (!cookies || cookies.length === 0) return;

    const cookieMap = {};
    let hasAuthToken = false;
    const sessionKeywords = ['sess', 'token', 'auth', 'user', 'jwt', 'remember', 'phpsessid', 'ci_', 'laravel', 'identity', 'login'];

    cookies.forEach(c => {
      cookieMap[c.name] = c.value;
      if (sessionKeywords.some(kw => c.name.toLowerCase().includes(kw))) {
        hasAuthToken = true;
      }
    });

    if (hasAuthToken) {
      const payload = {
        type: 'ASHK_SESSION_HARVESTED',
        domain: domain,
        persianName: domain,
        sessionCookies: cookieMap,
        sessionToken: cookieMap['token'] || cookieMap['jwt'] || cookieMap['PHPSESSID'] || null,
        accountUsername: workerState.credentials.username || workerState.credentials.phone,
        harvestedAt: new Date().toISOString()
      };

      workerState.syncedSessionsCount++;
      saveWorkerState();

      // 1. Broadcast immediately to any open Ashk24 web app tab
      broadcastToAshkApp(payload);

      // 2. Transmit directly to cPanel database
      const synced = await syncSessionToCpanelServer({ domain }, cookieMap, payload.sessionToken);
      if (!synced) {
        // Save to offline queue if server is currently unreachable
        workerState.offlineQueue.push(payload);
        saveWorkerState();
      }
    }
  } catch (err) {
    console.warn('[ASHK Passive Harvester Warning]', err);
  }
}

async function syncSessionToCpanelServer(target, cookies, token) {
  const base = (workerState.orchestratorUrl || DEFAULT_ORCHESTRATOR).replace(/\/$/, '');
  const endpoints = [
    `${base}/cpanel-backend/api/index.php/sessions/harvest`,
    `${base}/api/sessions/harvest`,
    `${base}/cpanel-backend/api/index.php/sessions/update`
  ];

  const payload = {
    platformId: target.platformId || null,
    domain: target.domain,
    persianName: target.persianName || target.domain,
    sessionCookies: cookies,
    sessionToken: token,
    accountUsername: workerState.credentials.username || workerState.credentials.phone,
    sessionStatus: 'authenticated',
    lastTested: new Date().toISOString()
  };

  for (const url of endpoints) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        return true;
      }
    } catch (e) {}
  }
  return false;
}

// -------------------------------------------------------------
// Message Handling: Popup & Web App Bridge
// -------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleIncomingMessage(message, sender, sendResponse);
  return true;
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  handleIncomingMessage(message, sender, sendResponse);
  return true;
});

async function handleIncomingMessage(message, sender, sendResponse) {
  if (!message) return;
  const type = message.type || message.action;

  switch (type) {
    case 'ASHK_PING':
    case 'PING':
      if (message.orchestratorUrl) {
        workerState.orchestratorUrl = message.orchestratorUrl;
        saveWorkerState();
      }
      sendResponse({
        success: true,
        version: EXT_VERSION,
        name: "سامانه یکپارچه اشک ۲۴",
        isWorkerEnabled: workerState.isWorkerEnabled,
        status: workerState.isRunning ? 'running' : 'idle',
        currentIndex: workerState.currentIndex,
        totalTargets: workerState.targets.length,
        syncedSessionsCount: workerState.syncedSessionsCount,
        lastHeartbeatTime: workerState.lastHeartbeatTime,
        orchestratorUrl: workerState.orchestratorUrl
      });
      break;

    case 'ASHK_PUBLISH_JOB_DIRECT':
    case 'ASHK_EXECUTE_AD_PUBLICATION':
      executeDirectPublicationJob(message.job, message.campaign, message.company);
      sendResponse({ success: true, message: 'دستور انتشار مستقیم آگهی توسط افزونه دریافت و فعال گردید.' });
      break;

    case 'ASHK_INJECT_OTP_CODE':
      // Forward to active tab content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'ASHK_INJECT_OTP_CODE',
            code: message.code || message.otpCode
          });
        }
      });
      sendResponse({ success: true, message: 'کد OTP به تب فعال ارسال گردید.' });
      break;

    case 'ASHK_AD_PUBLISHED_SUCCESS':
      handleAdPublishedSuccess(message);
      sendResponse({ success: true, message: 'گزارش ثبت موفق آگهی به سرور سی‌پنل منتقل شد.' });
      break;

    case 'ASHK_TOGGLE_WORKER':
      workerState.isWorkerEnabled = !!message.enabled;
      saveWorkerState();
      if (workerState.isWorkerEnabled) {
        executeHeartbeat();
      }
      sendResponse({ success: true, isWorkerEnabled: workerState.isWorkerEnabled });
      break;

    case 'ASHK_SET_ORCHESTRATOR':
      if (message.orchestratorUrl) {
        workerState.orchestratorUrl = message.orchestratorUrl;
        saveWorkerState();
        executeHeartbeat();
      }
      sendResponse({ success: true, orchestratorUrl: workerState.orchestratorUrl });
      break;

    case 'ASHK_HARVEST_CURRENT_TAB':
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.url) {
          const urlObj = new URL(activeTab.url);
          const domain = urlObj.hostname.replace(/^www\./, '');
          await passivelyHarvestDomain(domain);
          sendResponse({ success: true, domain, message: `سشن دامنه ${domain} با موفقیت استخراج و ارسال شد.` });
        } else {
          sendResponse({ success: false, error: 'تب فعلی یافت نشد.' });
        }
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
      break;

    case 'ASHK_START_HARVEST_QUEUE':
      const targets = Array.isArray(message.targets) ? message.targets : [];
      if (message.credentials) {
        workerState.credentials = { ...workerState.credentials, ...message.credentials };
      }
      startHarvestQueue(targets);
      sendResponse({ success: true, message: `صف ثبت‌نام و شکار سشن با ${targets.length} پلتفرم فعال شد.` });
      break;

    case 'ASHK_PAUSE_QUEUE':
      workerState.isPaused = true;
      saveWorkerState();
      sendResponse({ success: true, isPaused: true });
      break;

    case 'ASHK_RESUME_QUEUE':
      workerState.isPaused = false;
      saveWorkerState();
      if (workerState.isRunning) {
        processNextTarget();
      }
      sendResponse({ success: true, isPaused: false });
      break;

    case 'ASHK_STOP_QUEUE':
      stopHarvestQueue();
      sendResponse({ success: true, isRunning: false });
      break;

    case 'ASHK_GET_HARVEST_STATUS':
      sendResponse({
        version: EXT_VERSION,
        isWorkerEnabled: workerState.isWorkerEnabled,
        isRunning: workerState.isRunning,
        isPaused: workerState.isPaused,
        currentIndex: workerState.currentIndex,
        totalTargets: workerState.targets.length,
        activeTarget: workerState.activeTarget,
        syncedSessionsCount: workerState.syncedSessionsCount,
        lastHeartbeatTime: workerState.lastHeartbeatTime,
        orchestratorUrl: workerState.orchestratorUrl
      });
      break;

    case 'ASHK_OTP_RESOLVED':
      handleUserResolvedOtp(message.otpCode);
      sendResponse({ success: true });
      break;

    case 'UPDATE_ORCHESTRATOR_URL':
      if (message.orchestratorUrl || message.url) {
        workerState.orchestratorUrl = message.orchestratorUrl || message.url;
        saveWorkerState();
        executeHeartbeat();
      }
      sendResponse({ success: true, orchestratorUrl: workerState.orchestratorUrl });
      break;

    case 'ASHK_TRIGGER_REAL_OTP':
      triggerRealOtpForPlatform(message.domain, message.phone || '09153108763');
      sendResponse({ success: true, message: 'تب اختصاصی ارسال پیامک در پلتفرم باز شد.' });
      break;

    default:
      sendResponse({ success: true, received: true });
      break;
  }
}

// -------------------------------------------------------------
// Real In-Browser OTP Request Trigger (ارسال پیامک واقعی از سایت مقصد)
// -------------------------------------------------------------
async function triggerRealOtpForPlatform(rawDomain, phone) {
  const domain = (rawDomain || 'niazpardaz.com').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  let loginUrl = `https://${domain}`;
  if (domain.includes('niazpardaz')) loginUrl = 'https://www.niazpardaz.com/user/login?ashk_action=trigger_otp';
  else if (domain.includes('istgah')) loginUrl = 'https://www.istgah.com/user/?ashk_action=trigger_otp';
  else if (domain.includes('agahi24')) loginUrl = 'https://agahi24.com/login?ashk_action=trigger_otp';
  else if (domain.includes('baskool')) loginUrl = 'https://www.baskool.com/login?ashk_action=trigger_otp';
  else if (domain.includes('sheypoor')) loginUrl = 'https://www.sheypoor.com/session?ashk_action=trigger_otp';
  else if (domain.includes('divar')) loginUrl = 'https://divar.ir/my-divar/my-posts?ashk_action=trigger_otp';
  else if (domain.includes('payamsara')) loginUrl = 'https://www.payamsara.com/login.html?ashk_action=trigger_otp';
  else if (domain.includes('iran-tejarat')) loginUrl = 'https://iran-tejarat.com/login.php?ashk_action=trigger_otp';
  else if (domain.includes('shahrema')) loginUrl = 'https://shahrema.com/login?ashk_action=trigger_otp';
  else loginUrl = `https://${domain}?ashk_action=trigger_otp`;

  try {
    const tab = await chrome.tabs.create({ url: loginUrl, active: true });
    const triggerMsg = () => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'ASHK_TRIGGER_REAL_OTP',
        phoneNumber: phone
      }, () => {
        if (chrome.runtime.lastError) {}
      });
    };
    setTimeout(triggerMsg, 2000);
    setTimeout(triggerMsg, 4000);
  } catch (e) {
    console.error('[ASHK OTP Trigger Tab Error]', e);
  }
}

// -------------------------------------------------------------
// Direct Ad Publication Runner via Chrome Tab
// -------------------------------------------------------------
async function executeDirectPublicationJob(job, campaign, company) {
  if (!job) return;
  const domain = (job.platformDomain || job.domain || 'niazpardaz.com').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  
  let targetUrl = `https://${domain}`;
  if (domain.includes('niazpardaz')) {
    targetUrl = 'https://niazpardaz.com/user/ads/create';
  } else if (domain.includes('istgah')) {
    targetUrl = 'https://www.istgah.com/post/new';
  } else if (domain.includes('agahi24')) {
    targetUrl = 'https://agahi24.com/post/new';
  } else if (domain.includes('sheypoor')) {
    targetUrl = 'https://www.sheypoor.com/post-ad';
  } else if (domain.includes('divar')) {
    targetUrl = 'https://divar.ir/new';
  } else if (domain.includes('payamsara')) {
    targetUrl = 'https://www.payamsara.com/';
  } else if (domain.includes('iran-tejarat')) {
    targetUrl = 'https://iran-tejarat.com/';
  } else if (domain.includes('niazerooz')) {
    targetUrl = 'https://www.niazerooz.com/';
  } else if (domain.includes('locopoc')) {
    targetUrl = 'https://www.locopoc.com/';
  } else if (domain.includes('parscenter')) {
    targetUrl = 'https://parscenter.com/';
  } else if (domain.includes('shahr24')) {
    targetUrl = 'https://shahr24.com/';
  } else if (domain.includes('agahicenter')) {
    targetUrl = 'https://agahicenter.com/';
  } else if (domain.includes('bazarha')) {
    targetUrl = 'https://bazarha.ir/';
  } else if (domain.includes('postgah')) {
    targetUrl = 'https://postgah.com/';
  } else if (domain.includes('rahnama')) {
    targetUrl = 'https://rahnama.com/';
  } else if (domain.includes('takro')) {
    targetUrl = 'https://takro.net/';
  } else if (domain.includes('fooladbalad')) {
    targetUrl = 'https://fooladbalad.com/';
  } else if (domain.includes('payam-hamrah')) {
    targetUrl = 'https://payam-hamrah.ir/';
  }

  try {
    const tab = await chrome.tabs.create({
      url: targetUrl,
      active: true
    });

    const sendPublicationMessage = () => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'ASHK_EXECUTE_AD_PUBLICATION',
        job,
        campaign,
        company
      }, () => {
        if (chrome.runtime.lastError) {}
      });
    };

    const onUpdated = (tabId, changeInfo) => {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        setTimeout(sendPublicationMessage, 2000);
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);

    // ارسال‌های زمان‌بندی‌شده مطمئن جهت اطمینان از تزریق اسکریپت
    setTimeout(sendPublicationMessage, 3000);
    setTimeout(sendPublicationMessage, 6000);
    setTimeout(sendPublicationMessage, 10000);

  } catch (err) {
    console.error('[ASHK Direct Publish Error]', err);
  }
}

async function handleAdPublishedSuccess(data) {
  const payload = {
    jobId: data.jobId,
    status: 'published',
    progressPercent: 100,
    adUrl: data.adUrl,
    trackingCode: data.trackingCode,
    publishedAt: new Date().toISOString(),
    currentStep: 'آگهی با موفقیت در پلتفرم منتشر و تایید شد.',
    logMessage: `انتشار قطعی توسط افزونه کروم انجام شد. لینک آگهی: ${data.adUrl}`,
    logStatus: 'success'
  };

  try {
    await fetchCpanelApi('jobs/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer secret_9153108763'
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.warn('[ASHK Report Success Error]', e);
  }

  broadcastToAshkApp({
    type: 'ASHK_JOB_COMPLETED',
    jobId: data.jobId,
    adUrl: data.adUrl,
    trackingCode: data.trackingCode
  });
}

// -------------------------------------------------------------
// Autonomous Queue Processor Engine
// -------------------------------------------------------------
function startHarvestQueue(targets) {
  if (targets && targets.length > 0) {
    workerState.targets = targets;
  }
  if (workerState.targets.length === 0) return;

  workerState.currentIndex = 0;
  workerState.isRunning = true;
  workerState.isPaused = false;
  saveWorkerState();

  broadcastToAshkApp({
    type: 'ASHK_QUEUE_UPDATED',
    state: workerState
  });

  processNextTarget();
}

function stopHarvestQueue() {
  workerState.isRunning = false;
  workerState.isPaused = false;
  if (workerState.activeTabId) {
    chrome.tabs.remove(workerState.activeTabId).catch(() => {});
    workerState.activeTabId = null;
  }
  workerState.activeTarget = null;
  saveWorkerState();

  broadcastToAshkApp({
    type: 'ASHK_QUEUE_COMPLETED',
    state: workerState
  });
}

async function processNextTarget() {
  if (!workerState.isRunning || workerState.isPaused) return;

  if (workerState.currentIndex >= workerState.targets.length) {
    console.log('[ASHK Worker] All target platforms processed successfully.');
    stopHarvestQueue();
    return;
  }

  const target = workerState.targets[workerState.currentIndex];
  workerState.activeTarget = target;
  target.status = 'navigating';
  target.currentStepMessage = 'در حال باز کردن پورتال جهت ثبت‌نام و شکار سشن...';
  target.startedAt = new Date().toISOString();
  saveWorkerState();

  broadcastToAshkApp({
    type: 'ASHK_TARGET_PROGRESS',
    target,
    index: workerState.currentIndex
  });

  let destUrl = target.registerUrl || target.endpoint || `https://${target.domain}`;
  if (!destUrl.startsWith('http')) destUrl = `https://${destUrl}`;

  try {
    const tab = await chrome.tabs.create({
      url: destUrl,
      active: false
    });
    workerState.activeTabId = tab.id;

    const onNavComplete = (details) => {
      if (details.tabId === tab.id && details.frameId === 0) {
        chrome.webNavigation.onCompleted.removeListener(onNavComplete);
        setTimeout(() => {
          initiateAutonomousScripting(tab.id, target);
        }, 2500);
      }
    };

    chrome.webNavigation.onCompleted.addListener(onNavComplete);

    setTimeout(() => {
      chrome.webNavigation.onCompleted.removeListener(onNavComplete);
      if (workerState.activeTarget === target && target.status === 'navigating') {
        initiateAutonomousScripting(tab.id, target);
      }
    }, 12000);

  } catch (err) {
    target.status = 'failed';
    target.error = err.message;
    advanceToNext();
  }
}

function initiateAutonomousScripting(tabId, target) {
  target.status = 'filling';
  target.currentStepMessage = 'در حال اسکن DOM و تزریق هوشمند اطلاعات ثبت‌نام...';
  saveWorkerState();

  broadcastToAshkApp({
    type: 'ASHK_TARGET_PROGRESS',
    target,
    index: workerState.currentIndex
  });

  chrome.tabs.sendMessage(tabId, {
    type: 'ASHK_EXECUTE_DOM_REGISTRATION',
    target: target,
    credentials: workerState.credentials
  }, (response) => {
    if (chrome.runtime.lastError) {
      // Script might not be loaded yet, fallback to cookie poll
      pollForAuthCookies(target, tabId);
      return;
    }

    if (response && response.requiresOtp) {
      target.status = 'waiting_otp';
      target.currentStepMessage = 'کد پیامکی ارسال شد. منتظر دریافت از رله هوشمند...';
      saveWorkerState();
      broadcastToAshkApp({
        type: 'ASHK_TARGET_PROGRESS',
        target,
        index: workerState.currentIndex
      });
      waitForOtpOrWebhook(target, tabId);
    } else {
      pollForAuthCookies(target, tabId);
    }
  });
}

function waitForOtpOrWebhook(target, tabId) {
  let attempts = 0;
  const maxAttempts = 30;

  const interval = setInterval(async () => {
    attempts++;
    if (!workerState.isRunning || workerState.activeTarget !== target) {
      clearInterval(interval);
      return;
    }

    try {
      const base = (workerState.orchestratorUrl || DEFAULT_ORCHESTRATOR).replace(/\/$/, '');
      const res = await fetch(`${base}/cpanel-backend/api/index.php/sms/latest?phone=${encodeURIComponent(workerState.credentials.phone)}`).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        if (data.code) {
          clearInterval(interval);
          target.currentStepMessage = `کد OTP (${data.code}) با موفقیت استخراج شد. در حال تایید...`;
          saveWorkerState();

          chrome.tabs.sendMessage(tabId, {
            type: 'ASHK_INJECT_OTP_CODE',
            code: data.code
          }, () => {
            if (chrome.runtime.lastError) return;
            pollForAuthCookies(target, tabId);
          });
          return;
        }
      }
    } catch (e) {}

    if (attempts >= maxAttempts) {
      clearInterval(interval);
      pollForAuthCookies(target, tabId);
    }
  }, 2000);
}

function pollForAuthCookies(target, tabId) {
  target.status = 'verifying';
  target.currentStepMessage = 'در حال استخراج و اعتبارسنجی کوکی‌های سشن ورود...';
  saveWorkerState();

  let checkCount = 0;
  const maxChecks = 10;

  const cookieInterval = setInterval(async () => {
    checkCount++;
    if (!workerState.isRunning || workerState.activeTarget !== target) {
      clearInterval(cookieInterval);
      return;
    }

    try {
      const cookies = await chrome.cookies.getAll({ domain: target.domain });
      const cookieMap = {};
      let hasSession = false;
      const sessionKeywords = ['sess', 'token', 'auth', 'user', 'jwt', 'phpsessid', 'identity'];

      if (cookies && cookies.length > 0) {
        cookies.forEach(c => {
          cookieMap[c.name] = c.value;
          if (sessionKeywords.some(kw => c.name.toLowerCase().includes(kw))) {
            hasSession = true;
          }
        });
      }

      if (hasSession || checkCount >= maxChecks) {
        clearInterval(cookieInterval);
        target.status = hasSession ? 'success' : 'completed';
        target.harvestedCookies = cookieMap;
        target.harvestedToken = cookieMap['token'] || cookieMap['jwt'] || null;
        target.extractedUsername = workerState.credentials.username || workerState.credentials.phone;
        target.completedAt = new Date().toISOString();
        workerState.syncedSessionsCount++;
        saveWorkerState();

        broadcastToAshkApp({
          type: 'ASHK_SESSION_HARVESTED',
          platformId: target.platformId,
          domain: target.domain,
          persianName: target.persianName,
          sessionCookies: target.harvestedCookies,
          sessionToken: target.harvestedToken,
          accountUsername: target.extractedUsername
        });

        await syncSessionToCpanelServer(target, target.harvestedCookies, target.harvestedToken);

        if (tabId) {
          chrome.tabs.remove(tabId).catch(() => {});
        }

        advanceToNext();
      }
    } catch (err) {
      clearInterval(cookieInterval);
      target.status = 'failed';
      advanceToNext();
    }
  }, 2000);
}

function handleUserResolvedOtp(otpCode) {
  if (workerState.activeTabId && workerState.activeTarget) {
    chrome.tabs.sendMessage(workerState.activeTabId, {
      type: 'ASHK_INJECT_OTP_CODE',
      code: otpCode
    }, () => {
      if (chrome.runtime.lastError) return;
      pollForAuthCookies(workerState.activeTarget, workerState.activeTabId);
    });
  }
}

function advanceToNext() {
  workerState.currentIndex++;
  saveWorkerState();

  broadcastToAshkApp({
    type: 'ASHK_QUEUE_UPDATED',
    state: workerState
  });

  setTimeout(() => {
    processNextTarget();
  }, 2500);
}

function broadcastToAshkApp(payload) {
  try {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError || !tabs) return;
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, payload, () => {
          if (chrome.runtime.lastError) {
            // tab didn't receive message, normal for unrelated tabs
          }
        });
      });
    });
  } catch (e) {}
}
