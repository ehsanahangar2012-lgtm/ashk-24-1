/**
 * سامانه یکپارچه افزونه اشک ۲۴ (ASHK 24 Unified Extension v5.0.0)
 * موتور اجرای انتشار مستقیم و تزریق داده با IP واقعی در تمامی سایت‌های نیازمندی‌های ایرانی
 */

(function () {
  const EXT_VERSION = (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version) || '5.2.0';

  try {
    document.documentElement.setAttribute('data-ashk24-extension', 'installed');
    document.documentElement.setAttribute('data-ashk24-version', EXT_VERSION);
  } catch (e) {}

  let activeTarget = null;
  let credentials = null;
  let hudElement = null;

  // بررسی هوشمند حضور در صفحه داشبورد اشک ۲۴
  const isAshkWebApp = Boolean(
    document.getElementById('root') ||
    (document.title && document.title.includes('اشک')) ||
    document.querySelector('meta[name="application-name"][content*="اشک"]') ||
    document.documentElement.getAttribute('data-ashk24-app') ||
    (window.location.port === '3000') ||
    window.location.pathname.includes('ashk')
  );

  function broadcastReady() {
    window.postMessage({
      type: 'ASHK_EXTENSION_STATUS_REPLY',
      installed: true,
      version: EXT_VERSION,
      origin: window.location.origin
    }, '*');

    try {
      document.dispatchEvent(new CustomEvent('ASHK_EXT_READY', {
        detail: { installed: true, version: EXT_VERSION }
      }));
    } catch (e) {}

    // استعلام وضعیت پس‌زمینه و ثبت فوری آدرس مبدا داشبورد در افزونه
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: isAshkWebApp ? 'ASHK_SET_ORCHESTRATOR' : 'ASHK_PING',
          orchestratorUrl: window.location.origin
        }, (resp) => {
          if (chrome.runtime.lastError) return;
          window.postMessage({
            type: 'ASHK_EXTENSION_STATUS_REPLY',
            installed: true,
            version: EXT_VERSION,
            origin: window.location.origin,
            response: resp
          }, '*');
        });
      }
    } catch (e) {}
  }

  broadcastReady();
  setTimeout(broadcastReady, 500);
  setTimeout(broadcastReady, 2000);

  // 1. دریافت پیام‌ها از Background Service Worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== 'object') return;

    window.postMessage(message, '*');
    try {
      document.dispatchEvent(new CustomEvent('ASHK_EXT_EVENT', { detail: message }));
    } catch (e) {}

    // اجرای انتشار آگهی واقعی
    if (message.type === 'ASHK_EXECUTE_AD_PUBLICATION') {
      executeAdPublicationFlow(message.job, message.campaign, message.company);
      sendResponse({ status: "ad_publication_initiated" });
      return true;
    }

    // اتوماسیون ثبت‌نام اولیه
    if (message.type === 'ASHK_EXECUTE_DOM_REGISTRATION' || message.type === 'ASHK_START_FORM_AUTOFILL') {
      activeTarget = message.target;
      credentials = message.credentials;
      initiateAutofillFlow();
      sendResponse({ status: "autofill_started" });
      return true;
    }

    // تزریق کد OTP
    if (message.type === 'ASHK_INJECT_OTP_CODE') {
      injectOtpCode(message.code);
      sendResponse({ status: "otp_injected" });
      return true;
    }

    // استخراج توکن‌های نشست
    if (message.type === 'ASHK_EXTRACT_DOM_TOKENS') {
      const tokens = extractStorageTokens();
      sendResponse({ tokens });
      return true;
    }

    return true;
  });

  // 2. ارتباط دوطرفه با اپلیکیشن وب
  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;
    handleWebAppCommand(event.data);
  });

  document.addEventListener('ASHK_EXT_REQUEST', (event) => {
    const customData = event.detail;
    if (customData && typeof customData === 'object') {
      handleWebAppCommand(customData);
    }
  });

  function handleWebAppCommand(data) {
    if (data.type === 'ASHK_APP_DISPATCH_PUBLISH') {
      chrome.runtime.sendMessage({
        type: 'ASHK_PUBLISH_JOB_DIRECT',
        job: data.job,
        campaign: data.campaign,
        company: data.company
      }, (resp) => {
        if (chrome.runtime.lastError) return;
        window.postMessage({ type: 'ASHK_PUBLISH_JOB_ACK', response: resp }, '*');
      });
    }

    if (data.type === 'ASHK_APP_DISPATCH_QUEUE') {
      chrome.runtime.sendMessage({
        type: 'ASHK_START_HARVEST_QUEUE',
        targets: data.targets,
        credentials: data.credentials,
        orchestratorUrl: data.orchestratorUrl || window.location.origin
      }, (resp) => {
        if (chrome.runtime.lastError) return;
        window.postMessage({ type: 'ASHK_QUEUE_STARTED_ACK', response: resp }, '*');
      });
    }

    if (data.type === 'ASHK_APP_PAUSE_QUEUE') {
      chrome.runtime.sendMessage({ type: 'ASHK_PAUSE_QUEUE' });
    }

    if (data.type === 'ASHK_APP_RESUME_QUEUE') {
      chrome.runtime.sendMessage({ type: 'ASHK_RESUME_QUEUE' });
    }

    if (data.type === 'ASHK_APP_STOP_QUEUE') {
      chrome.runtime.sendMessage({ type: 'ASHK_STOP_QUEUE' });
    }

    if (data.type === 'ASHK_APP_QUERY_EXTENSION' || data.type === 'ASHK_PING') {
      try {
        chrome.runtime.sendMessage({
          type: 'ASHK_PING',
          orchestratorUrl: data.orchestratorUrl || window.location.origin
        }, (resp) => {
          if (chrome.runtime.lastError) {
            window.postMessage({
              type: 'ASHK_EXTENSION_STATUS_REPLY',
              installed: true,
              version: EXT_VERSION,
              response: { isWorkerEnabled: true, status: 'online', orchestratorUrl: window.location.origin }
            }, '*');
            return;
          }
          const payload = {
            type: 'ASHK_EXTENSION_STATUS_REPLY',
            installed: true,
            version: EXT_VERSION,
            response: resp
          };
          window.postMessage(payload, '*');
          try {
            document.dispatchEvent(new CustomEvent('ASHK_EXT_EVENT', { detail: payload }));
          } catch (e) {}
        });
      } catch (err) {
        window.postMessage({
          type: 'ASHK_EXTENSION_STATUS_REPLY',
          installed: true,
          version: EXT_VERSION,
          response: { isWorkerEnabled: true, status: 'online', orchestratorUrl: window.location.origin }
        }, '*');
      }
    }

    if (data.type === 'ASHK_APP_CONFIG_SERVER') {
      try {
        chrome.runtime.sendMessage({
          type: 'ASHK_SET_ORCHESTRATOR',
          orchestratorUrl: data.orchestratorUrl || window.location.origin
        });
      } catch (e) {}
    }

    if (data.type === 'ASHK_APP_HARVEST_NOW') {
      try {
        chrome.runtime.sendMessage({ type: 'ASHK_HARVEST_CURRENT_TAB' }, (resp) => {
          if (chrome.runtime.lastError) return;
          window.postMessage({ type: 'ASHK_HARVEST_NOW_ACK', response: resp }, '*');
        });
      } catch (e) {}
    }
  }

  // --- نمایش اعلان و وضعیت بالای صفحه (HUD) ---
  function showHud(statusText, isWarning = false) {
    if (!hudElement) {
      hudElement = document.createElement('div');
      hudElement.id = 'ashk24-worker-hud';
      hudElement.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999999;
        background: #0f172a;
        color: #f8fafc;
        font-family: Vazirmatn, Tahoma, sans-serif;
        font-size: 13px;
        padding: 14px 20px;
        border-radius: 12px;
        box-shadow: 0 12px 35px rgba(0,0,0,0.6);
        border: 1px solid ${isWarning ? '#f59e0b' : '#38bdf8'};
        direction: rtl;
        display: flex;
        align-items: center;
        gap: 14px;
        max-width: 420px;
        line-height: 1.6;
      `;
      document.body.appendChild(hudElement);
    }
    hudElement.innerHTML = `
      <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${isWarning ? '#f59e0b' : '#10b981'};box-shadow:0 0 10px ${isWarning ? '#f59e0b' : '#10b981'};"></span>
      <div>
        <div style="font-weight:bold;color:#38bdf8;">سامانه یکپارچه انتشار اشک ۲۴ (نسخه ۵.۲.۰)</div>
        <div style="font-size:12px;color:#cbd5e1;">${statusText}</div>
      </div>
    `;
  }

  function hideHud() {
    if (hudElement && hudElement.parentNode) {
      hudElement.parentNode.removeChild(hudElement);
      hudElement = null;
    }
  }

  // =========================================================================
  // موتور اجرای ثبت و درج آگهی جامع در تمامی پلتفرم‌ها (Full Ad Automation)
  // =========================================================================
  async function executeAdPublicationFlow(job, campaign, company) {
    const title = campaign?.title || job?.campaignTitle || 'تولید و فروش انواع کارتن و جعبه بسته‌بندی اشک ۲۴';
    const content = campaign?.content || job?.campaignContent || 'تولید تخصصی کارتن، کارتن لمینتی، دایکاتی، مقوایی صادراتی با بالاترین کیفیت و قیمت رقابتی. ارسال فوری به سراسر کشور.';
    const phone = company?.phoneNumber || job?.contactPhone || '09153108763';
    const contactName = company?.contactPerson || job?.contactPerson || 'مهندس احسان آهنگر';
    const email = company?.email || job?.contactEmail || 'ashkghalam@gmail.com';
    const province = company?.province || 'خراسان رضوی';
    const city = company?.city || 'مشهد';

    showHud(`درحال تحلیل فرم درج آگهی پلتفرم «${job?.platformName || window.location.hostname}»...`);

    // تاخیر هوشمند برای لود کامل اسکریپت‌های پلتفرم
    await waitMs(1500);

    // ۱. بررسی صفحه ورود / لاگین (در صورت نیاز به لاگین)
    const isLoginPage = checkAndHandleLoginNeed();
    if (isLoginPage) {
      showHud('نیاز به لاگین اولیه در این سایت شناسایی شد. درحال تزریق شماره تماس...', true);
      const tel = document.querySelector('input[type="tel"], input[name*="mobile"], input[name*="phone"]');
      if (tel) {
        setNativeValue(tel, phone);
        const sub = findSubmitButton();
        if (sub) {
          sub.click();
          showHud('کد تایید پیامکی ارسال شد. لطفاً کد را در پنل یا فیلد وارد نمایید.', true);
          return;
        }
      }
    }

    // ۲. شناسایی فیلدهای اصلی فرم آگهی
    let filledCount = 0;

    // عنوان آگهی
    const titleInputs = Array.from(document.querySelectorAll(
      'input[name*="title"], input[id*="title"], input[placeholder*="عنوان"], input[name*="subject"], input[id*="subject"], input[name*="name"]'
    ));
    if (titleInputs.length > 0) {
      setNativeValue(titleInputs[0], title);
      filledCount++;
    }

    // متن / شرح آگهی
    const contentInputs = Array.from(document.querySelectorAll(
      'textarea[name*="desc"], textarea[id*="desc"], textarea[name*="content"], textarea[id*="content"], textarea[name*="body"], textarea[placeholder*="توضیح"], textarea[placeholder*="متن"], textarea'
    ));
    if (contentInputs.length > 0) {
      setNativeValue(contentInputs[0], content);
      filledCount++;
    }

    // شماره تماس و همراه
    const phoneInputs = Array.from(document.querySelectorAll(
      'input[type="tel"], input[name*="phone"], input[name*="mobile"], input[id*="phone"], input[id*="mobile"], input[placeholder*="تماس"], input[placeholder*="همراه"], input[placeholder*="موبایل"]'
    ));
    if (phoneInputs.length > 0) {
      setNativeValue(phoneInputs[0], phone);
      filledCount++;
    }

    // نام رابط / نام آگهی دهنده
    const nameInputs = Array.from(document.querySelectorAll(
      'input[name*="contact"], input[name*="author"], input[name*="owner"], input[placeholder*="نام"], input[id*="contact"]'
    ));
    if (nameInputs.length > 0 && contactName) {
      setNativeValue(nameInputs[0], contactName);
      filledCount++;
    }

    // ایمیل
    const emailInputs = Array.from(document.querySelectorAll(
      'input[type="email"], input[name*="email"], input[id*="email"], input[placeholder*="ایمیل"]'
    ));
    if (emailInputs.length > 0 && email) {
      setNativeValue(emailInputs[0], email);
      filledCount++;
    }

    // استان و شهر (Select یا Input)
    const provinceSelects = Array.from(document.querySelectorAll('select[name*="province"], select[id*="province"], select[name*="ostan"], select[id*="ostan"]'));
    if (provinceSelects.length > 0) {
      selectDropdownOption(provinceSelects[0], province);
      filledCount++;
    }
    const citySelects = Array.from(document.querySelectorAll('select[name*="city"], select[id*="city"], select[name*="shahr"], select[id*="shahr"]'));
    if (citySelects.length > 0) {
      selectDropdownOption(citySelects[0], city);
      filledCount++;
    }

    // انتخاب دسته‌بندی موضوعی آگهی
    const categorySelects = Array.from(document.querySelectorAll('select[name*="cat"], select[id*="cat"], select[name*="group"], select[id*="group"]'));
    if (categorySelects.length > 0) {
      selectDropdownOption(categorySelects[0], 'صنعت') || selectDropdownOption(categorySelects[0], 'خدمات');
      filledCount++;
    }

    // پذیرش قوانین (Terms & Conditions)
    const terms = document.querySelector('input[type="checkbox"][name*="rule"], input[type="checkbox"][name*="term"], input[type="checkbox"][id*="agree"], input[type="checkbox"][name*="agree"]');
    if (terms) {
      terms.checked = true;
      terms.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // حل کپچای عددی ساده اگر وجود داشته باشد
    solveSimpleMathCaptcha();

    // ۳. بررسی حضور گیت کپچای پیشرفته
    const hasAdvancedCaptcha = document.querySelector('iframe[src*="recaptcha"], div[class*="recaptcha"], div[class*="turnstile"], div[id*="rc-imageselect"]');
    if (hasAdvancedCaptcha) {
      showHud('کپچای امنیتی فعال است. لطفاً تیک کپچا را بزنید، سامانه بلافاصله فرم را ثبت می‌کند.', true);
      chrome.runtime.sendMessage({
        type: 'CONTENT_NEEDS_HUMAN',
        reason: 'حل کپچای امنیتی در سایت آگهی',
        jobId: job?.id
      });
      return;
    }

    if (filledCount >= 2) {
      showHud(`فیلدهای آگهی با موفقیت تزریق شد (${filledCount} فیلد). درحال ثبت نهایی آگهی...`);
      await waitMs(1200);

      const submitBtn = findSubmitButton();
      if (submitBtn) {
        submitBtn.click();
        showHud('فرم با موفقیت ارسال شد. در انتظار دریافت تاییدیه انتشار...');

        // استخراج نتیجه و لینک آگهی ثبت شده پس از ۳ ثانیه
        setTimeout(() => {
          verifyAndReportPublication(job);
        }, 3500);
      } else {
        showHud('دکمه ثبت فرم پیدا نشد؛ در صورت امکان دکمه تایید آگهی را کلیک کنید.', true);
      }
    } else {
      showHud('فرم ثبت آگهی در این صفحه یافت نشد. ممکن است نیاز به ورود قبلی داشته باشد.', true);
    }
  }

  function checkAndHandleLoginNeed() {
    const url = window.location.href.toLowerCase();
    const text = document.body.innerText.toLowerCase();
    return url.includes('login') || url.includes('signin') || (text.includes('برای ثبت آگهی وارد شوید') && !text.includes('عنوان آگهی'));
  }

  function selectDropdownOption(selectEl, matchText) {
    if (!selectEl || !selectEl.options) return false;
    for (let i = 0; i < selectEl.options.length; i++) {
      const opt = selectEl.options[i];
      if (opt.text.includes(matchText) || opt.value.includes(matchText)) {
        selectEl.selectedIndex = i;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    // اگر متن پیدا نشد، دومین گزینه معتبر را انتخاب کن
    if (selectEl.options.length > 1) {
      selectEl.selectedIndex = 1;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  function solveSimpleMathCaptcha() {
    try {
      const captchaInput = document.querySelector('input[name*="captcha"], input[id*="captcha"], input[placeholder*="کد امنیتی"], input[placeholder*="حاصل"]');
      if (!captchaInput) return;

      const bodyText = document.body.innerText;
      const mathMatch = bodyText.match(/(\d{1,2})\s*([\+\-\*])\s*(\d{1,2})\s*=/);
      if (mathMatch) {
        const num1 = parseInt(mathMatch[1], 10);
        const op = mathMatch[2];
        const num2 = parseInt(mathMatch[3], 10);
        let ans = 0;
        if (op === '+') ans = num1 + num2;
        else if (op === '-') ans = num1 - num2;
        else if (op === '*') ans = num1 * num2;
        setNativeValue(captchaInput, ans.toString());
      }
    } catch (e) {}
  }

  function verifyAndReportPublication(job) {
    const currentUrl = window.location.href;
    const bodyText = document.body.innerText;

    let isSuccess = false;
    let trackingCode = null;

    if (bodyText.includes('با موفقیت ثبت') || bodyText.includes('آگهی شما ثبت شد') || bodyText.includes('در انتظار تایید') || bodyText.includes('کد پیگیری') || bodyText.includes('ثبت گردید')) {
      isSuccess = true;
      const trackMatch = bodyText.match(/کد پیگیری[:\s]+(\d+)/) || bodyText.match(/شناسه آگهی[:\s]+(\d+)/);
      if (trackMatch) trackingCode = trackMatch[1];
    }

    if (isSuccess || currentUrl !== job?.platformDomain) {
      showHud('آگهی با موفقیت ثبت شد و اطلاعات به سامانه اشک ۲۴ مخابره گردید.');
      chrome.runtime.sendMessage({
        type: 'ASHK_AD_PUBLISHED_SUCCESS',
        jobId: job?.id,
        adUrl: currentUrl,
        trackingCode: trackingCode,
        reportedAt: new Date().toISOString()
      });
    }
  }

  // --- جریان خودکار پر کردن فرم ثبت‌نام اولیه ---
  async function initiateAutofillFlow() {
    showHud(`درحال شناسایی فیلدهای ثبت‌نام برای «${activeTarget?.persianName || window.location.hostname}»...`);

    const hasFormInputs = document.querySelector('input[type="text"], input[type="tel"], input[type="password"]');
    if (!hasFormInputs) {
      const regLink = findRegistrationLink();
      if (regLink) {
        showHud('هدایت هوشمند به صفحه عضویت پورتال...');
        setTimeout(() => regLink.click(), 800);
        return;
      }
    }

    setTimeout(() => {
      executeFormFilling();
    }, 1200);
  }

  function findRegistrationLink() {
    const candidates = Array.from(document.querySelectorAll('a, button'));
    for (const el of candidates) {
      const text = (el.innerText || el.textContent || '').trim().toLowerCase();
      const href = (el.getAttribute('href') || '').toLowerCase();
      
      if (text.includes('ثبت نام') || text.includes('عضویت') || text.includes('حساب جدید') ||
          text.includes('sign up') || text.includes('register') || href.includes('reg') || href.includes('signup')) {
        return el;
      }
    }
    return null;
  }

  function executeFormFilling() {
    if (!credentials) return;

    const phoneInput = document.querySelector('input[type="tel"], input[name*="phone"], input[name*="mobile"], input[id*="phone"], input[id*="mobile"], input[placeholder*="موبایل"], input[placeholder*="همراه"]');
    const userInput = document.querySelector('input[name*="user"], input[name*="username"], input[id*="user"], input[placeholder*="نام کاربری"]');
    const emailInput = document.querySelector('input[type="email"], input[name*="email"], input[id*="email"], input[placeholder*="ایمیل"], input[placeholder*="پست"]');
    const passwordInputs = Array.from(document.querySelectorAll('input[type="password"]'));
    const termsCheckbox = document.querySelector('input[type="checkbox"][name*="rule"], input[type="checkbox"][name*="term"], input[type="checkbox"][id*="agree"]');

    let filledCount = 0;

    if (phoneInput && credentials.phone) {
      setNativeValue(phoneInput, credentials.phone);
      filledCount++;
    }

    if (userInput && credentials.username) {
      setNativeValue(userInput, credentials.username);
      filledCount++;
    }

    if (emailInput && credentials.email) {
      setNativeValue(emailInput, credentials.email);
      filledCount++;
    }

    if (passwordInputs.length > 0 && credentials.password) {
      setNativeValue(passwordInputs[0], credentials.password);
      filledCount++;
      if (passwordInputs.length > 1) {
        setNativeValue(passwordInputs[1], credentials.password);
      }
    }

    if (termsCheckbox) {
      termsCheckbox.checked = true;
      termsCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const captchaElem = document.querySelector('iframe[src*="captcha"], iframe[src*="recaptcha"], div[class*="captcha"], div[class*="turnstile"]');
    const otpElem = document.querySelector('input[name*="otp"], input[placeholder*="کد تایید"], input[placeholder*="پیامک"]');

    if (captchaElem || otpElem) {
      showHud('گیت امنیتی (کپچا / کد پیامکی) شناسایی شد. سامانه منتظر تایید است.', true);
      chrome.runtime.sendMessage({
        type: 'CONTENT_NEEDS_HUMAN',
        reason: captchaElem ? 'حل کپچا مورد نیاز است' : 'کد پیامکی OTP مورد نیاز است'
      });
      return;
    }

    if (filledCount > 0) {
      showHud('اطلاعات تزریق شد. در حال ارسال فرم ثبت‌نام...');
      setTimeout(() => {
        const submitBtn = findSubmitButton();
        if (submitBtn) {
          submitBtn.click();
          chrome.runtime.sendMessage({ type: 'CONTENT_FORM_SUBMITTED' });
        }
      }, 1000);
    }
  }

  function injectOtpCode(code) {
    if (!code) return;
    const otpInputs = Array.from(document.querySelectorAll('input[type="tel"], input[name*="otp"], input[name*="code"], input[placeholder*="کد"], input[placeholder*="تایید"]'));
    if (otpInputs.length > 0) {
      setNativeValue(otpInputs[0], code);
      showHud(`کد OTP (${code}) با موفقیت تزریق شد.`);
      setTimeout(() => {
        const confirmBtn = findSubmitButton();
        if (confirmBtn) confirmBtn.click();
      }, 500);
    }
  }

  function findSubmitButton() {
    const candidates = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"], button, .btn-primary, .submit-btn'));
    for (const b of candidates) {
      const text = (b.innerText || b.value || '').trim();
      if (text.includes('ثبت آگهی') || text.includes('ارسال آگهی') || text.includes('ذخیره') || text.includes('ثبت نام') || text.includes('تایید') || text.includes('ادامه')) {
        return b;
      }
    }
    return document.querySelector('button[type="submit"], input[type="submit"]');
  }

  function setNativeValue(element, value) {
    const proto = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function extractStorageTokens() {
    const tokens = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('token') || key.includes('auth') || key.includes('user') || key.includes('jwt') || key.includes('session'))) {
          tokens[key] = localStorage.getItem(key);
        }
      }
    } catch (e) {}
    return tokens;
  }

  function waitMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();
