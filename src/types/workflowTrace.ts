/**
 * Distributed Workflow, Traceability & State Machine Types
 * Ashk24 Enterprise Architecture
 */

export type WorkflowState =
  | 'CREATED'
  | 'DISCOVERING'
  | 'DISCOVERED'
  | 'AD_GENERATING'
  | 'AD_READY'
  | 'OPENING_PLATFORM'
  | 'AUTHENTICATING'
  | 'REGISTERING'
  | 'LOGGING_IN'
  | 'INSPECTING_FORM'
  | 'MAPPING_FIELDS'
  | 'FILLING_FIELDS'
  | 'SUBMITTING'
  | 'OTP_REQUIRED'
  | 'WAITING_FOR_OTP'
  | 'OTP_RECEIVED'
  | 'OTP_SUBMITTED'
  | 'PUBLICATION_PENDING'
  | 'VERIFYING_PUBLICATION'
  | 'PUBLISHED'
  | 'FAILED'
  | 'WAITING_FOR_HUMAN'
  | 'WAITING_FOR_WORKER'
  | 'BLOCKED'
  | 'UNKNOWN'
  | 'CANCELLED';

export type WorkerRole = 'github' | 'extension' | 'local';

export interface WorkflowAction {
  actionId: string;
  executionId: string;
  workflowId: string;
  jobId?: string;
  workerId?: string;
  worker: WorkerRole;
  platform: string;
  state: WorkflowState;
  previousState?: WorkflowState;
  action: string;
  status: 'started' | 'running' | 'completed' | 'failed' | 'paused';
  input?: Record<string, any>;
  output?: Record<string, any>;
  fieldsFound?: number;
  durationMs?: number;
  attempt?: number;
  error?: string;
  nextAction?: string;
  source?: 'SERVER_PERSISTED' | 'LOCAL_ONLY';
  isLocalOnly?: boolean;
  timestamp: string;
}

export interface WorkflowExecution {
  executionId: string;
  workflowId: string;
  attemptNumber: number;
  primaryWorker: WorkerRole;
  currentState: WorkflowState;
  previousState?: WorkflowState;
  source?: 'SERVER_PERSISTED' | 'LOCAL_ONLY';
  isLocalOnly?: boolean;
  startedAt: string;
  completedAt?: string;
  actions: WorkflowAction[];
  error?: string;
}

export interface WorkflowRecord {
  workflowId: string;
  jobId: string;
  campaignId: string;
  campaignTitle: string;
  platform: string;
  platformDomain: string;
  currentState: WorkflowState;
  previousState?: WorkflowState;
  activeWorker: WorkerRole;
  currentExecutionId: string;
  executions: WorkflowExecution[];
  publicUrl?: string;
  publicationVerified: boolean;
  otpCode?: string;
  source?: 'SERVER_PERSISTED' | 'LOCAL_ONLY';
  isLocalOnly?: boolean;
  // رهگیری دقیق زمان واقعی مراحل
  otpWaitStartedAt?: string;
  otpReceivedAt?: string;
  realOtpWaitDurationMs?: number;
  formFillStartedAt?: string;
  formFillCompletedAt?: string;
  realFormFillDurationMs?: number;
  publicationVerificationStartedAt?: string;
  publicationVerificationCompletedAt?: string;
  realVerificationDurationMs?: number;
  createdAt: string;
  updatedAt: string;
}

export const WORKFLOW_STATES_ORDER: WorkflowState[] = [
  'CREATED',
  'DISCOVERING',
  'DISCOVERED',
  'AD_GENERATING',
  'AD_READY',
  'OPENING_PLATFORM',
  'AUTHENTICATING',
  'REGISTERING',
  'LOGGING_IN',
  'INSPECTING_FORM',
  'MAPPING_FIELDS',
  'FILLING_FIELDS',
  'SUBMITTING',
  'OTP_REQUIRED',
  'WAITING_FOR_OTP',
  'OTP_RECEIVED',
  'OTP_SUBMITTED',
  'PUBLICATION_PENDING',
  'VERIFYING_PUBLICATION',
  'PUBLISHED'
];

export const WORKFLOW_STATE_LABELS: Record<WorkflowState, { fa: string; color: string; stepNumber: number }> = {
  CREATED: { fa: 'ایجاد شده', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30', stepNumber: 1 },
  DISCOVERING: { fa: 'در حال کشف پلتفرم', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30', stepNumber: 2 },
  DISCOVERED: { fa: 'پلتفرم شناسایی شد', color: 'text-sky-300 bg-sky-500/10 border-sky-500/30', stepNumber: 3 },
  AD_GENERATING: { fa: 'در حال تولید محتوای آگهی', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30', stepNumber: 4 },
  AD_READY: { fa: 'محتوا آماده انتشار', color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30', stepNumber: 5 },
  OPENING_PLATFORM: { fa: 'در حال باز کردن درگاه', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', stepNumber: 6 },
  AUTHENTICATING: { fa: 'بررسی نشست و ورود', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', stepNumber: 7 },
  REGISTERING: { fa: 'در حال ثبت‌نام خودکار', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', stepNumber: 8 },
  LOGGING_IN: { fa: 'در حال ورود به سامانه', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', stepNumber: 9 },
  INSPECTING_FORM: { fa: 'پیمایش و شناسایی فرم DOM', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', stepNumber: 10 },
  MAPPING_FIELDS: { fa: 'انطباق فیلدهای هوشمند', color: 'text-purple-300 bg-purple-500/10 border-purple-500/30', stepNumber: 11 },
  FILLING_FIELDS: { fa: 'در حال درج مقادیر در فرم', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', stepNumber: 12 },
  SUBMITTING: { fa: 'در حال ارسال و ثبت نهایی', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', stepNumber: 13 },
  OTP_REQUIRED: { fa: 'شناسایی نیاز به کد تایید', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', stepNumber: 14 },
  WAITING_FOR_OTP: { fa: 'در انتظار دریافت پیامک OTP', color: 'text-rose-500 bg-rose-500/20 border-rose-500/40 animate-pulse', stepNumber: 15 },
  OTP_RECEIVED: { fa: 'کد تایید دریافت شد', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', stepNumber: 16 },
  OTP_SUBMITTED: { fa: 'کد تایید اعمال شد', color: 'text-teal-400 bg-teal-500/10 border-teal-500/30', stepNumber: 17 },
  PUBLICATION_PENDING: { fa: 'در انتظار تایید سامانه مقصد', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', stepNumber: 18 },
  VERIFYING_PUBLICATION: { fa: 'در حال راستی‌آزمایی لینک واقعی', color: 'text-amber-300 bg-amber-500/10 border-amber-500/30', stepNumber: 19 },
  PUBLISHED: { fa: 'منتشر شد (دارای لینک معتبر)', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/50', stepNumber: 20 },
  FAILED: { fa: 'متوقف با خطا', color: 'text-red-400 bg-red-500/20 border-red-500/50', stepNumber: 99 },
  WAITING_FOR_HUMAN: { fa: 'نیازمند اقدام دستی کاربر', color: 'text-orange-400 bg-orange-500/20 border-orange-500/50', stepNumber: 98 },
  WAITING_FOR_WORKER: { fa: 'در انتظار فعال‌سازی Worker', color: 'text-amber-400 bg-amber-500/20 border-amber-500/50 animate-pulse', stepNumber: 96 },
  BLOCKED: { fa: 'مسدود شده (نیازمند شواهد/دسترسی)', color: 'text-rose-400 bg-rose-500/20 border-rose-500/50', stepNumber: 95 },
  UNKNOWN: { fa: 'وضعیت نامشخص', color: 'text-zinc-400 bg-zinc-500/20 border-zinc-500/50', stepNumber: 94 },
  CANCELLED: { fa: 'لغو شده توسط اپراتور', color: 'text-slate-500 bg-slate-500/20 border-slate-500/40', stepNumber: 97 }
};
