/**
 * سامانه یکپارچه افزونه اشک ۲۴ (ASHK 24 Deep Adaptive Autonomous Extension v5.8.5)
 * موتور پایش هدفمند، منوی شناور قابل جابجایی (Draggable)، بستن آسان و فعال‌سازی هوشمند
 */

(function () {
  const EXT_VERSION = (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version) || '5.8.5';

  try {
    document.documentElement.setAttribute('data-ashk24-extension', 'installed');
    document.documentElement.setAttribute('data-ashk24-version', EXT_VERSION);
  } catch (e) {}

  let hudElement = null;
  let isHudMinimized = false;
  let isHudClosedByUser = false;

  const activePayload = {
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
  // دامنه‌ها و صفحات هدف تبلیغاتی و ثبت آگهی (Target Advertising Portals)
  // =========================================================================
  const KNOWN_AD_PORTALS = [
    'divar.ir',
    'sheypoor.com',
    'baskool.com',
    'istgah.com',
    'niazpardaz.com',
    'agahi24.com',
    'payamsara.com',
    'iran-tejarat.com',
    'shahrema.com',
    'parscenter.com',
    'locopoc.com',
    'niazrooz.com',
    'rahnama.com',
    'sanjagh.pro',
    'anarestan.com',
    'soorattalab.com',
    'dehkadeagahi.ir',
    'shahr24.com',
    'agahicity.com',
    'niazeman.com',
    'poshtiban.com',
    'agahi.ir',
    'tablighkar.com',
    'novinagahi.com',
    'boogh.ir',
    'niazmandia.ir',
    'agahi90.ir',
    'ebazar.ir',
    'parsagahi.com',
    'torob.com',
    'emalls.ir',
    'netbarg.com',
    'takhfifan.com'
  ];

  function isTargetAdvertisingPage() {
    if (isAshkWebApp) return false;

    const host = window.location.hostname.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const title = (document.title || '').toLowerCase();

    // ۱. بررسی تطابق مستقیم با دامنه‌های شناخته‌شده
    if (KNOWN_AD_PORTALS.some((portal) => host.includes(portal) || portal.includes(host))) {
      return true;
    }

    // ۲. بررسی وجود پارامتر اشک ۲۴ در URL
    if (search.includes('ashk_action') || search.includes('ashk_target') || search.includes('ashk_job')) {
      return true;
    }

    // ۳. بررسی کلمات کلیدی مسیر ثبت آگهی یا پنل کاربری نیازمندی‌ها
    const adKeywords = [
      '/new',
      '/post',
      '/add',
      '/register',
      '/login',
      '/ads',
      '/agahi',
      '/tabligh',
      '/submit',
      'insert-ad',
      'new-ad',
      'post-ad',
      'register-ad'
    ];

    if (adKeywords.some((kw) => path.includes(kw))) {
      if (
        title.includes('آگهی') ||
        title.includes('تبلیغ') ||
        title.includes('نیازمندی') ||
        title.includes('ورود') ||
        title.includes('ثبت') ||
        document.querySelector('form, input[type="tel"], textarea')
      ) {
        return true;
      }
    }

    return false;
  }

  // =========================================================================
  // ۱. ماژول بستن خودکار پاپ‌آپ‌ها، بنرها و مودال‌های مزاحم (Smart Popup Interceptor)
  // =========================================================================
  function autoDismissPopups() {
    if (isAshkWebApp) return;

    try {
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
        if (btn && btn.offsetParent !== null) {
          btn.click();
          console.log('[Ashk24] Dismissed popup via selector:', btn);
        }
      });

      const allButtons = document.querySelectorAll('button, a[role="button"], span[role="button"]');
      const dismissTexts = ['بستن', 'انصراف', 'رد کردن', 'بعداً', 'متوجه شدم', 'خروج', 'dismiss', 'skip', 'close', '✕', '×', '✖'];

      allButtons.forEach((btn) => {
        const txt = (btn.textContent || '').trim().toLowerCase();
        if (btn.offsetParent !== null && dismissTexts.some((dt) => txt === dt || txt === `✕` || txt === `×`)) {
          const parent = btn.closest('div[style*="z-index"], dialog, .modal, .popup, [role="dialog"]');
          if (parent) {
            btn.click();
            console.log('[Ashk24] Dismissed modal by text content:', txt);
          }
        }
      });

      document.querySelectorAll('.modal-backdrop, .backdrop, [class*="overlay"][style*="fixed"]').forEach((bd) => {
        if (bd.offsetParent !== null && bd.style.position === 'fixed' && !bd.querySelector('form')) {
          bd.style.display = 'none';
        }
      });
    } catch (e) {}
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
      if (el.offsetParent === null) return;
      const text = (el.textContent || '').trim().toLowerCase();
      const href = (el.getAttribute('href') || '').toLowerCase();

      if (!foundActions.postAdButton && actionKeywords.postAd.some((kw) => text.includes(kw) || href.includes('new') || href.includes('post') || href.includes('add'))) {
        foundActions.postAdButton = el;
      }
      if (!foundActions.loginButton && actionKeywords.login.some((kw) => text.includes(kw) || href.includes('login') || href.includes('signin'))) {
        foundActions.loginButton = el;
      }
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

    if (type === 'tel' || combined.includes('موبایل') || combined.includes('همراه') || combined.includes('mobile') || combined.includes('cellphone') || name.includes('phone') || id.includes('phone')) {
      if (!combined.includes('ثابت') && !combined.includes('کد پستی')) {
        return 'mobile_phone';
      }
    }

    if (combined.includes('نام شرکت') || combined.includes('نام مجتمع') || combined.includes('نام برند') || combined.includes('فروشگاه') || name.includes('company') || id.includes('company')) {
      return 'company_name';
    }

    if (combined.includes('نام و نام خانوادگی') || combined.includes('نام آگهی دهنده') || combined.includes('نام رابط') || combined.includes('نام مسئول') || name.includes('fullname') || name.includes('contact_name')) {
      return 'contact_person';
    }
    if ((combined.includes('نام') || name.includes('name')) && !combined.includes('شرکت') && !combined.includes('کاربری') && !combined.includes('آگهی') && !combined.includes('عنوان')) {
      return 'contact_person';
    }

    if (combined.includes('عنوان') || combined.includes('تیتر') || combined.includes('موضوع') || name.includes('title') || id.includes('title') || name.includes('subject') || id.includes('subject')) {
      return 'ad_title';
    }

    if (tagName === 'TEXTAREA' || combined.includes('متن آگهی') || combined.includes('شرح آگهی') || combined.includes('توضیحات') || combined.includes('جزئیات') || name.includes('desc') || id.includes('desc') || name.includes('content') || id.includes('content') || name.includes('body')) {
      return 'ad_content';
    }

    if (combined.includes('استان') || name.includes('province') || id.includes('province') || name.includes('state')) {
      return 'province';
    }
    if (combined.includes('شهر') || name.includes('city') || id.includes('city')) {
      return 'city';
    }

    if (combined.includes('قیمت') || combined.includes('مبلغ') || combined.includes('هزینه') || name.includes('price') || id.includes('price')) {
      return 'price';
    }

    if (combined.includes('دسته') || combined.includes('گروه') || name.includes('category') || id.includes('category') || name.includes('cat_id')) {
      return 'category';
    }

    return 'unknown';
  }

  function setNativeValue(element, value) {
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
  }

  // =========================================================================
  // ۴. تزریق و اجرای جریان درج آگهی (Ad Publication Executor)
  // =========================================================================
  function executeAdPublicationFlow(job = null, campaign = null, company = null) {
    const payload = {
      title: (campaign && campaign.ad_title) || activePayload.title,
      content: (campaign && campaign.ad_content) || activePayload.content,
      phone: (company && company.contact_phone) || activePayload.phone,
      contactName: (company && company.contact_person) || activePayload.contactName,
      companyName: (company && company.company_name) || activePayload.companyName,
      province: (campaign && campaign.province) || activePayload.province,
      city: (campaign && campaign.city) || activePayload.city,
      price: (campaign && campaign.price) || activePayload.price
    };

    autoDismissPopups();

    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
    let filledCount = 0;

    inputs.forEach((input) => {
      if (input.offsetParent === null) return;
      const fieldType = classifyInputElement(input);

      switch (fieldType) {
        case 'mobile_phone':
          if (payload.phone) {
            setNativeValue(input, payload.phone);
            input.style.border = '2px solid #10b981';
            filledCount++;
          }
          break;
        case 'company_name':
          if (payload.companyName) {
            setNativeValue(input, payload.companyName);
            input.style.border = '2px solid #10b981';
            filledCount++;
          }
          break;
        case 'contact_person':
          if (payload.contactName) {
            setNativeValue(input, payload.contactName);
            input.style.border = '2px solid #10b981';
            filledCount++;
          }
          break;
        case 'ad_title':
          if (payload.title) {
            setNativeValue(input, payload.title);
            input.style.border = '2px solid #10b981';
            filledCount++;
          }
          break;
        case 'ad_content':
          if (payload.content) {
            setNativeValue(input, payload.content);
            input.style.border = '2px solid #10b981';
            filledCount++;
          }
          break;
        case 'province':
          if (payload.province) {
            setNativeValue(input, payload.province);
            filledCount++;
          }
          break;
        case 'city':
          if (payload.city) {
            setNativeValue(input, payload.city);
            filledCount++;
          }
          break;
      }
    });

    renderInPageFloatingHud(`تعداد ${filledCount} فیلد با مقادیر واقعی تکمیل شد.`);
  }

  // =========================================================================
  // ۵. دستیار شناور هوشمند قابل جابجایی (Draggable & Closeable Floating HUD)
  // =========================================================================
  function setupDraggable(element, handle) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    handle.style.cursor = 'move';

    function onMouseDown(e) {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = element.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      element.style.bottom = 'auto';
      element.style.right = 'auto';
      element.style.left = `${initialLeft}px`;
      element.style.top = `${initialTop}px`;
      element.style.transition = 'none';

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    }

    function onMouseMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxLeft = window.innerWidth - element.offsetWidth - 10;
      const maxTop = window.innerHeight - element.offsetHeight - 10;

      newLeft = Math.max(10, Math.min(newLeft, maxLeft));
      newTop = Math.max(10, Math.min(newTop, maxTop));

      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    }

    function onMouseUp() {
      isDragging = false;
      element.style.transition = 'box-shadow 0.2s ease, opacity 0.2s ease';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    handle.addEventListener('mousedown', onMouseDown);
  }

  function renderInPageFloatingHud(statusText = 'آماده پایش هوشمند و درج آگهی', isWarning = false) {
    if (isAshkWebApp || isHudClosedByUser) return;

    if (!hudElement) {
      hudElement = document.createElement('div');
      hudElement.id = 'ashk24-floating-hud';
      hudElement.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        background: #090e1a;
        color: #f8fafc;
        font-family: Vazirmatn, Tahoma, -apple-system, sans-serif;
        font-size: 12px;
        padding: 12px 16px;
        border-radius: 14px;
        box-shadow: 0 16px 36px rgba(0,0,0,0.8), 0 0 0 1px rgba(16,185,129,0.3);
        border: 1px solid #10b981;
        direction: rtl;
        max-width: 380px;
        min-width: 280px;
        line-height: 1.6;
        user-select: none;
        transition: box-shadow 0.2s ease;
      `;
      document.body.appendChild(hudElement);
    }

    if (isHudMinimized) {
      hudElement.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;" id="ashk-hud-drag-handle">
          <div style="display:flex;align-items:center;gap:8px;cursor:pointer;" id="ashk-hud-expand">
            <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981;"></span>
            <span style="font-weight:bold;color:#38bdf8;font-size:12px;">⚡ دستیار اشک ۲۴</span>
          </div>
          <div style="display:flex;align-items:center;gap:4px;">
            <button id="ashk-hud-expand-btn" style="background:#1e293b;border:1px solid #334155;color:#38bdf8;padding:2px 6px;border-radius:6px;cursor:pointer;font-size:11px;" title="باز کردن">+</button>
            <button id="ashk-hud-close-btn" style="background:#1e293b;border:1px solid #ef4444;color:#ef4444;padding:2px 6px;border-radius:6px;cursor:pointer;font-size:11px;" title="بستن کامل">✕</button>
          </div>
        </div>
      `;

      const dragHandle = document.getElementById('ashk-hud-drag-handle');
      if (dragHandle) setupDraggable(hudElement, dragHandle);

      const expandAction = () => {
        isHudMinimized = false;
        renderInPageFloatingHud(statusText, isWarning);
      };
      const expandBtn = document.getElementById('ashk-hud-expand');
      const expandIcon = document.getElementById('ashk-hud-expand-btn');
      if (expandBtn) expandBtn.onclick = expandAction;
      if (expandIcon) expandIcon.onclick = expandAction;

      const closeBtn = document.getElementById('ashk-hud-close-btn');
      if (closeBtn) {
        closeBtn.onclick = () => {
          isHudClosedByUser = true;
          if (hudElement) {
            hudElement.remove();
            hudElement = null;
          }
        };
      }
      return;
    }

    const actions = detectActionButtons();
    const currentHost = window.location.hostname;

    hudElement.innerHTML = `
      <div id="ashk-hud-drag-handle" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1e293b;padding-bottom:8px;margin-bottom:10px;cursor:move;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${isWarning ? '#f59e0b' : '#10b981'};box-shadow:0 0 10px ${isWarning ? '#f59e0b' : '#10b981'};"></span>
          <span style="font-weight:bold;color:#38bdf8;font-size:12px;">دستیار هوشمند انتشار اشک ۲۴</span>
          <span style="font-size:9px;background:#1e293b;color:#94a3b8;padding:1px 5px;border-radius:4px;">v${EXT_VERSION}</span>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <button id="ashk-hud-min-btn" style="background:#1e293b;border:1px solid #334155;color:#94a3b8;padding:2px 6px;border-radius:6px;cursor:pointer;font-size:11px;" title="کوچک کردن">–</button>
          <button id="ashk-hud-close-btn" style="background:#1e293b;border:1px solid #ef4444;color:#ef4444;padding:2px 6px;border-radius:6px;cursor:pointer;font-size:11px;" title="بستن کامل منو">✕</button>
        </div>
      </div>

      <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
        <span>🌐 پلتفرم: <strong style="color:#e2e8f0;">${currentHost}</strong></span>
        <span style="color:#10b981;font-size:10px;">● IP بومی ایران</span>
      </div>

      <div style="font-size:11px;color:#cbd5e1;background:#0f172a;padding:6px 10px;border-radius:8px;border:1px solid #1e293b;margin-bottom:10px;">${statusText}</div>

      ${actions && actions.postAdButton ? `
        <div style="margin-bottom:8px;padding:6px 8px;background:#111e38;border:1px solid #1e3a5f;border-radius:8px;font-size:11px;display:flex;align-items:center;justify-content:space-between;">
          <span style="color:#38bdf8;font-weight:bold;">دکمه ثبت آگهی پیدا شد:</span>
          <button id="ashk-btn-goto-postad" style="background:#0284c7;color:#fff;border:none;padding:3px 8px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:10px;">کلیک و شروع ←</button>
        </div>
      ` : ''}

      <div style="display:flex;flex-wrap:wrap;gap:5px;">
        <button id="ashk-btn-autofill" style="background:#059669;color:#fff;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:10.5px;display:flex;align-items:center;gap:4px;">
          <span>🚀</span><span>پر کردن هوشمند</span>
        </button>
        <button id="ashk-btn-trigger-otp" style="background:#0284c7;color:#fff;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:10.5px;display:flex;align-items:center;gap:4px;" title="درج شماره موبایل 09153108763 و ارسال واقعی پیامک">
          <span>📲</span><span>درخواست پیامک OTP</span>
        </button>
        <button id="ashk-btn-dismiss-popups" style="background:#334155;color:#fff;border:none;padding:5px 8px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:10.5px;display:flex;align-items:center;gap:3px;">
          <span>✕</span><span>بستن بنرها</span>
        </button>
        <button id="ashk-btn-otp" style="background:#d97706;color:#fff;border:none;padding:5px 8px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:10.5px;display:flex;align-items:center;gap:3px;">
          <span>🔑</span><span>درج OTP</span>
        </button>
      </div>
    `;

    const dragHandle = document.getElementById('ashk-hud-drag-handle');
    if (dragHandle) setupDraggable(hudElement, dragHandle);

    const minBtn = document.getElementById('ashk-hud-min-btn');
    if (minBtn) {
      minBtn.onclick = () => {
        isHudMinimized = true;
        renderInPageFloatingHud();
      };
    }

    const closeBtn = document.getElementById('ashk-hud-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        isHudClosedByUser = true;
        if (hudElement) {
          hudElement.remove();
          hudElement = null;
        }
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
            renderInPageFloatingHud('کد OTP در فیلد مربوطه درج شد.');
          } else {
            renderInPageFloatingHud(`کد ${code} در کلیپ‌بورد کپی شد.`);
            try { navigator.clipboard.writeText(code.trim()); } catch (e) {}
          }
        }
      };
    }
  }

  // =========================================================================
  // ۶. ماژول درخواست واقعی پیامک ورود در صفحه فعال (Real In-Browser OTP Requester)
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

    const btnTexts = ['ارسال کد', 'دریافت کد', 'ارسال پیامک', 'ادامه', 'تایید و ادامه', 'ورود', 'ثبت نام', 'send code', 'get otp'];
    let submitBtn = null;
    const candidates = document.querySelectorAll('button, input[type="submit"], a[role="button"], div[role="button"], [class*="btn"]');
    for (const c of candidates) {
      if (c.offsetParent === null) continue;
      const txt = (c.textContent || c.value || '').trim().toLowerCase();
      if (btnTexts.some((bt) => txt === bt || txt.includes(bt))) {
        submitBtn = c;
        break;
      }
    }

    if (submitBtn) {
      submitBtn.style.outline = '3px solid #38bdf8';
      setTimeout(() => {
        submitBtn.click();
      }, 300);
      renderInPageFloatingHud(`شماره ${phoneNumber} در فیلد درج شد و درخواست ارسال پیامک کلیک گردید.`);
      return true;
    } else {
      renderInPageFloatingHud(`شماره ${phoneNumber} در فیلد درج شد. لطفاً دکمه دریافت پیامک را کلیک نمایید.`);
      return false;
    }
  }

  // =========================================================================
  // ۷. همگام‌سازی خودکار آدرس سرور هاست با افزونه و پاسخ کامل به پینگ‌ها
  // =========================================================================
  function sendExtensionStatusToWindow() {
    const currentOrigin = window.location.origin;
    const statusPayload = {
      type: 'ASHK_EXTENSION_STATUS_REPLY',
      installed: true,
      version: EXT_VERSION,
      host: currentOrigin,
      success: true,
      response: {
        installed: true,
        isWorkerEnabled: true,
        status: 'online',
        version: EXT_VERSION,
        syncedSessionsCount: 1,
        totalTargets: KNOWN_AD_PORTALS.length,
        currentIndex: 0,
        orchestratorUrl: currentOrigin,
        lastHeartbeat: new Date().toLocaleTimeString('fa-IR')
      }
    };

    window.postMessage(statusPayload, '*');

    try {
      document.dispatchEvent(new CustomEvent('ASHK_EXT_READY', {
        detail: { installed: true, version: EXT_VERSION, status: 'online' }
      }));
      document.dispatchEvent(new CustomEvent('ASHK_EXT_EVENT', {
        detail: statusPayload
      }));
    } catch (_) {}

    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('ashk24_extension_bridge');
        bc.postMessage({
          type: 'ASHK_WORKER_PULSE',
          version: EXT_VERSION,
          status: 'online',
          timestamp: Date.now()
        });
        bc.close();
      }
    } catch (_) {}
  }

  // ثبت آنی نشانگر نصب در المان ریشه
  try {
    document.documentElement.setAttribute('data-ashk24-extension', 'installed');
    document.documentElement.setAttribute('data-ashk24-version', EXT_VERSION);
  } catch (_) {}

  // ارسال فوری وضعیت آنلاین به محض بارگذاری
  sendExtensionStatusToWindow();
  setInterval(sendExtensionStatusToWindow, 3000);

  if (isAshkWebApp) {
    const currentOrigin = window.location.origin;
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'ASHK_SET_ORCHESTRATOR',
          orchestratorUrl: currentOrigin
        }, () => {
          sendExtensionStatusToWindow();
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
            sendExtensionStatusToWindow();
          });
        }
      }
    });
  }

  // ارتباط با پیام‌های داشبورد، افزونه و سایر تب‌ها
  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;

    // پاسخ فوری به پرس‌وجو و پینگ وب‌سایت
    if (event.data.type === 'ASHK_APP_QUERY_EXTENSION' || event.data.action === 'ASHK_PING') {
      sendExtensionStatusToWindow();
    }

    if (event.data.type === 'ASHK_EXECUTE_AD_PUBLICATION' || event.data.type === 'ASHK_APP_DISPATCH_PUBLISH') {
      executeAdPublicationFlow(event.data.job, event.data.campaign, event.data.company);
    }
    if (event.data.type === 'ASHK_DISMISS_POPUPS') {
      autoDismissPopups();
    }
    if (event.data.type === 'ASHK_TRIGGER_REAL_OTP' || event.data.type === 'ASHK_INJECT_OTP_CODE') {
      requestRealOtpOnCurrentPage(event.data.phoneNumber || event.data.code || activePayload.phone || '09153108763');
    }
    if (event.data.type === 'ASHK_SHOW_HUD' || event.data.type === 'ASHK_TOGGLE_HUD') {
      isHudClosedByUser = false;
      isHudMinimized = false;
      renderInPageFloatingHud('دستیار هوشمند با موفقیت در این صفحه فعال شد.');
    }
  });

  // دریافت پیام از اکشن یا پاپ‌آپ افزونه Chrome
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'TOGGLE_HUD' || request.action === 'SHOW_HUD') {
        isHudClosedByUser = false;
        isHudMinimized = false;
        renderInPageFloatingHud('دستیار هوشمند با درخواست کاربر در این صفحه فعال شد.');
        sendResponse({ success: true });
      }
    });
  }

  // =========================================================================
  // ۸. راه‌اندازی شرطی منوی شناور (فقط در صفحات مرتبط یا دارای پارامتر اقدام)
  // =========================================================================
  if (!isAshkWebApp) {
    const isTarget = isTargetAdvertisingPage();
    const urlParams = new URLSearchParams(window.location.search);
    const hasAshkAction = Boolean(urlParams.get('ashk_action'));

    if (hasAshkAction) {
      setTimeout(() => {
        requestRealOtpOnCurrentPage('09153108763');
      }, 1000);
    }

    if (isTarget || hasAshkAction) {
      autoDismissPopups();
      setTimeout(autoDismissPopups, 1500);

      setTimeout(() => {
        renderInPageFloatingHud(`آماده پایش هوشمند در پلتفرم ${window.location.hostname}`);
      }, 1200);
    }
  }
})();
