// ASHK 24 On-Demand Scoped Content Script (Zero-lag / Anti-freeze)
(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('ashkJobId') || urlParams.get('jobId');
  if (!jobId) return; // Exit immediately if not an active Ashk job tab (zero overhead)

  console.log("ASHK 24: Active job tab detected for Job ID:", jobId);

  let mutationObserver = null;
  let isPausedForHuman = false;

  chrome.storage.local.get([`activeJob_${jobId}`, 'activeJob'], async function (result) {
    const jobData = result[`activeJob_${jobId}`] || result['activeJob'];
    if (!jobData) return;

    await waitAndFillForm(jobData);
  });

  async function waitAndFillForm(jobData) {
    chrome.runtime.sendMessage({ jobId, status: "filling_data", type: "ASHK_SYNC_STATE", message: "شروع اسکن DOM و تزریق هوشمند اطلاعات" });

    let attempts = 0;
    const maxAttempts = 20;

    const timer = setInterval(() => {
      attempts++;
      const titleInput = document.querySelector('input[name*="title"], input[id*="title"], input[placeholder*="عنوان"]');
      const descInput = document.querySelector('textarea[name*="description"], textarea[id*="description"], textarea[placeholder*="توضیحات"]');

      const captchaElem = document.querySelector('iframe[src*="captcha"], div[class*="captcha"], div[id*="rc-imageselect"]');
      const otpElem = document.querySelector('input[name*="otp"], input[placeholder*="کد تایید"], input[placeholder*="پیامک"]');

      if (captchaElem || otpElem) {
        if (!isPausedForHuman) {
          isPausedForHuman = true;
          chrome.runtime.sendMessage({ 
            jobId, 
            status: "paused_user_action", 
            type: "ASHK_SYNC_STATE", 
            message: "گیت امنیتی (CAPTCHA/OTP) شناسایی شد. منتظر اقدام انسانی در مرورگر..." 
          });
          
          startHumanObserver(jobData);
        }
        return;
      }

      if (titleInput && descInput) {
        clearInterval(timer);
        
        setNativeValue(titleInput, jobData.campaign?.title || "آگهی صنعتی اشک 24");
        setNativeValue(descInput, jobData.campaign?.description || "ارائه خدمات تخصصی");

        chrome.runtime.sendMessage({ jobId, status: "submitting", type: "ASHK_SYNC_STATE", message: "اطلاعات با موفقیت تزریق شد. در حال ارسال..." });

        setTimeout(() => {
          const submitBtn = document.querySelector('button[type="submit"], button[class*="submit"], button[class*="primary"]');
          if (submitBtn) {
            submitBtn.click();
            startVerificationCheck(jobId);
          }
        }, 1000);
      } else if (attempts >= maxAttempts) {
        clearInterval(timer);
        chrome.runtime.sendMessage({ jobId, status: "failed", type: "ASHK_SYNC_STATE", message: "تایم‌اوت در پیدا کردن فیلدهای فرم هدف." });
      }
    }, 1500);
  }

  function setNativeValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set ||
                        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  let humanObserverDebounce = null;

  function startHumanObserver(jobData) {
    if (mutationObserver) return;

    mutationObserver = new MutationObserver(() => {
      if (humanObserverDebounce) clearTimeout(humanObserverDebounce);
      humanObserverDebounce = setTimeout(() => {
        const captchaElem = document.querySelector('iframe[src*="captcha"], div[class*="captcha"], div[id*="rc-imageselect"]');
        const otpElem = document.querySelector('input[name*="otp"], input[placeholder*="کد تایید"]');

        if (!captchaElem && !otpElem) {
          if (mutationObserver) {
            mutationObserver.disconnect();
            mutationObserver = null;
          }
          isPausedForHuman = false;

          chrome.runtime.sendMessage({ jobId, status: "resumed", type: "ASHK_SYNC_STATE", message: "گیت امنیتی با موفقیت توسط کاربر حل شد. ادامه فرآیند..." });
          setTimeout(() => waitAndFillForm(jobData), 1500);
        }
      }, 1000);
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  function startVerificationCheck(jobId) {
    let checkCount = 0;
    const verifyInterval = setInterval(() => {
      checkCount++;
      const currentUrl = window.location.href;
      if (currentUrl.includes('/v/') || currentUrl.includes('/post/') || document.body.innerText.includes('موفقیت‌آمیز')) {
        clearInterval(verifyInterval);
        chrome.runtime.sendMessage({ 
          jobId, 
          type: "ASHK_VERIFY", 
          adUrl: currentUrl, 
          message: "انتشار آگهی با موفقیت تایید شد." 
        });
      } else if (checkCount > 30) {
        clearInterval(verifyInterval);
        chrome.runtime.sendMessage({ 
          jobId, 
          type: "ASHK_VERIFY", 
          adUrl: window.location.href, 
          message: "پایان چرخه انتشار." 
        });
      }
    }, 2000);
  }
})();
