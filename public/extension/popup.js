document.addEventListener('DOMContentLoaded', () => {
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const syncedCountEl = document.getElementById('syncedCount');
  const queueCountEl = document.getElementById('queueCount');
  const workerToggle = document.getElementById('workerToggle');
  const btnHarvestCurrent = document.getElementById('btnHarvestCurrent');
  const btnStartQueue = document.getElementById('btnStartQueue');
  const btnPauseQueue = document.getElementById('btnPauseQueue');
  const orchestratorInput = document.getElementById('orchestratorInput');
  const btnSaveConfig = document.getElementById('btnSaveConfig');
  const pingStatus = document.getElementById('pingStatus');
  const btnHelp = document.getElementById('btnHelp');
  const helpModal = document.getElementById('helpModal');

  // Toggle Help
  btnHelp.addEventListener('click', () => {
    helpModal.style.display = helpModal.style.display === 'block' ? 'none' : 'block';
  });

  function refreshStatus() {
    chrome.runtime.sendMessage({ type: 'ASHK_GET_HARVEST_STATUS' }, (res) => {
      if (chrome.runtime.lastError || !res) {
        statusBadge.style.background = '#374151';
        statusBadge.style.color = '#9ca3af';
        statusText.innerText = 'در انتظار سرویس‌ورکر';
        return;
      }

      workerToggle.checked = res.isWorkerEnabled !== false;

      if (res.isWorkerEnabled !== false) {
        statusBadge.style.background = '#064e3b';
        statusBadge.style.color = '#34d399';
        statusText.innerText = res.isRunning ? 'در حال اجرای صف' : 'آنلاین و فعال';
      } else {
        statusBadge.style.background = '#450a0a';
        statusBadge.style.color = '#f87171';
        statusText.innerText = 'غیرفعال';
      }

      syncedCountEl.innerText = (res.syncedSessionsCount || 0).toLocaleString('fa-IR');
      const pendingQueue = Math.max(0, (res.totalTargets || 0) - (res.currentIndex || 0));
      queueCountEl.innerText = pendingQueue.toLocaleString('fa-IR');

      if (res.totalTargets > 0) {
        if (res.isRunning && !res.isPaused) {
          btnStartQueue.style.display = 'none';
          btnPauseQueue.style.display = 'flex';
        } else {
          btnStartQueue.style.display = 'flex';
          btnPauseQueue.style.display = 'none';
        }
      } else {
        btnStartQueue.style.display = 'none';
        btnPauseQueue.style.display = 'none';
      }

      if (res.orchestratorUrl && !orchestratorInput.value) {
        orchestratorInput.value = res.orchestratorUrl;
      }
    });
  }

  // Toggle Worker Node
  workerToggle.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'ASHK_TOGGLE_WORKER',
      enabled: workerToggle.checked
    }, () => {
      if (chrome.runtime.lastError) return;
      refreshStatus();
    });
  });

  // Harvest Current Tab
  btnHarvestCurrent.addEventListener('click', () => {
    btnHarvestCurrent.disabled = true;
    btnHarvestCurrent.innerText = 'در حال استخراج...';

    chrome.runtime.sendMessage({ type: 'ASHK_HARVEST_CURRENT_TAB' }, (res) => {
      btnHarvestCurrent.disabled = false;
      btnHarvestCurrent.innerHTML = '<span>📥</span><span>شکار و ارسال فوری سشن تب جاری</span>';

      if (chrome.runtime.lastError || !res || !res.success) {
        alert('خطا در شکار سشن: ' + (res?.error || 'تب پشتیبانی نمی‌شود'));
      } else {
        refreshStatus();
      }
    });
  });

  // Autofill current tab
  const btnAutofillCurrent = document.getElementById('btnAutofillCurrent');
  if (btnAutofillCurrent) {
    btnAutofillCurrent.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'ASHK_EXECUTE_AD_PUBLICATION'
          }, (resp) => {
            alert('دستور تکمیل خودکار آگهی در تب فعال اجرا شد.');
          });
        }
      });
    });
  }

  // Inject OTP to current tab
  const btnInjectOtpCurrent = document.getElementById('btnInjectOtpCurrent');
  if (btnInjectOtpCurrent) {
    btnInjectOtpCurrent.addEventListener('click', () => {
      const code = prompt('کد تایید پیامک (OTP) را وارد نمایید:');
      if (!code) return;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'ASHK_INJECT_OTP_CODE',
            code: code.trim()
          }, () => {
            alert(`کد ${code} به فرم تب جاری ارسال شد.`);
          });
        }
      });
    });
  }

  // Toggle Floating HUD in Active Tab
  const btnToggleHud = document.getElementById('btnToggleHud');
  if (btnToggleHud) {
    btnToggleHud.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'SHOW_HUD' }, () => {
            if (chrome.runtime.lastError) {
              // Inject content script if not already injected
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content.js']
              }).then(() => {
                setTimeout(() => {
                  chrome.tabs.sendMessage(tabs[0].id, { action: 'SHOW_HUD' });
                }, 300);
              }).catch(() => {});
            }
          });
          btnToggleHud.innerText = 'دستیار در تب جاری فعال شد ✓';
          setTimeout(() => {
            btnToggleHud.innerHTML = '<span>🎯</span><span>فعال‌سازی دستیار هوشمند در صفحه فعلی</span>';
          }, 2000);
        }
      });
    });
  }

  // Queue actions
  btnStartQueue.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'ASHK_RESUME_QUEUE' }, () => {
      if (chrome.runtime.lastError) return;
      refreshStatus();
    });
  });

  btnPauseQueue.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'ASHK_PAUSE_QUEUE' }, () => {
      if (chrome.runtime.lastError) return;
      refreshStatus();
    });
  });

  const extVersion = chrome.runtime?.getManifest?.()?.version || '5.2.0';
  const versionNote = document.getElementById('versionNote');
  if (versionNote) {
    versionNote.innerText = `نسخه ${extVersion} - بدون وابستگی، مقاوم در برابر فیلترینگ و تحریم‌ها`;
  }

  // Detect Orchestrator Host from Current Active Tab
  const btnDetectTabHost = document.getElementById('btnDetectTabHost');
  if (btnDetectTabHost) {
    btnDetectTabHost.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].url) {
          try {
            const urlObj = new URL(tabs[0].url);
            if (urlObj.protocol.startsWith('http')) {
              orchestratorInput.value = urlObj.origin;
              btnSaveConfig.click();
            } else {
              alert('تب جاری یک صفحه وب معتبر (HTTP/HTTPS) نیست.');
            }
          } catch (e) {
            alert('خطا در خواندن آدرس تب جاری.');
          }
        }
      });
    });
  }

  // Save Orchestrator URL
  btnSaveConfig.addEventListener('click', () => {
    const url = orchestratorInput.value.trim();
    if (!url) return;

    btnSaveConfig.innerText = 'در حال بررسی...';
    pingStatus.innerText = '...';

    chrome.runtime.sendMessage({
      type: 'ASHK_SET_ORCHESTRATOR',
      orchestratorUrl: url
    }, () => {
      if (chrome.runtime.lastError) return;
      
      const baseUrl = url.replace(/\/$/, '');
      const testCandidates = [
        `${baseUrl}/cpanel-backend/api/index.php?route=orchestrator/heartbeat`,
        `${baseUrl}/api/index.php?route=orchestrator/heartbeat`
      ];

      const checkUrl = (idx) => {
        if (idx >= testCandidates.length) {
          btnSaveConfig.innerText = 'ذخیره و تست اتصال';
          pingStatus.innerText = 'خطای اتصال';
          pingStatus.style.color = '#ef4444';
          return;
        }

        fetch(testCandidates[idx], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: 'popup_test_probe',
            channelType: 'extension',
            ping: true,
            test: true
          })
        }).then(r => {
          if (r.ok) {
            btnSaveConfig.innerText = 'ذخیره و تست اتصال';
            pingStatus.innerText = 'اتصال موفق ✓';
            pingStatus.style.color = '#10b981';
          } else {
            checkUrl(idx + 1);
          }
        }).catch(() => {
          checkUrl(idx + 1);
        });
      };

      checkUrl(0);
    });
  });

  // Initial load
  refreshStatus();
  setInterval(refreshStatus, 3000);
});
