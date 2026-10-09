/**
 * Workflow Orchestrator & Distributed Traceability Service
 * Handles State Machine transitions, Worker Dispatching (GitHub -> Extension -> Local),
 * and Full Traceability (Workflow -> Execution -> Actions) without any mock or demo data.
 */

import {
  WorkflowRecord,
  WorkflowExecution,
  WorkflowAction,
  WorkflowState,
  WorkerRole,
  WORKFLOW_STATE_LABELS
} from '../types/workflowTrace';
import { callApi } from './api/apiClient';

const STORAGE_KEY = 'ashk24_distributed_workflows';

export class WorkflowTraceService {
  private static instance: WorkflowTraceService;

  public static getInstance(): WorkflowTraceService {
    if (!WorkflowTraceService.instance) {
      WorkflowTraceService.instance = new WorkflowTraceService();
    }
    return WorkflowTraceService.instance;
  }

  /**
   * دریافت تمام ورک‌فلوها از سرور cPanel و پشتیبان لوکال
   */
  public async getWorkflows(): Promise<WorkflowRecord[]> {
    try {
      const res = await callApi<{ success: boolean; workflows: WorkflowRecord[] }>('workflows');
      if (res && res.success && Array.isArray(res.workflows)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.workflows));
        return res.workflows;
      }
    } catch (_) {
      // Fallback به حافظه لوکال کلاینت در صورت قطعی اینترنت
    }

    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * دریافت یک ورک‌فلو با شناسه
   */
  public async getWorkflowById(workflowId: string): Promise<WorkflowRecord | null> {
    try {
      const res = await callApi<{ success: boolean; workflow: WorkflowRecord }>(`workflows/get&workflowId=${encodeURIComponent(workflowId)}`);
      if (res && res.success && res.workflow) {
        return res.workflow;
      }
    } catch (_) {}

    const all = await this.getWorkflows();
    return all.find(w => w.workflowId === workflowId) || null;
  }

  /**
   * ایجاد یک ورک‌فلو جدید و ثبت اولیه
   */
  public async createWorkflow(params: {
    campaignId: string;
    campaignTitle: string;
    platform: string;
    platformDomain: string;
    primaryWorker?: WorkerRole;
  }): Promise<WorkflowRecord> {
    const payload = {
      campaignId: params.campaignId,
      campaignTitle: params.campaignTitle,
      platform: params.platform,
      platformDomain: params.platformDomain,
      primaryWorker: params.primaryWorker || 'github'
    };

    try {
      const res = await callApi<{ success: boolean; workflow: WorkflowRecord }>('workflows/create', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res && res.success && res.workflow) {
        res.workflow.source = 'SERVER_PERSISTED';
        res.workflow.isLocalOnly = false;
        this.syncLocalWorkflow(res.workflow);
        return res.workflow;
      }
    } catch (_) {}

    // ایجاد لوکال آفلاین با برچسب صریح LOCAL_ONLY
    const now = new Date().toISOString();
    const workflowId = 'wf_' + Math.random().toString(36).substring(2, 10);
    const executionId = 'exec_' + Math.random().toString(36).substring(2, 8);
    const primaryWorker: WorkerRole = params.primaryWorker || 'github';

    const initialAction: WorkflowAction = {
      actionId: 'act_' + Math.random().toString(36).substring(2, 8),
      executionId,
      workflowId,
      worker: primaryWorker,
      platform: params.platform,
      state: 'CREATED',
      action: 'initialize_workflow',
      status: 'completed',
      source: 'LOCAL_ONLY',
      isLocalOnly: true,
      input: { campaignId: params.campaignId, platform: params.platform },
      output: { initialized: true },
      durationMs: 35,
      attempt: 1,
      timestamp: now
    };

    const initialExecution: WorkflowExecution = {
      executionId,
      workflowId,
      attemptNumber: 1,
      primaryWorker,
      currentState: 'CREATED',
      source: 'LOCAL_ONLY',
      isLocalOnly: true,
      startedAt: now,
      actions: [initialAction]
    };

    const newRecord: WorkflowRecord = {
      workflowId,
      jobId: 'job_' + Date.now(),
      campaignId: params.campaignId,
      campaignTitle: params.campaignTitle,
      platform: params.platform,
      platformDomain: params.platformDomain,
      currentState: 'CREATED',
      activeWorker: primaryWorker,
      currentExecutionId: executionId,
      executions: [initialExecution],
      publicationVerified: false,
      source: 'LOCAL_ONLY',
      isLocalOnly: true,
      createdAt: now,
      updatedAt: now
    };

    this.syncLocalWorkflow(newRecord);
    return newRecord;
  }

  /**
   * ثبت اکشن و تغییر وضعیت در State Machine
   */
  public async recordAction(params: {
    workflowId: string;
    executionId: string;
    jobId?: string;
    actionId?: string;
    workerId?: string;
    worker: WorkerRole;
    platform: string;
    state: WorkflowState;
    action: string;
    status: 'started' | 'running' | 'completed' | 'failed' | 'paused';
    input?: Record<string, any>;
    output?: Record<string, any>;
    fieldsFound?: number;
    durationMs?: number;
    attempt?: number;
    error?: string;
    nextAction?: string;
    publicUrl?: string;
    publicationVerified?: boolean;
    source?: 'SERVER_PERSISTED' | 'LOCAL_ONLY';
  }): Promise<WorkflowRecord> {
    try {
      const res = await callApi<{ success: boolean; workflow: WorkflowRecord }>('workflows/action', {
        method: 'POST',
        body: JSON.stringify(params)
      });
      if (res && res.success && res.workflow) {
        res.workflow.source = 'SERVER_PERSISTED';
        res.workflow.isLocalOnly = false;
        this.syncLocalWorkflow(res.workflow);
        return res.workflow;
      }
    } catch (_) {}

    // آپدیت لوکال آفلاین با برچسب صریح LOCAL_ONLY (فاقد اثبات یا سابقه سرور)
    const workflows = await this.getWorkflows();
    const idx = workflows.findIndex(w => w.workflowId === params.workflowId);
    const now = new Date().toISOString();

    if (idx !== -1) {
      const wf = workflows[idx];
      let exec = wf.executions.find(e => e.executionId === params.executionId);
      if (!exec) {
        exec = {
          executionId: params.executionId,
          workflowId: params.workflowId,
          attemptNumber: wf.executions.length + 1,
          primaryWorker: params.worker,
          currentState: params.state,
          source: 'LOCAL_ONLY',
          isLocalOnly: true,
          startedAt: now,
          actions: []
        };
        wf.executions.push(exec);
      }

      const actionItem: WorkflowAction = {
        actionId: params.actionId || ('act_' + Math.random().toString(36).substring(2, 8)),
        executionId: params.executionId,
        workflowId: params.workflowId,
        jobId: params.jobId || wf.jobId,
        workerId: params.workerId || `${params.worker}_worker_node`,
        worker: params.worker,
        platform: params.platform || wf.platform,
        state: params.state,
        previousState: wf.currentState,
        action: params.action,
        status: params.status,
        input: params.input,
        output: params.output,
        fieldsFound: params.fieldsFound,
        durationMs: params.durationMs || 0,
        attempt: params.attempt || 1,
        error: params.error,
        nextAction: params.nextAction,
        source: 'LOCAL_ONLY',
        isLocalOnly: true,
        timestamp: now
      };

      exec.actions.push(actionItem);
      exec.currentState = params.state;
      wf.previousState = wf.currentState;
      wf.currentState = params.state;
      wf.activeWorker = params.worker;
      wf.source = 'LOCAL_ONLY';
      wf.isLocalOnly = true;
      wf.updatedAt = now;

      if (params.publicUrl) {
        wf.publicUrl = params.publicUrl;
      }
      if (params.publicationVerified) {
        wf.publicationVerified = true;
      }

      workflows[idx] = wf;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
      return wf;
    }

    throw new Error('گردش کار یافت نشد.');
  }

  /**
   * دریافت و ثبت کد تایید OTP (بدون ادعای ساختگی تایید تا زمان پذیرش توسط پلتفرم)
   */
  public async submitOtp(workflowId: string, otpCode: string): Promise<WorkflowRecord> {
    try {
      const res = await callApi<{ success: boolean; workflow: WorkflowRecord }>('workflows/submit-otp', {
        method: 'POST',
        body: JSON.stringify({ workflowId, otpCode })
      });
      if (res && res.success && res.workflow) {
        this.syncLocalWorkflow(res.workflow);
        return res.workflow;
      }
    } catch (_) {}

    const wf = await this.getWorkflowById(workflowId);
    if (!wf) throw new Error('گردش کار یافت نشد.');

    // ثبت کد دریافتی بدون اعلام موفقیت تا زمان تزریق و تایید واقعی توسط پلتفرم
    return this.recordAction({
      workflowId,
      executionId: wf.currentExecutionId,
      jobId: wf.jobId,
      workerId: 'user_or_sms_bridge',
      worker: wf.activeWorker,
      platform: wf.platform,
      state: 'OTP_RECEIVED',
      action: 'receive_otp',
      status: 'completed',
      input: { otpCode },
      output: { received: true, verifiedByPlatform: false },
      durationMs: 50,
      nextAction: 'inject_and_verify_otp'
    });
  }

  /**
   * راستی‌آزمایی مستقل لینک واقعی منتشرشده (فقط پس از اثبات واقعی، وضعیت PUBLISHED ثبت می‌شود)
   */
  public async verifyPublicationUrl(workflowId: string, url: string): Promise<WorkflowRecord> {
    try {
      const res = await callApi<{ success: boolean; verified: boolean; httpStatus: number; workflow?: WorkflowRecord }>('workflows/verify-url', {
        method: 'POST',
        body: JSON.stringify({ workflowId, url })
      });
      if (res && res.success && res.verified && res.workflow) {
        this.syncLocalWorkflow(res.workflow);
        return res.workflow;
      }
      if (res && !res.verified) {
        // شواهد کافی نیست
        const wf = await this.getWorkflowById(workflowId);
        if (!wf) throw new Error('گردش کار یافت نشد.');
        return this.recordAction({
          workflowId,
          executionId: wf.currentExecutionId,
          jobId: wf.jobId,
          workerId: 'gh_orchestrator_main',
          worker: 'github',
          platform: wf.platform,
          state: 'BLOCKED',
          action: 'verify_publication_url',
          status: 'failed',
          input: { url },
          output: { verified: false, reason: 'لینک عمومی توسط ارکستراتور تایید نشد یا محتوای آگهی احراز نگردید.' },
          error: 'لینک آگهی در دسترس نیست یا در صف بررسی ناظر پلتفرم قرار دارد.',
          durationMs: 250
        });
      }
    } catch (_) {}

    const wf = await this.getWorkflowById(workflowId);
    if (!wf) throw new Error('گردش کار یافت نشد.');

    // در حالت قطعی یا نبود شواهد، هرگز PUBLISHED ثبت نمی‌شود؛ صریحاً BLOCKED / UNKNOWN ثبت می‌گردد
    return this.recordAction({
      workflowId,
      executionId: wf.currentExecutionId,
      jobId: wf.jobId,
      workerId: 'gh_orchestrator_main',
      worker: wf.activeWorker,
      platform: wf.platform,
      state: 'BLOCKED',
      action: 'verify_publication_url',
      status: 'failed',
      input: { url },
      output: { verified: false, reason: 'عدم امکان راستی‌آزمایی مستقل به دلیل قطعی ارتباط یا نبود ورکر تاییدکننده' },
      error: 'راستی‌آزمایی مستقل انجام نشد؛ وضعیت به عنوان مسدود در انتظار شواهد باقی می‌ماند.',
      durationMs: 120
    });
  }

  private syncLocalWorkflow(wf: WorkflowRecord) {
    const raw = localStorage.getItem(STORAGE_KEY);
    let list: WorkflowRecord[] = [];
    if (raw) {
      try { list = JSON.parse(raw); } catch { list = []; }
    }
    const idx = list.findIndex(item => item.workflowId === wf.workflowId);
    if (idx !== -1) {
      list[idx] = wf;
    } else {
      list.unshift(wf);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

export const workflowTraceService = WorkflowTraceService.getInstance();
