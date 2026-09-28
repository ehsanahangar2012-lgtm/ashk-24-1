/**
 * ASHK 24 Universal Browser Extension Bridge & Communication Channel
 * Version: 4.8.3
 *
 * Provides a resilient bidirectional communication pipeline between the React App
 * and the ASHK 24 Chrome Extension (via window.postMessage, CustomEvent, BroadcastChannel, and cPanel Gateway).
 */

import { diagnosticLogger } from './diagnosticLogger';
import { APP_VERSION } from '../config/version';

export interface ExtensionWorkerStatus {
  installed: boolean;
  version: string | null;
  isWorkerEnabled: boolean;
  status: 'online' | 'idle' | 'running' | 'disconnected';
  lastHeartbeat: string | null;
  syncedSessionsCount: number;
  totalTargets: number;
  currentIndex: number;
  orchestratorUrl: string | null;
  transportType: 'direct_dom' | 'post_message' | 'custom_event' | 'broadcast_channel' | 'none';
}

type ExtensionListener = (status: ExtensionWorkerStatus) => void;

class ExtensionBridgeManager {
  private static instance: ExtensionBridgeManager;
  private status: ExtensionWorkerStatus = {
    installed: false,
    version: null,
    isWorkerEnabled: false,
    status: 'disconnected',
    lastHeartbeat: null,
    syncedSessionsCount: 0,
    totalTargets: 0,
    currentIndex: 0,
    orchestratorUrl: null,
    transportType: 'none'
  };

  private listeners: Set<ExtensionListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private pingInterval: any = null;

  private constructor() {
    this.initListeners();
    this.detectInitialPresence();
    this.startHeartbeatProbe();
  }

  public static getInstance(): ExtensionBridgeManager {
    if (!ExtensionBridgeManager.instance) {
      ExtensionBridgeManager.instance = new ExtensionBridgeManager();
    }
    return ExtensionBridgeManager.instance;
  }

  private initListeners() {
    if (typeof window === 'undefined') return;

    // 1. PostMessage Listener
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'ASHK_EXTENSION_STATUS_REPLY' || data.type === 'ASHK_EXT_PING_REPLY') {
        const resp = data.response || {};
        this.updateStatus({
          installed: true,
          version: data.version || resp.version || APP_VERSION,
          isWorkerEnabled: resp.isWorkerEnabled !== false,
          status: resp.status || 'online',
          syncedSessionsCount: resp.syncedSessionsCount || 0,
          totalTargets: resp.totalTargets || 0,
          currentIndex: resp.currentIndex || 0,
          orchestratorUrl: resp.orchestratorUrl || window.location.origin,
          lastHeartbeat: new Date().toLocaleTimeString('fa-IR'),
          transportType: 'post_message'
        });
      }

      if (data.type === 'ASHK_SESSION_HARVESTED') {
        this.status.syncedSessionsCount++;
        this.notifyListeners();
      }

      if (data.type === 'ASHK_QUEUE_UPDATED' || data.type === 'ASHK_TARGET_PROGRESS') {
        if (data.state) {
          this.status.currentIndex = data.state.currentIndex || 0;
          this.status.totalTargets = data.state.targets?.length || 0;
          this.status.status = data.state.isRunning ? 'running' : 'online';
          this.notifyListeners();
        }
      }
    });

    // 2. CustomEvent Listener
    document.addEventListener('ASHK_EXT_READY', (event: any) => {
      const detail = event.detail || {};
      this.updateStatus({
        installed: true,
        version: detail.version || APP_VERSION,
        status: 'online',
        isWorkerEnabled: true,
        transportType: 'custom_event',
        lastHeartbeat: new Date().toLocaleTimeString('fa-IR')
      });
    });

    document.addEventListener('ASHK_EXT_EVENT', (event: any) => {
      const detail = event.detail || {};
      if (detail.type === 'ASHK_EXTENSION_STATUS_REPLY') {
        this.updateStatus({
          installed: true,
          version: detail.version || APP_VERSION,
          status: 'online',
          transportType: 'custom_event',
          lastHeartbeat: new Date().toLocaleTimeString('fa-IR')
        });
      }
    });

    // 3. BroadcastChannel Pipeline
    try {
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('ashk24_extension_bridge');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'ASHK_WORKER_PULSE') {
            this.updateStatus({
              installed: true,
              version: event.data.version || APP_VERSION,
              isWorkerEnabled: true,
              status: 'online',
              transportType: 'broadcast_channel',
              lastHeartbeat: new Date().toLocaleTimeString('fa-IR')
            });
          }
        };
      }
    } catch (e) {}
  }

  private detectInitialPresence() {
    if (typeof document === 'undefined') return;

    // Check DOM indicator
    const extAttr = document.documentElement.getAttribute('data-ashk24-extension');
    const versionAttr = document.documentElement.getAttribute('data-ashk24-version');
    if (extAttr === 'installed') {
      this.updateStatus({
        installed: true,
        version: versionAttr || APP_VERSION,
        status: 'online',
        isWorkerEnabled: true,
        transportType: 'direct_dom',
        lastHeartbeat: new Date().toLocaleTimeString('fa-IR')
      });
    }

    this.sendPing();
  }

  private startHeartbeatProbe() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 4000);
  }

  public sendPing() {
    if (typeof window === 'undefined') return;

    const payload = {
      type: 'ASHK_APP_QUERY_EXTENSION',
      action: 'ASHK_PING',
      orchestratorUrl: window.location.origin,
      timestamp: Date.now()
    };

    // 1. Send via postMessage
    window.postMessage(payload, '*');

    // 2. Send via CustomEvent
    try {
      document.dispatchEvent(new CustomEvent('ASHK_EXT_REQUEST', { detail: payload }));
    } catch (e) {}

    // 3. Send via BroadcastChannel
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage(payload);
      }
    } catch (e) {}
  }

  public toggleWorker(enable: boolean) {
    const payload = {
      type: 'ASHK_TOGGLE_WORKER',
      enabled: enable,
      timestamp: Date.now()
    };

    window.postMessage(payload, '*');
    try {
      document.dispatchEvent(new CustomEvent('ASHK_EXT_REQUEST', { detail: payload }));
    } catch (e) {}

    this.status.isWorkerEnabled = enable;
    this.status.status = enable ? 'online' : 'idle';
    this.notifyListeners();
  }

  public sendOtpCode(code: string) {
    const payload = {
      type: 'ASHK_OTP_RESOLVED',
      otpCode: code,
      timestamp: Date.now()
    };

    window.postMessage(payload, '*');
    try {
      document.dispatchEvent(new CustomEvent('ASHK_EXT_REQUEST', { detail: payload }));
    } catch (e) {}
  }

  public triggerHarvestActiveTab() {
    const payload = {
      type: 'ASHK_APP_HARVEST_NOW',
      timestamp: Date.now()
    };

    window.postMessage(payload, '*');
    try {
      document.dispatchEvent(new CustomEvent('ASHK_EXT_REQUEST', { detail: payload }));
    } catch (e) {}
  }

  public dispatchQueue(targets: any[], credentials?: any) {
    const payload = {
      type: 'ASHK_APP_DISPATCH_QUEUE',
      targets,
      credentials,
      orchestratorUrl: window.location.origin,
      timestamp: Date.now()
    };

    window.postMessage(payload, '*');
    try {
      document.dispatchEvent(new CustomEvent('ASHK_EXT_REQUEST', { detail: payload }));
    } catch (e) {}
  }

  public publishJobViaExtension(job: any, campaign: any, company: any) {
    const payload = {
      type: 'ASHK_APP_DISPATCH_PUBLISH',
      job,
      campaign,
      company,
      orchestratorUrl: window.location.origin,
      timestamp: Date.now()
    };

    window.postMessage(payload, '*');
    try {
      document.dispatchEvent(new CustomEvent('ASHK_EXT_REQUEST', { detail: payload }));
    } catch (e) {}

    diagnosticLogger.log({
      category: 'system_info',
      level: 'info',
      source: 'extension_bridge',
      message: `فرمان انتشار نوبت کاری ${job?.id} به افزونه مرورگر ارسال شد.`,
      details: { platform: job?.platformName || job?.platformDomain }
    });
  }

  private updateStatus(newPartial: Partial<ExtensionWorkerStatus>) {
    this.status = { ...this.status, ...newPartial };
    this.notifyListeners();
  }

  public getStatus(): ExtensionWorkerStatus {
    return { ...this.status };
  }

  public subscribe(listener: ExtensionListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const current = this.getStatus();
    this.listeners.forEach((l) => l(current));
  }
}

export const extensionBridge = ExtensionBridgeManager.getInstance();
