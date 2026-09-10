const ORCHESTRATOR_URL = "https://ais-dev-azrixdhs4vx7ap6bz5f4v2-581838714516.us-east1.run.app";
const API_TOKEN = "ASHK24-LOCAL-AGENT-SECURE-KEY";

chrome.alarms.create("pollJobs", { periodInMinutes: 0.5 }); // Poll every 30s

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pollJobs") {
    pollForPendingJobs();
  }
});

async function pollForPendingJobs() {
  try {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/bridge/jobs/pending`, {
      headers: { "x-agent-token": API_TOKEN }
    });
    if (!res.ok) return;
    const data = await res.json();
    
    if (data.jobs && data.jobs.length > 0) {
      const job = data.jobs[0];
      claimJob(job.id);
    }
  } catch (e) {
    console.error("Polling error:", e);
  }
}

async function claimJob(jobId) {
  try {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/bridge/jobs/${jobId}/claim`, {
      method: "POST",
      headers: { "x-agent-token": API_TOKEN, "Content-Type": "application/json" }
    });
    if (res.ok) {
      console.log(`Job ${jobId} claimed!`);
      executeJob(jobId);
    }
  } catch (e) {
    console.error("Claim error:", e);
  }
}

async function executeJob(jobId) {
  try {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/bridge/jobs/${jobId}/payload`, {
      headers: { "x-agent-token": API_TOKEN }
    });
    const data = await res.json();
    
    const platformUrl = data.campaign?.selectedPlatformIds?.includes('plat_divar') ? 'https://divar.ir/new' : 'https://example.com/mock-target';
    // Simulate opening tab and letting content script take over
    chrome.tabs.create({ url: `${platformUrl}?jobId=${jobId}` }, (tab) => {
      chrome.storage.local.set({ activeJob: data });
      syncState(jobId, "navigating", "درحال پیمایش به سایت هدف");
    });
  } catch (e) {
    console.error("Execute error:", e);
  }
}

async function syncState(jobId, status, message) {
  try {
    await fetch(`${ORCHESTRATOR_URL}/api/bridge/jobs/${jobId}/sync-state`, {
      method: "POST",
      headers: { "x-agent-token": API_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ status, message })
    });
  } catch (e) {
    console.error("Sync state error:", e);
  }
}
