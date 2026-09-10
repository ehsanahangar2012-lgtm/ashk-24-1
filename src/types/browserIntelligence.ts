/**
 * ASHK 24 — Universal Website Intelligence & Real Browser Execution Types
 */

export type SemanticType =
  | 'company_name'
  | 'brand_name'
  | 'person_name'
  | 'email'
  | 'phone'
  | 'mobile'
  | 'website'
  | 'address'
  | 'province'
  | 'city'
  | 'postal_code'
  | 'title'
  | 'description'
  | 'category'
  | 'price'
  | 'product_name'
  | 'product_code'
  | 'image'
  | 'logo'
  | 'username'
  | 'password'
  | 'otp'
  | 'terms_agreement'
  | 'unknown';

export type DetectedFormType =
  | 'LOGIN'
  | 'REGISTRATION'
  | 'ADVERTISEMENT'
  | 'CONTACT'
  | 'SEARCH'
  | 'PROFILE'
  | 'CHECKOUT'
  | 'VERIFICATION'
  | 'UNKNOWN';

export interface RawElementData {
  tagName: string;
  name?: string;
  id?: string;
  type?: string;
  placeholder?: string;
  label?: string;
  ariaLabel?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  options?: Array<{ label: string; value: string }>;
  selector: string;
  xpath?: string;
  className?: string;
  nearbyText?: string;
}

export interface ExtractedFormField {
  element: RawElementData;
  type: string;
  label: string;
  placeholder: string;
  name: string;
  id: string;
  selector: string;
  required: boolean;
  semanticType: SemanticType;
  confidence: number; // 0.0 to 1.0
  reasoning: string[];
}

export interface PageIntelligence {
  url: string;
  title: string;
  detectedForms: DetectedFormInfo[];
  allFields: ExtractedFormField[];
  hasCaptcha: boolean;
  hasOtp: boolean;
  timestamp: string;
  rawDomSize: number;
}

export interface DetectedFormInfo {
  formId?: string;
  actionUrl?: string;
  method?: string;
  formType: DetectedFormType;
  confidence: number;
  fields: ExtractedFormField[];
  submitButtonSelector?: string;
  submitButtonText?: string;
}

export type ConfidenceTier = 'automatic' | 'automatic_validated' | 'require_review' | 'manual_only';

export interface SemanticMappingItem {
  targetFieldSelector: string;
  targetFieldLabel: string;
  targetFieldName: string;
  semanticType: SemanticType;
  sourceKey: string;
  sourceValue: any;
  transformedValue: any;
  confidence: number;
  confidenceTier: ConfidenceTier;
  transformationApplied?: string;
  isValid: boolean;
  validationError?: string;
}

export interface FieldMappingPlan {
  domain: string;
  formType: DetectedFormType;
  overallConfidence: number;
  mappings: SemanticMappingItem[];
  unmappedFields: ExtractedFormField[];
  missingRequiredFields: string[];
  isSubmittable: boolean;
  createdAt: string;
}

export interface PublicationEvidence {
  verified: boolean;
  evidenceType: 'redirect_url' | 'dom_success_message' | 'ad_id_extracted' | 'dashboard_entry' | 'none';
  publicationUrl?: string;
  adId?: string;
  evidenceSnippet?: string;
  capturedAt: string;
  screenshotBase64?: string;
}

export interface ExecutionTraceStep {
  stepNumber: number;
  name: string;
  timestamp: string;
  status: 'pending' | 'in_progress' | 'success' | 'warning' | 'error' | 'paused_hitl';
  message: string;
  details?: Record<string, any>;
  durationMs?: number;
}

export interface ExecutionMission {
  id: string;
  targetUrl: string;
  domain: string;
  campaignId?: string;
  status: 'idle' | 'inspecting' | 'analyzing' | 'mapping' | 'validating' | 'filling' | 'submitting' | 'verifying' | 'paused_hitl' | 'completed' | 'failed';
  currentStepIndex: number;
  traces: ExecutionTraceStep[];
  pageIntelligence?: PageIntelligence;
  mappingPlan?: FieldMappingPlan;
  evidence?: PublicationEvidence;
  hitlChallenge?: {
    type: 'OTP' | 'CAPTCHA' | 'EMAIL_LINK' | 'CUSTOM_CHALLENGE';
    prompt: string;
    resolved: boolean;
    responseReceived?: string;
  };
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface LearnedSitePattern {
  domain: string;
  formType: DetectedFormType;
  fingerprint: string;
  successfulMappings: Record<string, { selector: string; semanticType: SemanticType; transformation?: string }>;
  verificationMethod: 'redirect' | 'dom_selector' | 'ad_id';
  verificationPattern?: string;
  successCount: number;
  lastUpdated: string;
}
