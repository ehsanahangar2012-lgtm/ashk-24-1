/**
 * سامانه یکپارچه افزونه اشک ۲۴ (ASHK 24 Deep Adaptive Autonomous Extension v5.8.3)
 * موتور پایش عمیق، بستن خودکار پاپ‌آپ‌ها، کشف هوشمند دکمه‌ها، تفکیک معنایی فیلدها و یادگیری تطبیقی
 */

(function () {
  const EXT_VERSION = (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version) || '5.8.3';

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
    companyName: 'مجتمع چاپ و کارتن‌سازی اشک قلم',
    province: 'خراسان رضوی',
    city: 'مشهد',
    category: 'بسته‌بندی و کارتن‌سازی',
    price: 'توافقی'
  };

  const isAshkWebApp = Boolean(
    document.getElementById('root') ||
    (document.title && document.title.includes('اشک')) ||
    document.querySelector('meta[name="application-name"][content*="اشک"]') ||
    document.documentElement.getAttribute('data-ashk24-app') ||
    (window.location.port === '3000') ||
    window.location.pathname.includes('ashk')
  );

  // =========================================================================
  // ۱. ماژول بستن خودکار پاپ‌آپ‌ها، بنرها و مودال‌های مزاحم (Smart Popup Interceptor)
  // =========================================================================
  function autoDismissPopups() {
    if (isAshkWebApp) return;

    try {
      // پیدا کردن دکمه‌های بستن با سلکتورهای متداول
      const closeSelectors = [
        'button[aria-label*="close" i]',
        'button[aria-label*="بستن"]',
        'button.close',
        'button.modal-close',
        'button.popup-close',
        'button.btn-close',
        'button.ant-modal-close',
        'button.swal2-close',
        'a[class*="close" i]',
        'div[class*="close" i]',
        'span[class*="close" i]',
        '[data-dismiss="modal"]',
        '[data-modal-hide]',
        '[data-close]',
        '[data-testid*="close" i]'
      ];

      const closeButtons = document.querySelectorAll(closeSelectors.join(','));
      closeButtons.forEach((btn) => {
        if (btn && btn.offsetParent !== null) { // فقط المان‌های مرئی
          btn.click();
          console.log('[Ashk24] Dismissed popup via selector:', btn);
        }
      });

      // بررسی دکمه‌ها با متن‌های فارسی بستن / انصراف / رد کردن
      const allButtons = document.querySelectorAll('button, a[role="button"], span[role="button"]');
      const dismissTexts = ['بستن', 'انصراف', 'رد کردن', 'بعداً', 'متوجه شدم', 'خروج', 'dismiss', 'skip', 'close', '✕', '×', '✖'];

      allButtons.forEach((btn) => {
        const txt = (btn.textContent || '').trim().toLowerCase();
        if (btn.offsetParent !== null && dismissTexts.some((dt) => txt === dt || txt === `✕` || txt === `×`)) {
          // بررسی اینکه داخل مودال با z-index بالا باشد
          const parent = btn.closest('div[style*="z-index"], dialog, .modal, .popup, [role="dialog"]');
          if (parent) {
            btn.click();
            console.log('[Ashk24] Dismissed modal by text content:', txt);
          }
        }
      });

      // پاکسازی لایه‌های کدر (backdrop) قفل‌کننده صفحه در صورت بسته نشدن
      document.querySelectorAll('.modal-backdrop, .backdrop, [class*="overlay"][style*="fixed"]').forEach((bd) => {
        if (bd.offsetParent !== null && bd.style.position === 'fixed' && !bd.querySelector('form')) {
          bd.style.display = 'none';
        }
      });
    } catch (e) {}
  }

  // اجرای پاکسازی پاپ‌آپ‌ها پس از لود صفحه و پس از تاخیر کوتاه
  if (!isAshkWebApp) {
    autoDismissPopups();
    setTimeout(autoDismissPopups, 1200);
    setTimeout(autoDismissPopups, 3000);
  }

  // =========================================================================
  // ۲. کشف هوشمند دکمه‌های ورود / ثبت‌نام / ثبت آگهی در صفحات اصلی
  // =========================================================================
  function detectActionButtons() {
    if (isAshkWebApp) return null;

    const actionKeywords = {
      postAd: ['ثبت آگهی', 'درج آگهی', 'ثبت آگهی رایگان', 'ارسال آگهی', 'آگهی جدید', 'افزودن آگهی', 'post ad', 'new ad', 'submit ad'],
      login: ['ورود', 'ورود / ثبت نام', 'ورود به حساب', 'ورود کاربران', 'لاگین', 'login', 'sign in'],
      register: ['ثبت نام', 'عضویت', 'نام نویسی', 'ایجاد حساب', 'register', 'sign up']
    };

    const foundActions = {
      postAdButton: null,
      loginButton: null,
      registerButton: null
    };

    const candidates = document.querySelectorAll('a, button, div[role="button"], [class*="btn"], [class*="button"]');
    candidates.forEach((el) => {
      if (el.offsetParent === null) return; // غیرمرئی است
      const text = (el.textContent || '').trim().toLowerCase();
      const href = (el.getAttribute('href') || '').toLowerCase();

      // ثبت آگهی
      if (!foundActions.postAdButton && actionKeywords.postAd.some((kw) => text.includes(kw) || href.includes('new') || href.includes('post') || href.includes('add'))) {
        foundActions.postAdButton = el;
      }

      // ورود
      if (!foundActions.loginButton && actionKeywords.login.some((kw) => text.includes(kw) || href.includes('login') || href.includes('signin'))) {
        foundActions.loginButton = el;
      }

      // ثبت‌نام
      if (!foundActions.registerButton && actionKeywords.register.some((kw) => text.includes(kw) || href.includes('register') || href.includes('signup'))) {
        foundActions.registerButton = el;
      }
    });

    return foundActions;
  }

  // =========================================================================
  // ۳. موتور طبقه‌بندی معنایی چندسیگنالی و جلوگیری از اختلاط فیلدها
  // =========================================================================
  function classifyInputElement(el) {
    const tagName = el.tagName.toUpperCase();
    const type = (el.type || 'text').toLowerCase();
    const name = (el.name || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const placeholder = (el.placeholder || '').toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    const testId = (el.getAttribute('data-testid') || '').toLowerCase();

    // استخراج متن لیبل متصل
    let labelText = '';
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl) labelText = lbl.textContent.toLowerCase();
    }
    if (!labelText && el.closest('label')) {
      labelText = el.closest('label').textContent.toLowerCase();
    }
    if (!labelText) {
      const prev = el.previousElementSibling;
      if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'P')) {
        labelText = prev.textContent.toLowerCase();
      }
    }

    const combined = `${labelText} ${placeholder} ${name} ${id} ${ariaLabel} ${testId}`.trim();

    // 1. فیلد موبایل
    if (type === 'tel' || combined.includes('موبایل') || combined.includes('همراه') || combined.includes('mobile') || combined.includes('cellphone') || name.includes('phone') || id.includes('phone')) {
      if (!combined.includes('ثابت') && !combined.includes('کد پستی')) {
        return 'mobile_phone';
      }
    }

    // 2. فیلد نام شرکت یا کسب‌وکار
    if (combined.includes('نام شرکت') || combined.includes('نام مجتمع') || combined.includes('نام برند') || combined.includes('فروشگاه') || name.includes('company') || id.includes('company')) {
      return 'company_name';
    }

    // 3. فیلد نام شخص رابط (فقط نام شخص - نه شرکت و نه عنوان)
    if (combined.includes('نام و نام خانوادگی') || combined.includes('نام آگهی دهنده') || combined.includes('نام رابط') || combined.includes('نام مسئول') || name.includes('fullname') || name.includes('contact_name')) {
      return 'contact_person';
    }
    if ((combined.includes('نام') || name.includes('name')) && !combined.includes('شرکت') && !combined.includes('کاربری') && !combined.includes('آگهی') && !combined.includes('عنوان')) {
      return 'contact_person';
    }

    // 4. فیلد عنوان آگهی
    if (combined.includes('عنوان') || combined.includes('تیتر') || combined.includes('موضوع') || name.includes('title') || id.includes('title') || name.includes('subject') || id.includes('subject')) {
      return 'ad_title';
    }

    // 5. فیلد توضیحات و متن کامل
    if (tagName === 'TEXTAREA' || combined.includes('توضیح') || combined.includes('شرح') || combined.includes('متن') || name.includes('desc') || id.includes('desc') || name.includes('content') || id.includes('content') || name.includes('body')) {
      return 'ad_description';
    }

    // 6. استان و شهر
    if (combined.includes('استان') || name.includes('province') || id.includes('province') || name.includes('state')) {
      return 'province';
    }
    if (combined.includes('شهر') || name.includes('city') || id.includes('city')) {
      return 'city';
    }

    // 7. دسته‌بندی
    if (combined.includes('دسته') || combined.includes('گروه') || name.includes('cat') || id.includes('cat') || name.includes('group')) {
      return 'category';
    }

    // 8. کد OTP
    if (combined.includes('کد تایید') || combined.includes('کد پیامک') || combined.includes('رمز یکبار') || name.includes('otp') || id.includes('otp') || name.includes('code')) {
      return 'otp_code';
    }

    // 9. پذیرش قوانین
    if (type === 'checkbox' && (combined.includes('قوانین') || combined.includes('مقررات') || combined.includes('شرایط') || combined.includes('agree') || combined.includes('term') || combined.includes('rule'))) {
      return 'terms_agree';
    }

    return 'unknown';
  }

  function setNativeValue(element, value) {
    if (!element) return;
    try {
      element.focus();
      const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
      const prototype = Object.getPrototypeOf(element);
      const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

      if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
      } else if (valueSetter) {
        valueSetter.call(element, value);
      } else {
        element.value = value;
      }

      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
    } catch (e) {
      element.value = value;
    }
  }

  function selectDropdownOption(selectEl, matchText) {
    if (!selectEl || !selectEl.options) return false;
    const cleanMatch = (matchText || '').trim().toLowerCase();
    for (let i = 0; i < selectEl.options.length; i++) {
      const opt = selectEl.options[i];
      const optText = (opt.text || opt.innerText || '').toLowerCase();
      if (optText.includes(cleanMatch) || cleanMatch.includes(optText)) {
        selectEl.selectedIndex = i;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  // =========================================================================
  // ۴. موتور اجرای ثبت و درج آگهی هوشمند با تفکیک دقیق فیلدها
  // =========================================================================
  async function executeAdPublicationFlow(job, campaign, company) {
    const title = campaign?.title || job?.campaignTitle || activePayload.title;
    const content = campaign?.content || job?.campaignContent || activePayload.content;
    const phone = company?.phoneNumber || job?.contactPhone || activePayload.phone;
    const contactName = company?.contactPerson || job?.contactPerson || activePayload.contactName;
    const companyName = company?.name || company?.brandName || activePayload.companyName;
    const province = company?.province || activePayload.province;
    const city = company?.city || activePayload.city;

    autoDismissPopups();

    renderInPageFloatingHud(`درحال تحلیل فیلدها و تزریق بدون تداخل به «${window.location.hostname}»...`);

    let filledCount = 0;
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select, div[contenteditable="true"]'));

    allInputs.forEach((el) => {
      if (el.offsetParent === null) return; // فیلد مخفی است
      const role = classifyInputElement(el);

      switch (role) {
        case 'ad_title':
          setNativeValue(el, title);
          filledCount++;
          break;
        case 'ad_description':
          if (el.tagName === 'TEXTAREA') {
            setNativeValue(el, content);
          } else {
            el.focus();
            el.innerText = content;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
          filledCount++;
          break;
        case 'mobile_phone':
          setNativeValue(el, phone);
          filledCount++;
          break;
        case 'contact_person':
          setNativeValue(el, contactName);
          filledCount++;
          break;
        case 'company_name':
          setNativeValue(el, companyName);
          filledCount++;
          break;
        case 'province':
          if (el.tagName === 'SELECT') {
            selectDropdownOption(el, province);
            filledCount++;
          }
          break;
        case 'city':
          if (el.tagName === 'SELECT') {
            selectDropdownOption(el, city);
            filledCount++;
          }
          break;
        case 'terms_agree':
          if (el.type === 'checkbox') {
            el.checked = true;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
          break;
        default:
          break;
      }
    });

    renderInPageFloatingHud(`تعداد ${filledCount} فیلد با موفقیت و بدون تداخل با مقادیر واقعی پر شد.`);
  }

  // =========================================================================
  // ۵. دستیار شناور هوشمند در صفحه با دکمه بستن پاپ‌آپ و کشف دکمه‌های ناوبری
  // =========================================================================
  function renderInPageFloatingHud(statusText = 'آماده پایش هوشمند و درج آگهی', isWarning = false) {
    if (isAshkWebApp) return;

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

    const actions = detectActionButtons();

    hudElement.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #334155;padding-bottom:8px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${isWarning ? '#f59e0b' : '#10b981'};box-shadow:0 0 10px ${isWarning ? '#f59e0b' : '#10b981'};"></span>
          <span style="font-weight:bold;color:#38bdf8;font-size:13px;">دستیار هوشمند انتشار اشک ۲۴</span>
        </div>
        <button id="ashk-hud-min-btn" style="background:#1e293b;border:none;color:#94a3b8;padding:2px 8px;border-radius:6px;cursor:pointer;font-size:11px;">–</button>
      </div>

      <div style="font-size:12px;color:#cbd5e1;margin-bottom:10px;">${statusText}</div>

      <!-- Action Navigation Buttons if on Landing Page -->
      ${actions && actions.postAdButton ? `
        <div style="margin-bottom:8px;padding:6px 10px;background:#1e293b;border-radius:8px;font-size:11px;display:flex;align-items:center;justify-content:space-between;">
          <span style="color:#38bdf8;font-weight:bold;">دکمه ثبت آگهی شناسایی شد:</span>
          <button id="ashk-btn-goto-postad" style="background:#0284c7;color:#fff;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:10px;">کلیک و ورود ←</button>
        </div>
      ` : ''}

      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        <button id="ashk-btn-autofill" style="background:#059669;color:#fff;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:11px;display:flex;align-items:center;gap:4px;">
          <span>🚀</span><span>پر کردن هوشمند فیلدها</span>
        </button>
        <button id="ashk-btn-trigger-otp" style="background:#0284c7;color:#fff;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:11px;display:flex;align-items:center;gap:4px;" title="درج شماره موبایل 09153108763 و درخواست واقعی پیامک">
          <span>📲</span><span>درخواست پیامک OTP</span>
        </button>
        <button id="ashk-btn-dismiss-popups" style="background:#475569;color:#fff;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:11px;display:flex;align-items:center;gap:4px;">
          <span>✕</span><span>بستن پاپ‌آپ‌ها</span>
        </button>
        <button id="ashk-btn-otp" style="background:#d97706;color:#fff;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:11px;display:flex;align-items:center;gap:4px;">
          <span>🔑</span><span>درج کد OTP</span>
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

    const triggerOtpBtn = document.getElementById('ashk-btn-trigger-otp');
    if (triggerOtpBtn) {
      triggerOtpBtn.onclick = () => {
        requestRealOtpOnCurrentPage(activePayload.phone || '09153108763');
      };
    }

    const dismissBtn = document.getElementById('ashk-btn-dismiss-popups');
    if (dismissBtn) {
      dismissBtn.onclick = () => {
        autoDismissPopups();
        renderInPageFloatingHud('پاپ‌آپ‌ها و بنرهای مزاحم اسکن و بسته شدند.');
      };
    }

    const gotoPostAdBtn = document.getElementById('ashk-btn-goto-postad');
    if (gotoPostAdBtn && actions && actions.postAdButton) {
      gotoPostAdBtn.onclick = () => {
        actions.postAdButton.click();
      };
    }

    const otpBtn = document.getElementById('ashk-btn-otp');
    if (otpBtn) {
      otpBtn.onclick = () => {
        const code = prompt('کد تایید پیامک (OTP) دریافتی را وارد نمایید:');
        if (code) {
          const otpInput = document.querySelector('input[name*="otp" i], input[name*="code" i], input[type="tel"]:not([placeholder*="09"]), input[id*="otp" i], input[id*="code" i]');
          if (otpInput) {
            setNativeValue(otpInput, code.trim());
            renderInPageFloatingHud('کد OTP در فیلد مربوطه تزریق شد.');
          } else {
            renderInPageFloatingHud(`کد ${code} در حافظه موقت کپی شد.`);
            try { navigator.clipboard.writeText(code.trim()); } catch (e) {}
          }
        }
      };
    }
  }

  // =========================================================================
  // ماژول درخواست واقعی پیامک ورود در صفحه فعال (Real In-Browser OTP Requester)
  // =========================================================================
  function requestRealOtpOnCurrentPage(phoneNumber = '09153108763') {
    const phoneSelectors = [
      'input[type="tel"]',
      'input[name*="mobile" i]',
      'input[name*="phone" i]',
      'input[name*="cell" i]',
      'input[id*="mobile" i]',
      'input[id*="phone" i]',
      'input[placeholder*="موبایل"]',
      'input[placeholder*="همراه"]',
      'input[placeholder*="09"]',
      'input[aria-label*="موبایل"]'
    ];

    let phoneInput = null;
    for (const sel of phoneSelectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        phoneInput = el;
        break;
      }
    }

    if (phoneInput) {
      setNativeValue(phoneInput, phoneNumber);
      phoneInput.style.border = '2px solid #10b981';
      phoneInput.style.backgroundColor = '#ecfdf5';
    }

    // جستجوی دکمه ارسال پیامک یا ورود
    const btnTexts = ['ارسال کد', 'دریافت کد', 'ارسال پیامک', 'ادامه', 'تایید و ادامه', 'ورود', 'ثبت نام', 'send code', 'get otp'];
    let submitBtn = null;
    const candidates = document.querySelectorAll('button, input[type="submit"], a[role="button"], div[role="button"], [class*="btn"]');
    for (const c of candidates) {
      if (c.offsetParent === null) continue;
      const txt = (c.textContent || c.value || '').trim().toLowerCase();
      if (btnTexts.some(bt => txt === bt || txt.includes(bt))) {
        submitBtn = c;
        break;
      }
    }

    if (submitBtn) {
      submitBtn.style.outline = '3px solid #38bdf8';
      setTimeout(() => {
        submitBtn.click();
      }, 300);
      renderInPageFloatingHud(`شماره ${phoneNumber} در فیلد درج شد و درخواست ارسال پیامک کلیک گردید. پیامک به موبایل شما ارسال خواهد شد.`);
      return true;
    } else {
      renderInPageFloatingHud(`شماره ${phoneNumber} در فیلد شماره موبایل درج شد. لطفاً دکمه دریافت کد پیامک را کلیک نمایید.`);
      return false;
    }
  }

  // =========================================================================
  // همگام‌سازی خودکار آدرس سرور هاست با افزونه (Host Auto-Discovery & Sync)
  // =========================================================================
  if (isAshkWebApp) {
    const currentOrigin = window.location.origin;
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'ASHK_SET_ORCHESTRATOR',
          orchestratorUrl: currentOrigin
        }, (res) => {
          if (chrome.runtime.lastError) {}
          window.postMessage({
            type: 'ASHK_EXTENSION_HOST_ACK',
            host: currentOrigin,
            version: EXT_VERSION,
            success: true
          }, '*');
        });
      }
    } catch (e) {}

    window.addEventListener('message', (event) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'ASHK_SYNC_HOST_REQUEST') {
        const originToSync = event.data.origin || window.location.origin;
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'ASHK_SET_ORCHESTRATOR',
            orchestratorUrl: originToSync
          }, () => {
            window.postMessage({
              type: 'ASHK_EXTENSION_HOST_ACK',
              host: originToSync,
              version: EXT_VERSION,
              success: true
            }, '*');
          });
        }
      }
    });
  }

  // ارتباط با پیام‌های داشبورد و سایر تب‌ها
  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'ASHK_EXECUTE_AD_PUBLICATION') {
      executeAdPublicationFlow(event.data.job, event.data.campaign, event.data.company);
    }
    if (event.data.type === 'ASHK_DISMISS_POPUPS') {
      autoDismissPopups();
    }
    if (event.data.type === 'ASHK_TRIGGER_REAL_OTP') {
      requestRealOtpOnCurrentPage(event.data.phoneNumber || activePayload.phone || '09153108763');
    }
  });

  // چک کردن پارامترهای خودکار در URL (مثلاً باز شدن با هدف درخواست پیامک)
  if (!isAshkWebApp) {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ashk_action') === 'trigger_otp') {
      setTimeout(() => {
        requestRealOtpOnCurrentPage('09153108763');
      }, 1000);
    }

    setTimeout(() => {
      renderInPageFloatingHud('آماده پایش هوشمند صفحه و بستن بنرهای مزاحم.');
    }, 1500);
  }
})();
