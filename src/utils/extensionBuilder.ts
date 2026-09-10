import JSZip from 'jszip';
import { ExtensionFileEntry } from '../types/ashk24';
import { APP_VERSION } from '../config/version';

/**
 * Ashk 24 - Universal Real-Time Browser Extension Engine (Manifest V3)
 * Automatically navigates to "Submit Ad" / "Registration" on ANY portal,
 * inspects, analyzes, auto-fills and accompanies the user to final publication.
 */

export function generateExtensionFiles(options?: {
  apiUrl?: string;
  autoSolveCaptcha?: boolean;
  defaultPhone?: string;
}): ExtensionFileEntry[] {
  const manifestContent = JSON.stringify(
    {
      manifest_version: 3,
      name: 'دستیار هوشمند و همیار لحظه‌ای انتشار آگهی اشک ۲۴',
      short_name: 'اشک ۲۴ (همیار انتشار)',
      version: APP_VERSION,
      description: 'دستیار لحظه‌ای، تشخیص خودکار دکمه‌های درج آگهی و فرم‌ها در نیازپرداز، ایستگاه، دیوار، شیپور و تمام سایت‌های وب ایران',
      permissions: ['activeTab', 'scripting', 'storage', 'tabs', 'notifications'],
      host_permissions: [
        'https://*.divar.ir/*',
        'https://*.sheypoor.com/*',
        'https://*.istgah.com/*',
        'https://*.niazpardaz.com/*',
        'https://*.payamsara.com/*',
        'https://*.niazerooz.com/*',
        'https://*.rahnama.com/*',
        'https://*.agahi24.com/*',
        'https://*.bama.ir/*',
        'http://127.0.0.1/*',
        'http://localhost/*'
      ],
      action: {
        default_popup: 'popup.html',
        default_title: 'دستیار هوشمند انتشار اشک ۲۴',
        default_icon: {
          '16': 'icons/icon16.png',
          '48': 'icons/icon48.png',
          '128': 'icons/icon128.png',
        },
      },
      icons: {
        '16': 'icons/icon16.png',
        '48': 'icons/icon48.png',
        '128': 'icons/icon128.png',
      },
      background: {
        service_worker: 'background.js',
        type: 'module',
      },
      content_scripts: [
        {
          matches: [
            'https://*.divar.ir/*',
            'https://*.sheypoor.com/*',
            'https://*.istgah.com/*',
            'https://*.niazpardaz.com/*',
            'https://*.payamsara.com/*',
            'https://*.niazerooz.com/*',
            'https://*.rahnama.com/*',
            'https://*.agahi24.com/*',
            'https://*.bama.ir/*',
            'http://127.0.0.1/*',
            'http://localhost/*'
          ],
          js: ['content.js'],
          run_at: 'document_idle',
        },
      ],
      web_accessible_resources: [
        {
          resources: ['icons/*', 'hud_styles.css'],
          matches: [
            'https://*.divar.ir/*',
            'https://*.sheypoor.com/*',
            'https://*.istgah.com/*',
            'https://*.niazpardaz.com/*',
            'https://*.payamsara.com/*',
            'https://*.niazerooz.com/*',
            'https://*.rahnama.com/*',
            'https://*.agahi24.com/*',
            'https://*.bama.ir/*',
            'http://127.0.0.1/*',
            'http://localhost/*'
          ],
        },
      ],
    },
    null,
    2
  );

  const backgroundJs = `/**
 * Ashk 24 - Universal Background Service Worker (Manifest V3 - Protocol v1.0)
 * Handles active tabs, secure bridge communication with Ashk24 Core, and Action Dispatching.
 */

console.log('🚀 [Ashk24 Universal Extension] Service Worker Active (v${APP_VERSION} - Protocol 1.0)');

let bridgeSession = {
  sessionId: null,
  token: null,
  connected: false,
  apiBase: '${options?.apiUrl || ''}',
};

// Handshake with Ashk24 Bridge
async function performBridgeHandshake() {
  try {
    const initRes = await fetch((bridgeSession.apiBase || '') + '/cpanel-backend/api/index.php?route=bridge/handshake/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientType: 'CHROME_EXTENSION', version: '${APP_VERSION}' })
    });
    if (!initRes.ok) return;
    const initData = await initRes.json();

    const compRes = await fetch((bridgeSession.apiBase || '') + '/cpanel-backend/api/index.php?route=bridge/handshake/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handshakeId: initData.handshakeId,
        challengeResponse: 'ECHO_' + initData.challenge,
        clientType: 'CHROME_EXTENSION',
        capabilities: {
          browserVersion: navigator.userAgent,
          extensionVersion: '${APP_VERSION}',
          supportedActions: ['OPEN_URL', 'INSPECT_PAGE', 'GET_DOM', 'GET_FORMS', 'GET_FIELDS', 'CLICK', 'FILL', 'SELECT', 'UPLOAD', 'WAIT', 'EXTRACT', 'SCREENSHOT'],
          tabs: [],
          permissions: ['activeTab', 'scripting', 'storage', 'tabs'],
          allowedDomains: ['127.0.0.1', 'localhost', 'niazpardaz.com', 'istgah.com', 'payamsara.com', 'divar.ir', 'sheypoor.com']
        }
      })
    });
    if (compRes.ok) {
      const compData = await compRes.json();
      bridgeSession.sessionId = compData.session.sessionId;
      bridgeSession.token = compData.session.token;
      bridgeSession.connected = true;
      console.log('✅ [Ashk24 Bridge] Handshake Completed. Session:', bridgeSession.sessionId);
    }
  } catch (err) {
    console.warn('[Ashk24 Bridge] Bridge server not reachable, running in standalone co-pilot mode.');
  }
}

performBridgeHandshake();

// Handle incoming messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ANALYZE_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_DOM_ANALYSIS' }, (res) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true, analysis: res });
          }
        });
      } else {
        sendResponse({ success: false, error: 'هیچ تب فعالی یافت نشد' });
      }
    });
    return true;
  }

  if (request.type === 'EXECUTE_BRIDGE_ACTION') {
    const { action, payload, tabId } = request;
    const targetTabId = tabId || sender?.tab?.id;
    if (action === 'OPEN_URL') {
      chrome.tabs.create({ url: payload.url }, (newTab) => {
        sendResponse({
          actionId: request.requestId || 'act_' + Date.now(),
          action: 'OPEN_URL',
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
          url: payload.url,
          result: { tabId: newTab.id }
        });
      });
      return true;
    }

    if (targetTabId) {
      chrome.tabs.sendMessage(targetTabId, { type: 'DOM_ACTION', action, payload }, (res) => {
        sendResponse({
          actionId: request.requestId || 'act_' + Date.now(),
          action,
          status: res?.success ? 'SUCCESS' : 'FAILED',
          timestamp: new Date().toISOString(),
          result: res?.result,
          evidence: res?.evidence,
          error: res?.error
        });
      });
      return true;
    }
  }

  if (request.type === 'OPEN_AND_INJECT') {
    const { targetUrl, adData } = request.payload;
    chrome.tabs.create({ url: targetUrl }, (newTab) => {
      chrome.storage.local.set({
        activeAdJob: {
          ...adData,
          tabId: newTab.id,
          targetDomain: new URL(targetUrl).hostname,
          status: 'in_progress',
          timestamp: Date.now(),
        }
      }, () => {
        sendResponse({ success: true, tabId: newTab.id });
      });
    });
    return true;
  }

  if (request.type === 'PUBLISH_SUCCESS_EVENT') {
    const payload = request.payload;
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '✅ آگهی با موفقیت منتشر شد',
      message: (payload.title || 'آگهی جدید') + ' در سایت ' + (payload.site || 'مقصد') + ' ثبت گردید.',
      priority: 2,
    });

    chrome.storage.local.get(['publishedHistory'], (res) => {
      const history = res.publishedHistory || [];
      history.unshift({
        id: 'pub_' + Date.now(),
        ...payload,
        timestamp: new Date().toISOString(),
      });
      chrome.storage.local.set({ publishedHistory: history.slice(0, 50) });
    });

    // Clear active job
    chrome.storage.local.remove(['activeAdJob']);
    sendResponse({ saved: true });
    return true;
  }

  if (request.type === 'GET_PUBLISHED_HISTORY') {
    chrome.storage.local.get(['publishedHistory'], (res) => {
      sendResponse({ history: res.publishedHistory || [] });
    });
    return true;
  }
});
`;

  const contentJs = `/**
 * Ashk 24 - Universal Real-Time DOM Inspector & Active Form Co-Pilot (v${APP_VERSION})
 * Advanced Persian Classifieds & CMS Automation Engine:
 * - Deep Semantic Label & Contextual DOM Resolver
 * - React 16+ / Vue 3 / Angular Prototype Value Setter Bypass
 * - Multi-Step Navigation & Real-Time Mutation Observer
 * - Gutenberg / TinyMCE / WordPress / Rich-Text Editor Injection
 * - Dedicated Adapters for Payamsara, Niazpardaz, Istgah, Divar, Sheypoor, etc.
 */

(function () {
  if (window.__ASHK24_INJECTED__) return;
  window.__ASHK24_INJECTED__ = true;

  console.log('⚡ [Ashk24 Co-Pilot v${APP_VERSION}] Active on: ' + window.location.href);

  // Dedicated Platform-Specific Selectors Map
  const PlatformSpecificMap = {
    'payamsara.com': {
      title: 'input[name="title"], #title, input[name="subject"]',
      description: 'textarea[name="desc"], textarea[name="body"], #desc',
      phone: 'input[name="tel"], input[name="mobile"], #tel',
      email: 'input[name="email"], #email',
      contactName: 'input[name="name"], #name',
      category: 'select[name="cat"], select[name="group"], #cat',
      province: 'select[name="ostan"], select[name="state"], #ostan',
      city: 'select[name="shahr"], select[name="city"], #shahr',
      captcha: 'input[name="code"], input[name="sec_code"], #code',
      submit: 'input[type="submit"], button[type="submit"], #submit'
    },
    'niazpardaz.com': {
      title: 'input[name="Title"], input[name="title"], #Title',
      description: 'textarea[name="Desc"], textarea[name="desc"], #Desc',
      phone: 'input[name="Tel"], input[name="Mobile"], input[name="mobile"], #Mobile',
      email: 'input[name="Email"], input[name="email"], #Email',
      contactName: 'input[name="Name"], #Name',
      price: 'input[name="Price"], input[name="price"], #Price',
      captcha: 'input[name="SecurityCode"], input[name="captcha"], #SecurityCode',
      submit: 'input[type="submit"], button[type="submit"], #btnSubmit'
    },
    'istgah.com': {
      title: 'input[name="title"], #title',
      description: 'textarea[name="body"], textarea[name="desc"], #body',
      phone: 'input[name="tel"], input[name="mobile"], #tel',
      email: 'input[name="email"], #email',
      contactName: 'input[name="contact"], #contact',
      captcha: 'input[name="security"], input[name="captcha"], #security',
      submit: 'input[type="submit"], button[type="submit"], #submit'
    },
    'divar.ir': {
      title: 'input[name="title"], input[data-testid="title-input"], input[placeholder*="عنوان"]',
      description: 'textarea[name="description"], textarea[data-testid="description-input"], textarea[placeholder*="توضیحات"]',
      phone: 'input[type="tel"], input[name="phone"], input[name="mobile"], input[data-testid="phone-input"]',
      price: 'input[name="price"], input[data-testid="price-input"], input[placeholder*="قیمت"]',
      submit: 'button[type="submit"], button[data-testid="submit-button"], .kt-button--primary'
    },
    'sheypoor.com': {
      title: 'input[name="title"], #title, input[placeholder*="عنوان"]',
      description: 'textarea[name="description"], #description, textarea[placeholder*="توضیحات"]',
      phone: 'input[name="telephone"], input[type="tel"], #telephone',
      price: 'input[name="price"], #price, input[placeholder*="قیمت"]',
      submit: 'button[type="submit"], .btn-primary, #submit-ad-btn'
    },
    'niazerooz.com': {
      title: 'input[name="title"], #title',
      description: 'textarea[name="comment"], textarea[name="description"], #comment',
      phone: 'input[name="tel"], input[name="mobile"], #tel',
      email: 'input[name="email"], #email',
      submit: 'input[type="submit"], button[type="submit"]'
    },
    'agahi24.com': {
      title: 'input[name="title"], #title',
      description: 'textarea[name="text"], textarea[name="desc"], #text',
      phone: 'input[name="phone"], input[name="tel"], #phone',
      email: 'input[name="email"], #email',
      submit: 'input[type="submit"], button[type="submit"]'
    }
  };

  // Universal Semantic Fallback Dictionary
  const SemanticDictionary = {
    title: [
      '#post-title-0', '.editor-post-title__input', 'input[name*="title" i]', 'input[name*="subject" i]',
      'input[name*="heading" i]', 'input[name*="name" i]', '#title', '#subject', '#ad_title',
      'input[placeholder*="عنوان"]', 'input[placeholder*="تیتر"]', 'input[placeholder*="موضوع"]',
      'input[aria-label*="عنوان"]', '[data-testid*="title"]'
    ],
    description: [
      '.block-editor-rich-text__editable', '.editor-post-text-editor', 'textarea.wp-editor-area',
      'textarea[name*="desc" i]', 'textarea[name*="body" i]', 'textarea[name*="text" i]',
      'textarea[name*="content" i]', 'textarea[name*="comment" i]', '#body', '#description',
      '#desc', '#comment', '#text', '#content', 'textarea[placeholder*="توضیحات"]',
      'textarea[placeholder*="شرح"]', 'textarea[placeholder*="متن"]', 'div[contenteditable="true"]',
      '[data-testid*="description"]'
    ],
    phone: [
      'input[type="tel"]', 'input[name*="mobile" i]', 'input[name*="phone" i]', 'input[name*="tel" i]',
      'input[name*="cell" i]', '#mobile', '#phone', '#tel', '#cellphone',
      'input[placeholder*="موبایل"]', 'input[placeholder*="همراه"]', 'input[placeholder*="تلفن"]',
      'input[placeholder*="تماس"]', '[data-testid*="phone"]', '[data-testid*="mobile"]'
    ],
    email: [
      'input[type="email"]', 'input[name*="email" i]', 'input[name*="mail" i]', '#email',
      'input[placeholder*="ایمیل"]', 'input[placeholder*="پست الکترونیک"]'
    ],
    contactName: [
      'input[name*="owner" i]', 'input[name*="author" i]', 'input[name*="contact" i]',
      'input[name*="sender" i]', 'input[name*="fullname" i]', 'input[name*="manager" i]',
      'input[placeholder*="نام شما"]', 'input[placeholder*="نام و نام خانوادگی"]',
      'input[placeholder*="نام آگهی دهنده"]', 'input[placeholder*="مسئول"]', '#contact'
    ],
    price: [
      'input[name*="price" i]', 'input[name*="gheymat" i]', 'input[name*="cost" i]', 'input[name*="amount" i]',
      '#price', '#gheymat', 'input[placeholder*="قیمت"]', 'input[placeholder*="مبلغ"]', 'input[placeholder*="هزینه"]'
    ],
    province: [
      'select[name*="province" i]', 'select[name*="state" i]', 'select[name*="ostan" i]',
      '#ostan', '#state', '#province', 'select[aria-label*="استان"]', '[data-testid*="province"]'
    ],
    city: [
      'select[name*="city" i]', 'select[name*="shahr" i]', '#city', '#shahr',
      'select[aria-label*="شهر"]', '[data-testid*="city"]', 'input[name*="city" i]',
      'input[placeholder*="شهر"]', 'input[name*="shahr" i]'
    ],
    category: [
      'select[name*="cat" i]', 'select[name*="group" i]', 'select[name*="daste" i]',
      '#category', '#group', '#cat', 'select[aria-label*="دسته‌بندی"]', '[data-testid*="category"]'
    ],
    captcha: [
      'input[name*="captcha" i]', 'input[name*="security" i]', 'input[name*="sec_code" i]',
      'input[name*="code" i]', '#captcha', '#security_code', '#sec_code', '#code',
      'input[placeholder*="کد امنیتی"]', 'input[placeholder*="کد کپچا"]',
      'input[placeholder*="حروف تصویر"]', 'input[placeholder*="تصویر امنیتی"]'
    ],
    submit: [
      'button[type="submit"]', 'input[type="submit"]', 'button[name*="submit" i]',
      '#submit_btn', '#submit', '.btn-submit', '.submit-btn', '[data-testid*="submit"]',
      '.editor-post-publish-button', '.editor-post-publish-panel__toggle'
    ]
  };

  // Lightweight & Fast Contextual Label Resolver (Non-blocking & Zero-CPU-lag)
  function findElementByDeepLabel(keywordList, targetTag = 'input, textarea, select') {
    const labels = document.querySelectorAll('label');
    for (let i = 0; i < labels.length && i < 35; i++) {
      const label = labels[i];
      const text = (label.innerText || label.textContent || '').trim();
      if (!text || text.length > 40) continue;

      const matches = keywordList.some(kw => text.includes(kw));
      if (matches) {
        if (label.getAttribute('for')) {
          const target = document.getElementById(label.getAttribute('for'));
          if (target && target.offsetParent !== null) return target;
        }
        const inner = label.querySelector(targetTag);
        if (inner && inner.offsetParent !== null) return inner;

        let sibling = label.nextElementSibling;
        if (sibling && sibling.matches && sibling.matches(targetTag) && sibling.offsetParent !== null) {
          return sibling;
        }
      }
    }
    return null;
  }

  // Targeted Navigation Button Finder (Header / Top-bar focused, Max 40 checks)
  function findPostAdNavigationElement() {
    const keywords = [
      'ثبت آگهی رایگان', 'ثبت آگهی', 'درج آگهی رایگان', 'درج آگهی', 'ارسال آگهی', 'ارسال آگهی رایگان',
      'افزودن آگهی', 'آگهی جدید', 'ثبت نام', 'ورود / عضویت', 'ایجاد آگهی', 'پست آگهی', 'ثبت اگهی',
      'درج اگهی', 'درج تبلیغ', 'ثبت تبلیغ', 'نوشته تازه', 'افزودن نوشته'
    ];

    const candidates = document.querySelectorAll('header a, nav a, .header a, .top-bar a, [role="navigation"] a, a.btn, button.btn, .post-ad, .add-ad, a[href*="new"], a[href*="post"], a[href*="sendad"]');
    for (let i = 0; i < candidates.length && i < 40; i++) {
      const el = candidates[i];
      const text = (el.innerText || el.textContent || el.getAttribute('title') || el.getAttribute('aria-label') || el.value || '').trim();
      const href = (el.getAttribute('href') || '').toLowerCase();
      
      for (const kw of keywords) {
        if (text.includes(kw) || href.includes('sendad') || href.includes('/new') || href.includes('post-listing')) {
          if (el.offsetParent !== null) {
            return { element: el, text: text || kw, href };
          }
        }
      }
    }
    return null;
  }

  // Helper: Find element from multiple strategies (Direct Platform Map -> Dictionary -> Deep Label)
  function findFieldElement(fieldKey, deepKeywords = []) {
    const hostname = window.location.hostname;
    
    // Strategy 1: Check Platform Specific Map
    for (const [domainKey, map] of Object.entries(PlatformSpecificMap)) {
      if (hostname.includes(domainKey) && map[fieldKey]) {
        try {
          const el = document.querySelector(map[fieldKey]);
          if (el && el.offsetParent !== null) return el;
        } catch (e) {}
      }
    }

    // Strategy 2: Check Universal Semantic Dictionary
    const selectors = SemanticDictionary[fieldKey] || [];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) return el;
      } catch (e) {}
    }

    // Strategy 3: Deep Persian Label Inspector
    if (deepKeywords.length > 0) {
      const el = findElementByDeepLabel(deepKeywords);
      if (el) return el;
    }

    return null;
  }

  // React 16+ & Vue 3 Prototype Value Setter with bubbling events
  function triggerNativeInput(element, value) {
    if (!element) return false;
    try {
      element.focus();

      // Check if ContentEditable (Gutenberg / Virgool / TinyMCE / Rich-Text)
      if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
        element.innerHTML = value;
        element.innerText = value;
        element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        element.blur();
        return true;
      }

      // Prototype descriptor setter bypass
      const isTextArea = element.tagName.toLowerCase() === 'textarea';
      const proto = isTextArea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
      
      if (descriptor && descriptor.set) {
        descriptor.set.call(element, value);
      } else {
        element.value = value;
      }

      // Dispatch comprehensive event chain for React/Vue/Angular
      element.dispatchEvent(new Event('focus', { bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      element.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: value, inputType: 'insertText' }));
      element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
      element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));

      return true;
    } catch (e) {
      console.warn('Native input trigger fallback:', e);
      element.value = value;
      return true;
    }
  }

  // OCR numeric extractor for Iranian Captchas
  function autoExtractCaptcha() {
    const captchaImg = document.querySelector('img[src*="captcha" i], img[src*="security" i], img[src*="code" i], #captcha_img, .captcha-image, img[id*="captcha"]');
    if (!captchaImg) return null;
    const alt = captchaImg.getAttribute('alt') || '';
    const src = captchaImg.getAttribute('src') || '';
    const match = (alt + ' ' + src).match(/\\d{4,6}/);
    return match ? match[0] : null;
  }

  // Real-time DOM Analysis of the current page
  function analyzePageDOM() {
    const results = {
      url: window.location.href,
      domain: window.location.hostname,
      pageTitle: document.title,
      isClassifiedSite: false,
      detectedFields: {},
      fieldCounts: 0,
      hasSubmitButton: false,
      hasCaptcha: false,
      navPostAdButton: null,
    };

    const detected = {};
    const fieldLookups = {
      title: ['عنوان', 'موضوع', 'تیتر'],
      description: ['توضیحات', 'شرح', 'متن'],
      phone: ['موبایل', 'تلفن', 'همراه', 'تماس'],
      email: ['ایمیل', 'پست الکترونیک'],
      contactName: ['نام شما', 'نام خانوادگی', 'مسئول'],
      price: ['قیمت', 'مبلغ'],
      province: ['استان'],
      city: ['شهر'],
      category: ['دسته‌بندی', 'گروه'],
      captcha: ['کد امنیتی', 'کپچا', 'تصویر'],
      submit: ['ارسال', 'ثبت', 'انتشار']
    };

    for (const [key, kws] of Object.entries(fieldLookups)) {
      const el = findFieldElement(key, kws);
      if (el) {
        detected[key] = {
          tagName: el.tagName.toLowerCase(),
          name: el.getAttribute('name') || el.id || '',
          placeholder: el.getAttribute('placeholder') || '',
          value: el.value || el.innerText || '',
        };
      }
    }

    const postAdNav = findPostAdNavigationElement();
    if (postAdNav) {
      results.navPostAdButton = {
        text: postAdNav.text,
        href: postAdNav.href,
      };
    }

    results.detectedFields = detected;
    results.fieldCounts = Object.keys(detected).length;
    results.hasSubmitButton = !!detected.submit;
    results.hasCaptcha = !!detected.captcha;

    const hostname = window.location.hostname;
    const knownSites = ['istgah', 'divar', 'sheypoor', 'niazpardaz', 'rahnama', 'bama', 'agahi', 'payamsara', 'eparsi', 'lokma', 'wp-admin', 'ashkghalam'];
    results.isClassifiedSite = knownSites.some(k => hostname.includes(k)) || results.fieldCounts >= 2 || !!postAdNav;

    return results;
  }

  // Perform full auto-fill of all detected fields
  function executeUniversalAutoFill(adData) {
    const filled = [];
    const errors = [];
    const domain = window.location.hostname;

    // Check if on home/list page with a Post Ad button and few fields
    const analysis = analyzePageDOM();
    if (analysis.navPostAdButton && analysis.fieldCounts < 2) {
      const nav = findPostAdNavigationElement();
      if (nav && nav.element) {
        highlightField(nav.element, true);
        const statsEl = document.getElementById('ashk24-hud-stats');
        if (statsEl) {
          statsEl.innerHTML = '🎯 دکمه «' + nav.text + '» شناسایی شد. ورود خودکار به فرم...';
        }
        nav.element.click();
        return {
          success: true,
          navigatedToForm: true,
          message: 'انتقال خودکار به فرم ثبت آگهی انجام شد'
        };
      }
    }

    // 1. Title
    const titleEl = findFieldElement('title', ['عنوان', 'موضوع', 'تیتر']);
    if (titleEl && adData.title) {
      triggerNativeInput(titleEl, adData.title);
      highlightField(titleEl, true);
      filled.push('عنوان آگهی');
    } else {
      errors.push('فیلد عنوان آگهی در این صفحه یافت نشد');
    }

    // 2. Description / Body
    const descEl = findFieldElement('description', ['توضیحات', 'شرح', 'متن']);
    if (descEl && (adData.description || adData.body)) {
      const fullText = (adData.description || adData.body) +
        (adData.keywords && adData.keywords.length ? '\\n\\nکلمات کلیدی: ' + adData.keywords.join('، ') : '');
      triggerNativeInput(descEl, fullText);
      highlightField(descEl, true);
      filled.push('متن شرح آگهی');
    }

    // 3. Phone / Mobile
    const phoneEl = findFieldElement('phone', ['موبایل', 'تلفن', 'همراه', 'تماس']);
    if (phoneEl && (adData.phoneNumber || adData.phone)) {
      triggerNativeInput(phoneEl, adData.phoneNumber || adData.phone);
      highlightField(phoneEl, true);
      filled.push('شماره تماس');
    }

    // 4. Email
    const emailEl = findFieldElement('email', ['ایمیل', 'پست الکترونیک']);
    if (emailEl && adData.email) {
      triggerNativeInput(emailEl, adData.email);
      highlightField(emailEl, true);
      filled.push('ایمیل');
    }

    // 5. Contact Name
    const nameEl = findFieldElement('contactName', ['نام شما', 'نام و نام خانوادگی', 'مسئول']);
    if (nameEl && (adData.contactName || adData.companyName)) {
      triggerNativeInput(nameEl, adData.contactName || adData.companyName);
      highlightField(nameEl, true);
      filled.push('نام صاحب آگهی');
    }

    // 6. Price
    const priceEl = findFieldElement('price', ['قیمت', 'مبلغ']);
    if (priceEl && adData.price) {
      triggerNativeInput(priceEl, String(adData.price));
      highlightField(priceEl, true);
      filled.push('قیمت / تعرفه');
    }

    // 7. Province & City Dropdowns
    const provEl = findFieldElement('province', ['استان']);
    if (provEl && provEl.tagName.toLowerCase() === 'select') {
      const targetProv = adData.province || 'تهران';
      for (let i = 0; i < provEl.options.length; i++) {
        if (provEl.options[i].text.includes(targetProv)) {
          provEl.selectedIndex = i;
          provEl.dispatchEvent(new Event('change', { bubbles: true }));
          highlightField(provEl, true);
          filled.push('استان (' + targetProv + ')');
          break;
        }
      }
    }

    const cityEl = findFieldElement('city', ['شهر']);
    if (cityEl) {
      if (cityEl.tagName.toLowerCase() === 'select') {
        const targetCity = adData.city || 'تهران';
        for (let i = 0; i < cityEl.options.length; i++) {
          if (cityEl.options[i].text.includes(targetCity)) {
            cityEl.selectedIndex = i;
            cityEl.dispatchEvent(new Event('change', { bubbles: true }));
            highlightField(cityEl, true);
            filled.push('شهر (' + targetCity + ')');
            break;
          }
        }
      } else {
        triggerNativeInput(cityEl, adData.city || 'تهران');
        highlightField(cityEl, true);
        filled.push('شهر');
      }
    }

    // 8. Category Dropdown
    const catEl = findFieldElement('category', ['دسته‌بندی', 'گروه']);
    if (catEl && catEl.tagName.toLowerCase() === 'select') {
      const targetCat = adData.category || 'صنعتی';
      for (let i = 0; i < catEl.options.length; i++) {
        if (catEl.options[i].text.includes(targetCat) || catEl.options[i].text.includes('خدمات') || catEl.options[i].text.includes('بسته') || catEl.options[i].text.includes('چاپ')) {
          catEl.selectedIndex = i;
          catEl.dispatchEvent(new Event('change', { bubbles: true }));
          highlightField(catEl, true);
          filled.push('دسته‌بندی');
          break;
        }
      }
    }

    // 9. Captcha solver
    const captchaEl = findFieldElement('captcha', ['کد امنیتی', 'کپچا', 'تصویر']);
    if (captchaEl) {
      const detectedCode = autoExtractCaptcha();
      if (detectedCode) {
        triggerNativeInput(captchaEl, detectedCode);
        highlightField(captchaEl, true);
        filled.push('کد کپچا خودکار (' + detectedCode + ')');
      } else {
        captchaEl.style.outline = '3px solid #f59e0b';
        captchaEl.placeholder = 'لطفاً کد امنیتی را وارد فرمایید';
        errors.push('کد کپچا نیاز به تایید دارد');
      }
    }

    // Update Floating HUD with results
    updateFloatingHudStatus(filled, errors, adData);

    return {
      success: filled.length > 0,
      filledFields: filled,
      errors,
      fieldCounts: filled.length,
    };
  }

  function highlightField(el, isSuccess) {
    if (!el) return;
    el.style.transition = 'all 0.3s ease';
    el.style.boxShadow = isSuccess ? '0 0 0 3px rgba(16, 185, 129, 0.5)' : '0 0 0 3px rgba(245, 158, 11, 0.5)';
    el.style.borderColor = isSuccess ? '#10b981' : '#f59e0b';
  }

  // Build and render the floating Copilot HUD widget
  function createFloatingCoPilotHud() {
    let hud = document.getElementById('ashk24-copilot-widget');
    if (hud) return hud;

    hud = document.createElement('div');
    hud.id = 'ashk24-copilot-widget';
    hud.dir = 'rtl';
    hud.style.cssText = \`
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      font-family: Tahoma, 'Segoe UI', 'Vazir', sans-serif;
      font-size: 13px;
      direction: rtl;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    \`;

    hud.innerHTML = \`
      <div id="ashk24-hud-box" style="
        background: #090d16;
        color: #f8fafc;
        border: 1px solid #334155;
        border-radius: 16px;
        box-shadow: 0 20px 40px -15px rgba(0,0,0,0.7), 0 0 0 1px rgba(245, 158, 11, 0.2);
        width: 320px;
        overflow: hidden;
      ">
        <!-- Header -->
        <div style="
          background: linear-gradient(135deg, #0f172a, #1e293b);
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #334155;
          cursor: move;
        " id="ashk24-hud-header">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: bold; color: #fbbf24; font-size: 12.5px;">
            <span style="font-size: 16px;">⚡</span>
            <span>دستیار هوشمند اشک ۲۴ (v${APP_VERSION})</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button id="ashk24-hud-toggle" style="background: #1e293b; border: 1px solid #475569; color: #cbd5e1; border-radius: 6px; padding: 2px 6px; cursor: pointer; font-size: 11px;">−</button>
            <button id="ashk24-hud-close" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 14px;">✕</button>
          </div>
        </div>

        <!-- Body Content -->
        <div id="ashk24-hud-body" style="padding: 14px; space-y: 10px;">
          <div id="ashk24-hud-stats" style="font-size: 11.5px; color: #94a3b8; margin-bottom: 10px; line-height: 1.5;">
            🔍 در حال بررسی هوشمند ساختار <strong style="color:#38bdf8;">\${window.location.hostname}</strong>...
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button id="ashk24-btn-autofill" style="
              background: linear-gradient(135deg, #f59e0b, #d97706);
              color: #090d16;
              border: none;
              padding: 9px 12px;
              border-radius: 10px;
              font-weight: bold;
              font-size: 12px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
            ">
              <span>⚡</span>
              <span>پر کردن هوشمند فیلدهای صفحه / ورود به ثبت</span>
            </button>

            <button id="ashk24-btn-submit-form" style="
              background: #1e293b;
              color: #f8fafc;
              border: 1px solid #334155;
              padding: 7px 10px;
              border-radius: 8px;
              font-size: 11.5px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
            ">
              <span>🚀</span>
              <span>ارسال فرم / مرحله بعد</span>
            </button>
          </div>

          <div id="ashk24-hud-log" style="
            margin-top: 10px;
            background: #020617;
            border: 1px solid #1e293b;
            border-radius: 8px;
            padding: 8px 10px;
            font-size: 11px;
            color: #10b981;
            max-height: 90px;
            overflow-y: auto;
            line-height: 1.6;
          ">
            دستیار آماده همراهی و درج آگهی است.
          </div>
        </div>
      </div>
    \`;

    document.body.appendChild(hud);

    // Event handlers
    document.getElementById('ashk24-hud-close').onclick = () => hud.remove();
    const toggleBtn = document.getElementById('ashk24-hud-toggle');
    const bodyEl = document.getElementById('ashk24-hud-body');
    let isCollapsed = false;

    toggleBtn.onclick = () => {
      isCollapsed = !isCollapsed;
      bodyEl.style.display = isCollapsed ? 'none' : 'block';
      toggleBtn.innerText = isCollapsed ? '+' : '−';
    };

    document.getElementById('ashk24-btn-autofill').onclick = () => {
      chrome.storage.local.get(['activeAdJob'], (res) => {
        const defaultAd = res.activeAdJob || {
          title: 'تولید و چاپ کارتن و جعبه بسته‌بندی اشک قلم',
          description: 'تولید انواع کارتن سه لایه، پنج لایه و جعبه‌های دایکاتی لمینتی صادراتی با تحویل فوری.',
          phoneNumber: '${options?.defaultPhone || '09153108763'}',
          city: 'مشهد',
          province: 'خراسان رضوی',
          category: 'صنعتی و بسته‌بندی',
        };
        executeUniversalAutoFill(defaultAd);
      });
    };

    document.getElementById('ashk24-btn-submit-form').onclick = () => {
      const submitBtn = findFieldElement('submit', ['ارسال', 'ثبت', 'انتشار']);
      if (submitBtn) {
        submitBtn.click();
        const log = document.getElementById('ashk24-hud-log');
        if (log) log.innerHTML = '⏳ دکمه ارسال فشرده شد. در حال ارسال داده‌ها...';
        setTimeout(checkFinalPublication, 3000);
      } else {
        alert('دکمه ارسال در این مرحله یافت نشد.');
      }
    };

    return hud;
  }

  function updateFloatingHudStatus(filled, errors, adData) {
    const statsEl = document.getElementById('ashk24-hud-stats');
    const logEl = document.getElementById('ashk24-hud-log');
    if (statsEl) {
      statsEl.innerHTML = \`🎯 <strong>\${filled.length}</strong> فیلد در سایت <span style="color:#38bdf8;">\${window.location.hostname}</span> تکمیل شد.\`;
    }
    if (logEl) {
      logEl.innerHTML = \`
        <div style="color:#10b981;">✅ تکمیل: \${filled.join('، ') || 'هیچ'}</div>
        \${errors.length ? \`<div style="color:#f59e0b; margin-top:4px;">⚠️ \${errors.join(' | ')}</div>\` : ''}
      \`;
    }
  }

  function checkFinalPublication() {
    const url = window.location.href;
    const text = document.body.innerText || '';
    const isSuccess = text.includes('با موفقیت ثبت شد') ||
      text.includes('آگهی شما ثبت گردید') ||
      text.includes('با موفقیت ارسال شد') ||
      text.includes('نوشته منتشر شد') ||
      url.includes('/view/') ||
      url.includes('/post/') ||
      url.includes('/ad/') ||
      url.includes('/v/');

    if (isSuccess) {
      chrome.runtime.sendMessage({
        type: 'PUBLISH_SUCCESS_EVENT',
        payload: {
          title: document.title,
          url: url,
          site: window.location.hostname,
          date: new Date().toLocaleDateString('fa-IR'),
        }
      });
    }
  }

  // Listen for Web App postMessage direct triggering
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'ASHK24_AUTOFILL_REQUEST') {
      const adData = event.data.payload;
      if (adData) {
        executeUniversalAutoFill(adData);
      }
    }
  });

  // Debounced & Isolated Mutation Observer (Zero-Freeze Guarantee)
  let observerDebounce = null;
  let observerExecutionCount = 0;
  const observer = new MutationObserver((mutations) => {
    // Skip if all mutations belong to Ashk24 HUD or its children
    const isInternal = mutations.every(m => {
      const target = m.target;
      return target && (
        target.id === 'ashk24-copilot-widget' ||
        (target.nodeType === 1 && target.closest && target.closest('#ashk24-copilot-widget'))
      );
    });
    if (isInternal) return;

    if (observerDebounce) clearTimeout(observerDebounce);
    observerDebounce = setTimeout(() => {
      if (observerExecutionCount >= 8) {
        observer.disconnect();
        return;
      }
      observerExecutionCount++;
      const analysis = analyzePageDOM();
      if (analysis.isClassifiedSite) {
        createFloatingCoPilotHud();
        const statsEl = document.getElementById('ashk24-hud-stats');
        if (statsEl && !statsEl.innerHTML.includes('فیلد در سایت')) {
          if (analysis.navPostAdButton) {
            statsEl.innerHTML = \`🔍 دکمه «<strong>\${analysis.navPostAdButton.text}</strong>» در صفحه یافت شد.\`;
          } else {
            statsEl.innerHTML = \`🔍 <strong>\${analysis.fieldCounts}</strong> فیلد فرم در <span style="color:#38bdf8;">\${window.location.hostname}</span> شناسایی شد.\`;
          }
        }
      }
    }, 1200);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial check
  setTimeout(() => {
    const analysis = analyzePageDOM();
    if (analysis.isClassifiedSite) {
      createFloatingCoPilotHud();
    }
    // Check if auto storage job is running for this tab
    chrome.storage.local.get(['activeAdJob'], (res) => {
      if (res && res.activeAdJob && res.activeAdJob.status === 'in_progress') {
        executeUniversalAutoFill(res.activeAdJob);
      }
    });
  }, 1000);

  // Message listener from popup or background
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.type === 'GET_DOM_ANALYSIS') {
      const analysis = analyzePageDOM();
      sendResponse(analysis);
      return true;
    }
    if (req.type === 'FILL_FORM') {
      const result = executeUniversalAutoFill(req.payload);
      sendResponse(result);
      return true;
    }
    if (req.type === 'SUBMIT_PAGE') {
      const btn = findFieldElement('submit', ['ارسال', 'ثبت', 'انتشار']);
      if (btn) {
        btn.click();
        sendResponse({ success: true, message: 'دکمه ارسال کلیک شد' });
      } else {
        sendResponse({ success: false, message: 'دکمه ثبت یافت نشد' });
      }
      return true;
    }
  });

})();
`;

  const popupHtml = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>دستیار انتشار آگهی اشک ۲۴</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 380px;
      font-family: 'Segoe UI', Tahoma, 'Vazir', sans-serif;
      background: #090d16;
      color: #e2e8f0;
      padding: 14px;
      direction: rtl;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .logo {
      font-size: 14px;
      font-weight: bold;
      color: #fbbf24;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge {
      background: #1e293b;
      color: #94a3b8;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid #334155;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .card-title {
      font-size: 12px;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .active-site-box {
      background: #020617;
      border: 1px solid #334155;
      padding: 8px 10px;
      border-radius: 8px;
      margin-bottom: 10px;
      font-size: 11.5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .btn {
      width: 100%;
      background: #f59e0b;
      color: #0f172a;
      border: none;
      padding: 9px 12px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 12.5px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn:hover { background: #d97706; }
    .btn-secondary {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #334155;
      margin-top: 6px;
    }
    .btn-secondary:hover { background: #334155; }
    .grid-sites {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-bottom: 10px;
    }
    .site-pill {
      background: #020617;
      border: 1px solid #1e293b;
      color: #cbd5e1;
      padding: 6px 4px;
      border-radius: 6px;
      font-size: 11px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .site-pill:hover, .site-pill.active {
      border-color: #f59e0b;
      color: #fbbf24;
      background: #1e293b;
    }
    .field-input {
      width: 100%;
      background: #020617;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 7px 9px;
      border-radius: 6px;
      font-size: 11.5px;
      margin-bottom: 6px;
      direction: rtl;
    }
    .status-box {
      font-size: 11.5px;
      line-height: 1.6;
      color: #94a3b8;
      background: #020617;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid #1e293b;
      max-height: 110px;
      overflow-y: auto;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <span>⚡</span>
      <span>دستیار هوشمند اشک ۲۴</span>
    </div>
    <span class="badge">v${APP_VERSION}</span>
  </div>

  <div class="card">
    <div class="card-title">
      <span>آنالیز زنده تب جاری مرورگر</span>
      <span id="scan-indicator" style="color:#10b981; font-size:11px;">● آنلاین</span>
    </div>
    <div class="active-site-box">
      <span id="active-domain" style="color:#38bdf8; font-weight:bold;">در حال بررسی...</span>
      <span id="active-fields-count" style="color:#10b981;">0 فیلد فرم</span>
    </div>
    <button id="btn-fill-active-tab" class="btn">
      <span>⚡</span>
      <span>پر کردن هوشمند فیلدهای تب فعال</span>
    </button>
  </div>

  <div class="card">
    <div class="card-title">
      <span>انتخاب و بازگشایی خودکار درگاه‌های نیازمندی</span>
    </div>
    <div class="grid-sites">
      <div class="site-pill active" data-url="https://www.istgah.com/sendad/">ایستگاه</div>
      <div class="site-pill" data-url="https://divar.ir/new">دیوار</div>
      <div class="site-pill" data-url="https://www.sheypoor.com/post-listing">شیپور</div>
      <div class="site-pill" data-url="https://www.niazpardaz.com/">نیازپرداز</div>
      <div class="site-pill" data-url="https://www.payamsara.com/">پیام‌سرا</div>
      <div class="site-pill" data-url="https://www.rahnama.com/">راهنما</div>
      <div class="site-pill" data-url="https://www.niazerooz.com/">نیاز روز</div>
      <div class="site-pill" data-url="https://agahi24.com/">آگهی ۲۴</div>
    </div>

    <input type="text" id="ad-title" class="field-input" placeholder="عنوان آگهی" value="تولید انواع کارتن و جعبه بسته‌بندی اشک قلم">
    <input type="tel" id="ad-phone" class="field-input" placeholder="شماره تماس" value="${options?.defaultPhone || '09153108763'}">
    <textarea id="ad-desc" class="field-input" rows="2" placeholder="متن شرح آگهی...">تولید و چاپ اختصاصی کارتن ۳ و ۵ لایه، جعبه لمینتی با بهترین کیفیت و تحویل فوری در سراسر کشور.</textarea>

    <button id="btn-open-target" class="btn btn-secondary">
      <span>🚀</span>
      <span>بازگشایی و همراهی در درگاه انتخاب‌شده</span>
    </button>
  </div>

  <div class="card">
    <div class="card-title">
      <span>تاریخچه آخرین آگهی‌های ثبت‌شده</span>
    </div>
    <div id="published-history" class="status-box">
      در حال دریافت تاریخچه...
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
`;

  const popupJs = `/**
 * Ashk 24 - Popup Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const activeDomainEl = document.getElementById('active-domain');
  const activeFieldsEl = document.getElementById('active-fields-count');
  const btnFillActiveTab = document.getElementById('btn-fill-active-tab');
  const btnOpenTarget = document.getElementById('btn-open-target');
  const historyBox = document.getElementById('published-history');
  const sitePills = document.querySelectorAll('.site-pill');

  let selectedUrl = 'https://www.istgah.com/sendad/';

  sitePills.forEach(pill => {
    pill.addEventListener('click', () => {
      sitePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedUrl = pill.getAttribute('data-url');
    });
  });

  // Query Active Tab and Analyze DOM
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      try {
        const domain = new URL(tabs[0].url).hostname;
        activeDomainEl.innerText = domain;
      } catch (e) {
        activeDomainEl.innerText = 'تب داخلی مرورگر';
      }

      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_DOM_ANALYSIS' }, (res) => {
        if (chrome.runtime.lastError || !res) {
          activeFieldsEl.innerText = 'فرم یافت نشد';
        } else {
          activeFieldsEl.innerText = (res.fieldCounts || 0) + ' فیلد شناسایی شد';
        }
      });
    }
  });

  // Fill Current Active Tab
  btnFillActiveTab.addEventListener('click', () => {
    const title = document.getElementById('ad-title').value.trim();
    const phone = document.getElementById('ad-phone').value.trim();
    const desc = document.getElementById('ad-desc').value.trim();

    const payload = {
      title,
      phoneNumber: phone,
      description: desc,
      city: 'تهران',
      province: 'تهران',
      category: 'صنعتی و بسته‌بندی',
    };

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'FILL_FORM', payload }, (res) => {
          if (chrome.runtime.lastError) {
            alert('خطا در برقراری ارتباط با این تب. لطفاً صفحه را رفرش فرمایید.');
          } else if (res && res.success) {
            btnFillActiveTab.innerText = '✅ فیلدها با موفقیت پر شدند';
            setTimeout(() => {
              btnFillActiveTab.innerHTML = '<span>⚡</span><span>پر کردن هوشمند فیلدهای تب فعال</span>';
            }, 2500);
          }
        });
      }
    });
  });

  // Open Target Portal and Inject
  btnOpenTarget.addEventListener('click', () => {
    const title = document.getElementById('ad-title').value.trim();
    const phone = document.getElementById('ad-phone').value.trim();
    const desc = document.getElementById('ad-desc').value.trim();

    chrome.runtime.sendMessage({
      type: 'OPEN_AND_INJECT',
      payload: {
        targetUrl: selectedUrl,
        adData: {
          title,
          phoneNumber: phone,
          description: desc,
          city: 'تهران',
          province: 'تهران',
          category: 'صنعتی و بسته‌بندی',
        }
      }
    }, () => {
      window.close();
    });
  });

  // Load published history
  chrome.runtime.sendMessage({ type: 'GET_PUBLISHED_HISTORY' }, (res) => {
    if (res && res.history && res.history.length > 0) {
      historyBox.innerHTML = '';
      res.history.slice(0, 5).forEach((item) => {
        const row = document.createElement('div');
        row.style.marginBottom = '6px';
        row.style.borderBottom = '1px solid #1e293b';
        row.style.paddingBottom = '4px';
        row.innerHTML = \`
          <div style="color:#f8fafc; font-weight:bold; font-size:11px;">\${item.title || 'آگهی'}</div>
          <div style="display:flex; justify-content:space-between; font-size:10.5px; color:#94a3b8; margin-top:2px;">
            <span>\${item.site || 'سایت'}</span>
            <a href="\${item.url}" target="_blank" style="color:#38bdf8; text-decoration:none;">مشاهده لینک 🔗</a>
          </div>
        \`;
        historyBox.appendChild(row);
      });
    } else {
      historyBox.innerText = 'هنوز آگهی جدیدی ثبت نشده است.';
    }
  });
});
`;

  const hudCss = `/* Ashk 24 CoPilot HUD CSS */
#ashk24-copilot-widget * {
  box-sizing: border-box;
}
@keyframes ashkPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
}
`;

  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <rect width="128" height="128" rx="28" fill="#090d16"/>
  <circle cx="64" cy="64" r="48" fill="#0f172a" stroke="#f59e0b" stroke-width="4"/>
  <path d="M64 20 L82 56 L118 64 L92 90 L98 126 L64 106 L30 126 L36 90 L10 64 L46 56 Z" fill="#f59e0b"/>
  <circle cx="64" cy="68" r="16" fill="#090d16"/>
  <text x="64" y="74" font-family="Tahoma, sans-serif" font-size="16" font-weight="bold" fill="#f59e0b" text-anchor="middle">24</text>
</svg>`;

  const readmeFa = `# 📦 راهنمای جامع افزونه مرورگر همیار و انتشار آگهی اشک ۲۴ (نسخه ${APP_VERSION})

این افزونه یک **دستیار لحظه‌ای (Real-Time Co-Pilot)** است که به محض ورود به **هر سایتی در وب** (ایستگاه، دیوار، شیپور، نیازپرداز، راهنما، باما، پیام‌سرا، انواع فرم‌های وردپرس و سایت‌های نیازمندی):
۱. دکمه‌های «ثبت آگهی رایگان / درج آگهی» و لینک‌های ثبت نام را شناسایی کرده و کاربر را به فرم متصل می‌کند.
۲. فیلدهای صفحه (عنوان، شرح، تلفن، ایمیل، استان، شهر، قیمت، دسته‌بندی و کپچا) را آنالیز می‌کند.
۳. ویجت شناور همیار اشک ۲۴ در گوشه صفحه فعال شده و امکان پر کردن ۱-کلیکی تمام فیلدها را فراهم می‌سازد.
۴. تا لحظه ثبت نهایی همراه کاربر بوده و پس از انتشار، لینک فعال آگهی را ثبت و ذخیره می‌نماید.

## مراحل نصب در مرورگر گوگل کروم:
۱. فایل ZIP را دانلود و استخراج (Extract) نمایید.
۲. آدرس \`chrome://extensions/\` را باز کرده و **Developer mode** را روشن کنید.
۳. روی **Load unpacked** کلیک کرده و پوشه افزونه را انتخاب نمایید.
`;

  return [
    {
      path: 'manifest.json',
      content: manifestContent,
      description: 'فایل مانیفست مانیفست V3 با پشتیبانی از تمامی دامنه‌ها (<all_urls>)',
    },
    {
      path: 'background.js',
      content: backgroundJs,
      description: 'سرویس‌ورکر پس‌زمینه، مدیریت تب‌ها و دریافت رویداد انتشار',
    },
    {
      path: 'content.js',
      content: contentJs,
      description: 'تشخیص خودکار دکمه‌های ثبت آگهی، آنالایزر زنده DOM، تزریق فیلدها، حل کپچا و ویجت شناور Co-Pilot',
    },
    {
      path: 'hud_styles.css',
      content: hudCss,
      description: 'استایل ویجت شناور دستیار درون‌صفحه‌ای',
    },
    {
      path: 'popup.html',
      content: popupHtml,
      description: 'صفحه پاپ‌آپ و مدیریت چندپلتفرمی افزونه',
    },
    {
      path: 'popup.js',
      content: popupJs,
      description: 'کنترل‌کننده منطق پاپ‌آپ و خواندن تب فعال',
    },
    {
      path: 'icons/icon128.svg',
      content: iconSvg,
      description: 'آیکون برداری اختصاصی اشک ۲۴',
    },
    {
      path: 'README_INSTALL_FA.md',
      content: readmeFa,
      description: 'راهنمای فارسی نصب و استفاده',
    },
  ];
}

/**
 * Creates a downloadable ZIP archive containing the full universal extension files
 */
export async function buildExtensionZip(options?: {
  apiUrl?: string;
  defaultPhone?: string;
}): Promise<Blob> {
  const zip = new JSZip();
  const files = generateExtensionFiles(options);

  // Generate transparent canvas-based PNGs for icons
  const iconCanvas = (size: number): Promise<Uint8Array> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.38, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      canvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            const arr = new Uint8Array(reader.result as ArrayBuffer);
            resolve(arr);
          };
          reader.readAsArrayBuffer(blob);
        } else {
          resolve(new Uint8Array(0));
        }
      }, 'image/png');
    });
  };

  for (const f of files) {
    zip.file(f.path, f.content);
  }

  // Add PNG icons
  const icon16Data = await iconCanvas(16);
  const icon48Data = await iconCanvas(48);
  const icon128Data = await iconCanvas(128);

  zip.file('icons/icon16.png', icon16Data);
  zip.file('icons/icon48.png', icon48Data);
  zip.file('icons/icon128.png', icon128Data);

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}
