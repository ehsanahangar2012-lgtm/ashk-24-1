/**
 * اینترفیس استاندارد آداپتورهای پلتفرم‌های انتشار (IPlatformAdapter)
 * منطبق بر قوانین چرخه حیات فاز ۶:
 * INIT -> AUTH_REQUIRED -> READY -> SUBMITTING -> OTP_REQUIRED -> HUMAN_ACTION_REQUIRED -> SUBMITTED -> VERIFYING -> VERIFIED -> FAILED
 */

import { Campaign, MediaPlatform, PublicationJob, CompanyProfile } from '../../types/ashk24.js';

export type PlatformLifecycleState =
  | 'INIT'
  | 'AUTH_REQUIRED'
  | 'READY'
  | 'SUBMITTING'
  | 'OTP_REQUIRED'
  | 'HUMAN_ACTION_REQUIRED'
  | 'SUBMITTED'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'FAILED'
  | 'UNSUPPORTED_PLATFORM';

export interface SubmissionContext {
  campaign: Campaign;
  job: PublicationJob;
  companyProfile: CompanyProfile;
  platform: MediaPlatform;
}

export interface VerificationContext {
  targetUrl: string;
  jobId: string;
  expectedTitle?: string;
  expectedPhone?: string;
}

export interface ValidationResult {
  valid: boolean;
  state: PlatformLifecycleState;
  errors?: string[];
  missingFields?: string[];
}

export interface SubmissionResult {
  success: boolean;
  state: PlatformLifecycleState;
  progressPercent: number;
  currentStep: string;
  httpCode: number;
  trackingUrl: string;
  adUrl?: string | null;
  platformName: string;
  platformDomain: string;
  adapterUsed: string;
}

export interface VerificationResult {
  verified: boolean;
  state: PlatformLifecycleState;
  httpStatus: number;
  evidenceCaptured: boolean;
  evidenceSnippet?: string | null;
  verifiedAt: string;
}

export interface IPlatformAdapter {
  id: string;
  name: string;
  canHandle(platform: string | MediaPlatform): boolean;
  validate(context: SubmissionContext): Promise<ValidationResult>;
  submit(context: SubmissionContext): Promise<SubmissionResult>;
  verify(context: VerificationContext): Promise<VerificationResult>;
}
