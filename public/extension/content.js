/**
 * سامانه یکپارچه افزونه اشک ۲۴ (ASHK 24 Unified Extension v5.5.0)
 * موتور اجرای هوشمند پایش و تحلیل صفحات، کشف فیلدها، تزریق خودکار و ثبت آگهی با کد OTP
 */

(function () {
  const EXT_VERSION = (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version) || '5.5.0';

  try {
    document.documentElement.setAttribute('data-ashk24-extension', 'installed');
    document.documentElement.setAttribute('data-ashk24-version', EXT_VERSION);
  } catch (e) {}

  let hudElement = null;
  let isHudMinimized = false;
  let activePayload = {
    title: 'تولید و فروش انواع کارتن و جعبه بسته‌بندی اشک ۲۴',
    content: 'طراحی، چاپ و تولید انواع کارتن ۳ لایه و ۵ لایه لمینتی، دایکاتی، صادراتی و دارویی با بالاترین کیفیت و ارسال فوری به سراسر کشور از شهرک صنعتی مشهد.',
    phone: '09153108763',
    contactName: 'مهندس احسان آهنگر',
    province: 'خراسان رضوی',
    city: 'مشهد',
    category: 'بسته‌بندی و کارتن‌سازی',
    price: 'توافقی'
  };

  // بررسی حضور در صفحه داشبورد اشک ۲۴
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
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message || typeof message !== 'object') return;

      window.postMessage(message, '*');
      try {
        document.dispatchEvent(new CustomEvent('ASHK_EXT_EVENT', { detail: message }));
      } catch (e) {}

      // اجرای انتشار آگهی کامل
      if (message.type === 'ASHK_EXECUTE_AD_PUBLICATION') {
        if (message.campaign?.title || message.job?.campaignTitle) {
          activePayload.title = message.campaign?.title || message.job?.campaignTitle;
        }
        if (message.campaign?.content || message.job?.campaignContent) {
          activePayload.content = message.campaign?.content || message.job?.campaignContent;
        }
        if (message.company?.phoneNumber || message.job?.contactPhone) {
          activePayload.phone = message.company?.phoneNumber || message.job?.contactPhone;
        }
        if (message.company?.contactPerson || message.job?.contactPerson) {
          activePayload.contactName = message.company?.contactPerson || message.job?.contactPerson;
        }

        executeAdPublicationFlow(message.job, message.campaign, message.company);
        sendResponse({ status: 'ad_publication_initiated' });
        return true;
      }

      // تزریق کد OTP
      if (message.type === 'ASHK_INJECT_OTP_CODE') {
        injectOtpCode(message.code);
        sendResponse({ status: 'otp_injected' });
        return true;
      }

      // اسکن و پایش فیلدها
      if (message.type === 'ASHK_SCAN_PAGE_FIELDS') {
        const scanResult = scanPageFormFields();
        sendResponse({ fields: scanResult });
        return true;
      }

      return true;
    });
  }

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
    if (data.type === 'ASHK_EXECUTE_AD_PUBLICATION') {
      executeAdPublicationFlow(data.job, data.campaign, data.company);
    }
    if (data.type === 'ASHK_INJECT_OTP_CODE') {
      injectOtpCode(data.code || data.otpCode);
    }
    if (data.type === 'ASHK_APP_QUERY_EXTENSION') {
      broadcastReady();
    }
  }

  // =========================================================================
  // دستیار شناور و تعاملی در صفحه مقصد (Interactive Floating In-Page Assistant)
  // =========================================================================
  function renderInPageFloatingHud(statusText = 'آماده پایش و ثبت آگهی', isWarning = false) {
    if (isAshkWebApp) return; // داخل خود داشبورد نیازی به هد شناور نیست

    if (!hudElement) {
      hudElement = document.createElement('div');
      hudElement.id = 'ashk24-floating-hud';
      hudElement.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        background: #0f172a;
        color: #f8fafc;
        font-family: Vazirmatn, Tahoma, -apple-system, sans-serif;
        font-size: 12px;
        padding: 14px 18px;
        border-radius: 16px;
        box-shadow: 0 16px 40px rgba(0,0,0,0.7);
        border: 1px solid #10b981;
        direction: rtl;
        max-width: 380px;
        line-height: 1.6;
        user-select: none;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(hudElement);
    }

    if (isHudMinimized) {
      hudElement.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;" id="ashk-hud-expand">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981;"></span>
            <span style="font-weight:bold;color:#38bdf8;">اشک ۲۴ (v${EXT_VERSION})</span>
          </div>
          <span style="color:#94a3b8;font-size:11px;">[باز کردن]</span>
        </div>
      `;
      const expandBtn = document.getElementById('ashk-hud-expand');
      if (expandBtn) {
        expandBtn.onclick = () => {
          isHudMinimized = false;
          renderInPageFloatingHud(statusText, isWarning);
        };
      }
      return;
    }

    hudElement.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #334155;padding-bottom:8px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${isWarning ? '#f59e0b' : '#10b981'};box-shadow:0 0 10px ${isWarning ? '#f59e0b' : '#10b981'};"></span>
          <span style="font-weight:bold;color:#38bdf8;font-size:13px;">دستیار هوشمند انتشار اشک ۲۴</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button id="ashk-hud-min-btn" style="background:#1e293b;border:none;color:#94a3b8;padding:2px 8px;border-radius:6px;cursor:pointer;font-size:11px;">–</button>
        </div>
      </div>
      <div style="font-size:12px;color:#cbd5e1;margin-bottom:10px;">${statusText}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        <button id="ashk-btn-autofill" style="background:#059669;color:#fff;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:11px;display:flex;align-items:center;gap:4px;">
          <span>🚀</span><span>تکمیل خودکار آگهی</span>
        </button>
        <button id="ashk-btn-otp" style="background:#d97706;color:#fff;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:11px;display:flex;align-items:center;gap:4px;">
          <span>🔑</span><span>درج کد OTP</span>
        </button>
        <button id="ashk-btn-submit" style="background:#2563eb;color:#fff;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:11px;display:flex;align-items:center;gap:4px;">
          <span>✓</span><span>ثبت نهایی</span>
        </button>
      </div>
    `;

    // Bind In-Page HUD Buttons
    const minBtn = document.getElementById('ashk-hud-min-btn');
    if (minBtn) {
      minBtn.onclick = () => {
        isHudMinimized = true;
        renderInPageFloatingHud();
      };
    }

    const autofillBtn = document.getElementById('ashk-btn-autofill');
    if (autofillBtn) {
      autofillBtn.onclick = () => {
        executeAdPublicationFlow();
      };
    }

    const otpBtn = document.getElementById('ashk-btn-otp');
    if (otpBtn) {
      otpBtn.onclick = () => {
        const code = prompt('کد تایید پیامک (OTP) را وارد نمایید:');
        if (code) injectOtpCode(code);
      };
    }

    const submitBtn = document.getElementById('ashk-btn-submit');
    if (submitBtn) {
      submitBtn.onclick = () => {
        const sub = findSubmitButton();
        if (sub) {
          sub.click();
          renderInPageFloatingHud('دکمه ثبت فرم کلیک شد.');
        } else {
          renderInPageFloatingHud('دکمه ثبت یافت نشد.', true);
        }
      };
    }
  }

  // بررسی خودکار حضور در صفحات آگهی
  if (!isAshkWebApp) {
    setTimeout(() => {
      const hasInputs = document.querySelector('input, textarea, form');
      if (hasInputs) {
        renderInPageFloatingHud('فرم شناسایی شد. آماده تزریق محتوای کارتن اشک ۲۴.');
      }
    }, 1500);
  }

  // =========================================================================
  // موتور اجرای ثبت و درج آگهی جامع با پروتکل Native Event Setter
  // =========================================================================
  async function executeAdPublicationFlow(job, campaign, company) {
    const title = campaign?.title || job?.campaignTitle || activePayload.title;
    const content = campaign?.content || job?.campaignContent || activePayload.content;
    const phone = company?.phoneNumber || job?.contactPhone || activePayload.phone;
    const contactName = company?.contactPerson || job?.contactPerson || activePayload.contactName;
    const province = company?.province || activePayload.province;
    const city = company?.city || activePayload.city;

    renderInPageFloatingHud(`درحال تحلیل فیلدها و تزریق داده‌ها به «${window.location.hostname}»...`);

    let filledCount = 0;

    // ۱. فیلد عنوان آگهی
    const titleInputs = Array.from(document.querySelectorAll(
      'input[name*="title"], input[id*="title"], input[placeholder*="عنوان"], input[name*="subject"], input[id*="subject"], input[name*="name"], [data-testid*="title"]'
    ));
    if (titleInputs.length > 0) {
      setNativeValue(titleInputs[0], title);
      filledCount++;
    }

    // ۲. فیلد توضیحات و شرح آگهی (Textarea یا Contenteditable)
    const contentInputs = Array.from(document.querySelectorAll(
      'textarea[name*="desc"], textarea[id*="desc"], textarea[name*="content"], textarea[id*="content"], textarea[name*="body"], textarea[placeholder*="توضیح"], textarea[placeholder*="متن"], textarea, div[contenteditable="true"], div.ql-editor, div[role="textbox"]'
    ));
    if (contentInputs.length > 0) {
      const targetContentEl = contentInputs[0];
      if (targetContentEl.tagName === 'TEXTAREA') {
        setNativeValue(targetContentEl, content);
      } else {
        // Rich Text Editor (div contenteditable)
        targetContentEl.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, content);
        targetContentEl.innerText = content;
        targetContentEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
      filledCount++;
    }

    // ۳. شماره تماس و همراه
    const phoneInputs = Array.from(document.querySelectorAll(
      'input[type="tel"], input[name*="phone"], input[name*="mobile"], input[id*="phone"], input[id*="mobile"], input[placeholder*="تماس"], input[placeholder*="همراه"], input[placeholder*="موبایل"], [data-testid*="mobile"]'
    ));
    if (phoneInputs.length > 0) {
      setNativeValue(phoneInputs[0], phone);
      filledCount++;
    }

    // ۴. نام رابط / نام آگهی‌دهنده
    const nameInputs = Array.from(document.querySelectorAll(
      'input[name*="contact"], input[name*="author"], input[name*="owner"], input[placeholder*="نام"], input[id*="contact"]'
    ));
    if (nameInputs.length > 0 && contactName) {
      setNativeValue(nameInputs[0], contactName);
      filledCount++;
    }

    // ۵. استان و شهر
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

    // ۶. انتخاب دسته‌بندی موضوعی آگهی
    const categorySelects = Array.from(document.querySelectorAll('select[name*="cat"], select[id*="cat"], select[name*="group"], select[id*="group"]'));
    if (categorySelects.length > 0) {
      selectDropdownOption(categorySelects[0], 'صنعت') || selectDropdownOption(categorySelects[0], 'خدمات');
      filledCount++;
    }

    // ۷. پذیرش قوانین (Terms & Conditions)
    const terms = document.querySelector('input[type="checkbox"][name*="rule"], input[type="checkbox"][name*="term"], input[type="checkbox"][id*="agree"], input[type="checkbox"][name*="agree"]');
    if (terms) {
      terms.checked = true;
      terms.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // ۸. حل کپچای عددی ساده اگر وجود داشته باشد
    solveSimpleMathCaptcha();

    // ۹. بررسی حضور فیلد کد تایید OTP
    const isOtpPresent = checkOtpPresent();
    if (isOtpPresent) {
      renderInPageFloatingHud('فیلد کد تایید پیامک شناسایی شد. لطفاً کد را وارد یا روی «درج کد OTP» کلیک کنید.', true);
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'CONTENT_NEEDS_HUMAN',
          reason: 'کد تایید پیامکی (OTP) مورد نیاز است',
          jobId: job?.id
        });
      }
      return;
    }

    if (filledCount >= 2) {
      renderInPageFloatingHud(`تعداد ${filledCount} فیلد با موفقیت تزریق شد. درحال کلیک دکمه ثبت...`);
      await waitMs(1000);

      const submitBtn = findSubmitButton();
      if (submitBtn) {
        submitBtn.click();
        renderInPageFloatingHud('دکمه ثبت زده شد. در انتظار تاییدیه انتشار...');

        setTimeout(() => {
          verifyAndReportPublication(job);
        }, 3500);
      } else {
        renderInPageFloatingHud('فیلدها پر شدند. دکمه ثبت نهایی را کلیک کنید.');
      }
    } else {
      renderInPageFloatingHud('فیلدهای فرم هنوز به طور کامل شناسایی نشده‌اند.', true);
    }
  }

  // =========================================================================
  // تزریق حرفه‌ای کد تایید OTP (تک فیلد یا چند کادر تک رقمی)
  // =========================================================================
  function injectOtpCode(code) {
    if (!code) return;
    const cleanCode = String(code).replace(/[^0-9]/g, '');

    // ۱. بررسی کادرهای چندتایی جداگانه (Split Multi-Box: مثلا ۴ یا ۵ یا ۶ اینپوت با maxlength=1)
    const splitBoxes = Array.from(document.querySelectorAll(
      'input[type="tel"][maxlength="1"], input[type="text"][maxlength="1"], input[inputmode="numeric"][maxlength="1"], input.otp-input, input.digit-input'
    ));

    if (splitBoxes.length >= cleanCode.length && cleanCode.length >= 4) {
      for (let i = 0; i < cleanCode.length; i++) {
        setNativeValue(splitBoxes[i], cleanCode[i]);
      }
      renderInPageFloatingHud(`کد OTP چند رقمی (${cleanCode}) در کادرهای جداگانه تزریق شد.`);
      setTimeout(() => {
        const confirmBtn = findSubmitButton();
        if (confirmBtn) confirmBtn.click();
      }, 500);
      return;
    }

    // ۲. فیلد تکی استاندارد OTP
    const otpInputs = Array.from(document.querySelectorAll(
      'input[type="tel"], input[name*="otp"], input[name*="code"], input[id*="otp"], input[id*="code"], input[placeholder*="کد"], input[placeholder*="تایید"], input[placeholder*="پیامک"], [data-testid*="otp"]'
    ));

    if (otpInputs.length > 0) {
      setNativeValue(otpInputs[0], cleanCode);
      renderInPageFloatingHud(`کد تایید OTP (${cleanCode}) با موفقیت تزریق شد.`);
      setTimeout(() => {
        const confirmBtn = findSubmitButton();
        if (confirmBtn) confirmBtn.click();
      }, 500);
    } else {
      renderInPageFloatingHud(`کد OTP دریافت شد (${cleanCode}) ولی فیلد آن در این صفحه پیدا نشد.`, true);
    }
  }

  function checkOtpPresent() {
    const otpElem = document.querySelector(
      'input[name*="otp"], input[name*="code"], input[id*="otp"], input[id*="code"], input[placeholder*="کد تایید"], input[placeholder*="پیامک"], input[maxlength="1"]'
    );
    const bodyText = document.body.innerText;
    return Boolean(otpElem || bodyText.includes('کد تایید پیامک') || bodyText.includes('ارسال کد به'));
  }

  // =========================================================================
  // تابع طلایی تنظیم Native Value برای سازگاری کامل با React / Vue / Angular
  // =========================================================================
  function setNativeValue(element, value) {
    if (!element) return;
    const proto = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    
    element.focus();
    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }

    // React 16+ value tracker bypass
    if (element._valueTracker) {
      element._valueTracker.setValue('');
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
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

  function findSubmitButton() {
    const candidates = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"], button, .btn-primary, .submit-btn'));
    for (const b of candidates) {
      const text = (b.innerText || b.value || '').trim();
      if (
        text.includes('ثبت آگهی') ||
        text.includes('ارسال آگهی') ||
        text.includes('ذخیره') ||
        text.includes('ثبت نام') ||
        text.includes('تایید') ||
        text.includes('ادامه') ||
        text.includes('مرحله بعد')
      ) {
        return b;
      }
    }
    return document.querySelector('button[type="submit"], input[type="submit"]');
  }

  function verifyAndReportPublication(job) {
    const currentUrl = window.location.href;
    const bodyText = document.body.innerText;

    let isSuccess = false;
    let trackingCode = null;

    if (
      bodyText.includes('با موفقیت ثبت') ||
      bodyText.includes('آگهی شما ثبت شد') ||
      bodyText.includes('در انتظار تایید') ||
      bodyText.includes('کد پیگیری') ||
      bodyText.includes('ثبت گردید') ||
      bodyText.includes('منتشر شد')
    ) {
      isSuccess = true;
      const trackMatch = bodyText.match(/کد پیگیری[:\s]+(\d+)/) || bodyText.match(/شناسه آگهی[:\s]+(\d+)/);
      if (trackMatch) trackingCode = trackMatch[1];
    }

    if (isSuccess || currentUrl !== job?.platformDomain) {
      renderInPageFloatingHud('آگهی با موفقیت ثبت شد و اطلاعات به سامانه اشک ۲۴ مخابره گردید.');
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'ASHK_AD_PUBLISHED_SUCCESS',
          jobId: job?.id,
          adUrl: currentUrl,
          trackingCode: trackingCode,
          reportedAt: new Date().toISOString()
        });
      }
    }
  }

  function scanPageFormFields() {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
    return inputs.map((el) => ({
      tagName: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || 'text',
      name: el.getAttribute('name') || '',
      id: el.getAttribute('id') || '',
      placeholder: el.getAttribute('placeholder') || ''
    }));
  }

  function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
})();
