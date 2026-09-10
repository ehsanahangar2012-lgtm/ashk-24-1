export interface MobileDeviceConfig {
  paired: boolean;
  deviceName: string;
  pairingCode: string;
  apiKey: string;
  autoSmsInterceptEnabled: boolean;
  autoEmailInterceptEnabled: boolean;
  pushNotificationsEnabled: boolean;
  notifyOnRegistration: boolean;
  notifyOnAdPublished: boolean;
  notifyOnOtpRequired: boolean;
  notifyOnError: boolean;
  lastConnectedAt?: string;
  pushToken?: string;
  deviceOs: 'android' | 'ios' | 'web_pwa';
}

export interface MobileNotificationLog {
  id: string;
  title: string;
  message: string;
  type: 'registration' | 'ad_published' | 'otp_required' | 'error' | 'info';
  timestamp: string;
  delivered: boolean;
  platformName?: string;
  targetUrl?: string;
}

export type BrandTone = 'formal' | 'friendly' | 'persuasive' | 'luxurious' | 'urgent';

export type BusinessSector = 
  | 'real_estate'         // املاک و مسکن
  | 'automotive'          // خودرو و وسایل نقلیه
  | 'digital_goods'       // کالای دیجیتال و الکترونیک
  | 'industrial'          // خدمات صنعتی و ابزارآلات
  | 'industrial_machinery'// ماشین‌آلات و تجهیزات صنعتی
  | 'home_appliances'     // لوازم خانگی و دکوراسیون
  | 'services'            // خدمات تخصصی و کسب‌وکار
  | 'consumer_services'   // خدمات عمومی و مصرفی
  | 'b2b_services'        // خدمات B2B
  | 'education_courses'   // آموزش و دوره‌ها
  | 'healthcare'          // سلامت و پزشکی
  | 'food_beverage'       // مواد غذایی و نوشیدنی
  | 'tourism'             // گردشگری و تور
  | 'construction'        // ساختمانی و عمران
  | 'fashion';            // پوشاک و مد

export interface InternalSiteConfig {
  enabled: boolean;
  type: 'wordpress_rest' | 'cpanel_php_bridge' | 'custom_webhook';
  url: string;
  username?: string;
  appPassword?: string;
  apiKey?: string;
  defaultCategoryId?: number;
  autoPublishNewCampaigns?: boolean;
  lastPublishDate?: string;
  lastPublishPostId?: string | number;
  lastPublishUrl?: string;
  connectionStatus?: 'connected' | 'error' | 'untested';
  lastErrorMessage?: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  brandName: string;
  nationalCode: string;
  phoneNumber: string;
  email: string;
  website: string;
  address: string;
  sector: BusinessSector;
  defaultTone: BrandTone;
  keywords: string[];
  targetAudience: string;
  // Asset Vault fields
  logoUrl?: string;
  contactPerson?: string;
  taxId?: string;
  registrationNumber?: string;
  telegramChannel?: string;
  instagramHandle?: string;
  catalogPdfUrl?: string;
  productImages?: string[];
  aboutUsSummary?: string;
  internalSite?: InternalSiteConfig;
  updatedAt: string;
}

export interface AutonomousSettings {
  enabled: boolean;
  scanIntervalMinutes: number; // e.g. 15 or 30 mins
  autoCreateCampaigns: boolean;
  autoPublishAds: boolean;
  dailyAdLimit: number;
  lastExecutionTime?: string;
  totalDiscoveredCount: number;
  totalAutoPublishedCount: number;
}

export interface AutonomousLog {
  id: string;
  timestamp: string;
  action: 'discovery' | 'campaign_generation' | 'publication_launched' | 'otp_waiting' | 'system_idle';
  title: string;
  details: string;
  status: 'info' | 'success' | 'warning' | 'error';
}

export type UserRole = 'admin' | 'operator';

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export interface AuthSession {
  token: string;
  user: UserAccount;
}

export type PlatformCategory = 'classifieds' | 'social' | 'blog' | 'directory' | 'b2b';

export interface MediaPlatform {
  id: string;
  name: string;
  persianName: string;
  domain: string;
  category: PlatformCategory;
  sectorFit: BusinessSector[];
  monthlyVisits: string;
  requiresOtp: boolean;
  supportsImage: boolean;
  formType: 'classified' | 'article' | 'post' | 'directory_entry';
  active: boolean;
  trustScore: number; // 0 - 100
  // Smart Session Vault (کوکی‌ها و توکن‌های فعال)
  sessionStatus?: 'none' | 'authenticated' | 'expired' | 'refreshing';
  sessionToken?: string;
  sessionCookies?: Record<string, string>;
  accountPhoneNumber?: string;
  accountUsername?: string;
  accountPassword?: string;
  lastLoginAt?: string;
  sessionExpiresAt?: string;
  autoRefreshCookies?: boolean;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'paused' | 'failed';

export interface Campaign {
  id: string;
  title: string;
  companyId: string;
  selectedPlatformIds: string[];
  productName: string;
  productDescription: string;
  priceToman: number;
  sector: BusinessSector;
  tone: BrandTone;
  targetKeywords: string[];
  jalaliScheduleDate: string; // e.g., "1404/05/25"
  jalaliScheduleTime: string; // e.g., "14:30"
  status: CampaignStatus;
  autoRetryCount: number;
  generatedContentId?: string;
  createdAt: string;
  updatedAt: string;
  // Auto-Renewal and Bumping System (تمدید خودکار ۳۰ روزه و نردبان)
  isRenewalScheduled?: boolean;
  renewalIntervalDays?: number; // default: 30 days
  lastRenewalDate?: string;
  nextRenewalDate?: string;
  renewalCount?: number;
}

export interface ContentGenerationRequest {
  productName: string;
  description: string;
  priceToman?: number;
  tone: BrandTone;
  keywords: string[];
  targetPlatform: string;
  sector: BusinessSector;
  forceOfflineFallback?: boolean;
}

export interface ContentGenerationResult {
  id: string;
  title: string;
  bodyText: string;
  shortSnippet: string;
  bulletPoints: string[];
  seoKeywordsUsed: string[];
  seoScore: number; // 0 - 100
  suggestedHashtags: string[];
  suggestedCategory: string;
  callToAction: string;
  generatedBy: 'offline-heuristic-engine' | 'cpanel-native-engine';
  isFallback: boolean;
  generatedAt: string;
}

export interface SeoAnalysisResult {
  keywordDensity: { keyword: string; count: number; percentage: number }[];
  readabilityScore: number;
  seoScore: number;
  strengths: string[];
  improvements: string[];
  persianTextMetrics: {
    wordCount: number;
    paragraphCount: number;
    characterCount: number;
  };
}

export interface DomSemanticField {
  fieldName: string;
  persianLabel: string;
  fieldType: 'text' | 'number' | 'tel' | 'textarea' | 'select' | 'file' | 'otp' | 'email';
  detectedSelector: string;
  confidenceScore: number; // 0 - 100
  sampleValue?: string;
  isRequired: boolean;
  mappingKey: 'title' | 'description' | 'price' | 'phone' | 'category' | 'city' | 'otp_code' | 'email';
}

export interface DomAnalysisResult {
  domain: string;
  detectedFields: DomSemanticField[];
  formActionUrl: string;
  formType: string;
  hasOtpStep: boolean;
  hasCaptcha: boolean;
  parsedBy: 'offline-semantic-parser' | 'cpanel-native-parser';
}

export type JobStatus = 'pending' | 'claimed' | 'navigating' | 'parsing_dom' | 'filling_data' | 'waiting_otp' | 'otp_received' | 'solving_captcha' | 'waiting_human_action' | 'paused_user_action' | 'resumed' | 'submitting' | 'verifying' | 'published' | 'failed';

export interface JobStepLog {
  timestamp: string;
  step: string;
  status: 'info' | 'success' | 'warning' | 'error';
  message: string;
  detail?: string;
}

export interface PublicationFieldMapping {
  fieldLabel: string;
  detectedSelector: string;
  mappingKey: string;
  injectedValue: string;
}

export interface PublicationJob {
  id: string;
  campaignId: string;
  platformId: string;
  platformName: string;
  status: JobStatus;
  currentStep: string;
  progressPercent: number;
  logs: JobStepLog[];
  otpRequired: boolean;
  otpCodeExtracted?: string;
  humanActionRequired?: boolean;
  challengeInfo?: {
    type: 'captcha' | 'ddos_gate' | 'recaptcha' | 'cloudflare';
    targetUrl: string;
    gateUrl?: string;
    description: string;
    detectedAt: string;
  };
  tempStorage?: any;
  adUrl?: string;
  publishedTitle?: string;
  publishedBodyText?: string;
  publishedImages?: string[];
  fieldMappingsApplied?: PublicationFieldMapping[];
  authMethodUsed?: 'session_vault_active' | 'auto_registration' | 'sms_otp_login' | 'direct_portal';
  categoryPublished?: string;
  usedEngine: 'online-ai' | 'offline-fallback' | 'cpanel-native';
  startedAt: string;
  completedAt?: string;
}

export interface PublicationReportItem {
  id: string;
  jobId: string;
  campaignTitle: string;
  platformId: string;
  platformName: string;
  domain: string;
  category: string;
  publishedTitle: string;
  publishedBodyText: string;
  publishedImages: string[];
  fieldMappings: PublicationFieldMapping[];
  authStatus: 'session_vault_used' | 'auto_registered' | 'logged_in' | 'otp_bypassed';
  publishedUrl: string;
  jalaliPublishedDate: string;
  status: 'published' | 'pending_moderation' | 'waiting_otp' | 'failed';
  engineUsed: string;
  verifiedOnline: boolean;
}

export interface ContinuousAutomationProgress {
  isRunning: boolean;
  currentPlatformIndex: number;
  totalPlatforms: number;
  currentPlatformName: string;
  currentStage: 'idle' | 'generating_text' | 'selecting_site' | 'authenticating' | 'inspecting_dom' | 'filling_fields' | 'publishing' | 'logging_report' | 'completed';
  completedCount: number;
  successCount: number;
  waitingOtpCount: number;
  failedCount: number;
  currentLogMessage: string;
}

export interface SmsWebhookPayload {
  id: string;
  senderNumber: string;
  receiverNumber: string;
  messageText: string;
  receivedAt: string;
  extractedCode?: string;
  matchedJobId?: string;
  status: 'parsed' | 'unmatched' | 'matched' | 'verified';
}

export interface EmailWebhookPayload {
  id: string;
  from: string;
  subject: string;
  body: string;
  verificationLink?: string;
  receivedAt: string;
  matchedJobId?: string;
  status: 'parsed' | 'unmatched';
}

export interface ResilienceStatus {
  cpanelApiAvailable: boolean;
  forcedOfflineMode: boolean;
  activeEngine: 'offline-heuristic-engine' | 'cpanel-native-engine';
  lastHealthCheck: string;
  totalRequestsCount: number;
  fallbackCount: number;
}

export interface UploadedFileAsset {
  id: string;
  fileName: string;
  originalName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  category: 'logo' | 'ad_image' | 'catalog' | 'other';
  uploadedAt: string;
}

export interface CronJobExecution {
  id: string;
  timestamp: string;
  durationMs: number;
  triggerType: 'scheduled_cron' | 'manual_test' | 'webhook_ping';
  scriptName: string;
  status: 'success' | 'warning' | 'error';
  discoveredMediaCount: number;
  publishedAdsCount: number;
  renewedCount: number;
  exitCode: number;
  outputSummary: string;
  rawConsoleLogs: string[];
}

export interface ServerDiagnosticItem {
  id: string;
  title: string;
  category: 'server' | 'cron' | 'port' | 'storage' | 'ai';
  status: 'passed' | 'warning' | 'failed' | 'checking';
  details: string;
  recommendation?: string;
  actionCommand?: string;
}

export interface ServerDiagnosticReport {
  overallStatus: 'healthy' | 'warning' | 'degraded_offline';
  timestamp: string;
  items: ServerDiagnosticItem[];
}

export type TelemetryFailureReason =
  | 'MISSING_SELECTOR'
  | 'CAPTCHA_BLOCKED'
  | 'RATE_LIMITED'
  | 'INVALID_OTP_FIELD'
  | 'CSRF_TOKEN_EXPIRED'
  | 'CORS_ORIGIN_REJECTED'
  | 'SESSION_TIMEOUT'
  | 'NETWORK_OFFLINE'
  | 'PLATFORM_LAYOUT_CHANGED';

export interface TelemetryAutoPatch {
  patchId: string;
  targetPlatformId: string;
  issueType: string;
  title: string;
  description: string;
  suggestedSelectorFix?: string;
  suggestedEndpointFix?: string;
  suggestedHeadersFix?: Record<string, string>;
  suggestedPayloadFormat?: string;
  status: 'pending' | 'applied' | 'rejected';
  appliedAt?: string;
}

export interface FormFieldValidationResult {
  fieldName: string;
  selector: string;
  value: string;
  isValid: boolean;
  hasCssErrorClass: boolean;
  detectedErrorClasses?: string[];
  errorMessage?: string;
}

export interface PreSubmissionValidationPayload {
  platformId: string;
  platformName: string;
  formType: 'registration' | 'ad_creation' | 'otp_verification';
  targetUrl: string;
  validatedAt: string;
  allValid: boolean;
  fields: FormFieldValidationResult[];
  capturedScreenshotBase64?: string;
  validationLogId?: string;
}

export interface DomWatcherEvent {
  id: string;
  timestamp: string;
  platformId: string;
  platformName: string;
  actionType: 'QUERY_SELECTOR' | 'TYPE_INPUT' | 'CLICK_ELEMENT' | 'VALIDATE_FIELD' | 'ELEMENT_NOT_FOUND' | 'ERROR_CLASS_DETECTED' | 'FORM_SUBMIT_ATTEMPT';
  targetSelector: string;
  elementTag?: string;
  fieldLabel?: string;
  inputValue?: string;
  status: 'info' | 'success' | 'warning' | 'error';
  details: string;
  screenshotBase64?: string;
}

export interface DomBaselineSchema {
  platformId: string;
  platformName: string;
  domain: string;
  lastVerified: string;
  expectedFormSelectors: {
    phoneInput: string;
    otpInput?: string;
    submitButton: string;
    adTitleInput?: string;
    adDescriptionInput?: string;
    adPriceInput?: string;
    categoryDropdown?: string;
  };
  expectedCaptchaType: string;
}

export interface SelfHealingCheckResult {
  platformId: string;
  platformName: string;
  checkTimestamp: string;
  isCompliant: boolean;
  mismatchedSelectors: {
    expectedSelector: string;
    fieldRole: string;
    issue: 'SELECTOR_NOT_FOUND' | 'CLASS_CHANGED' | 'NEW_CAPTCHA_DETECTED' | 'HIDDEN_INPUT_ADDED';
    suggestedFixSelector?: string;
  }[];
  aiAutoPatchGenerated?: boolean;
  patchId?: string;
  diagnosticSummary: string;
}

export interface PublicationTelemetryLog {
  id: string;
  jobId?: string;
  campaignId?: string;
  platformId: string;
  platformName: string;
  platformDomain: string;
  timestamp: string;
  stage: 'platform_connect' | 'dom_analysis' | 'form_filling' | 'otp_request' | 'otp_verify' | 'ad_submission' | 'pre_validation' | 'self_healing_audit';
  httpStatus?: number;
  httpCode?: number;
  latencyMs?: number;
  reachable?: boolean;
  responseHash?: string | null;
  requestUrl?: string;
  requestMethod?: 'GET' | 'POST' | 'PUT';
  requestHeaders?: Record<string, string>;
  requestBodySummary?: string;
  responseHeaders?: Record<string, string>;
  responseSnippet?: string;
  detectedFormInputs?: string[];
  detectedCaptchaType?: 'none' | 'recaptcha' | 'hcaptcha' | 'custom_ocr' | 'image_text';
  ocrExtractedText?: string;
  status: 'success' | 'warning' | 'error';
  failureReason?: TelemetryFailureReason;
  errorDetails?: string;
  aiDiagnosticSummary?: string;
  suggestedAutoPatch?: TelemetryAutoPatch;
  preValidationResult?: PreSubmissionValidationPayload;
  validationScreenshotBase64?: string;
}

export interface ExtensionFileEntry {
  path: string;
  content: string;
  description: string;
  isBinary?: boolean;
}

export interface ChromeExtensionManifestDetails {
  manifestVersion: number;
  name: string;
  version: string;
  description: string;
  permissions: string[];
  hostPermissions: string[];
}

export interface ExtensionTargetSiteConfig {
  id: string;
  name: string;
  domain: string;
  postUrl: string;
  category: string;
  fields: {
    titleSelector: string;
    bodySelector: string;
    phoneSelector: string;
    citySelector: string;
    groupSelector?: string;
    captchaInputSelector?: string;
    captchaImgSelector?: string;
    submitSelector: string;
  };
}

export interface PublicationDebuggerReport {
  timestamp: string;
  totalTraces: number;
  successRatePercent: number;
  failedTracesCount: number;
  activeHeadless: boolean;
  detectedIssues: Array<{
    platformName: string;
    failureReason: string;
    count: number;
    lastOccurrence: string;
  }>;
  autoPatchesAvailable: TelemetryAutoPatch[];
}

// =========================================================================
// انواع داده‌های ماژول تست واقعی سرور پروداکشن: Production Test Harness
// =========================================================================
export type TestStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIPPED' | 'RUNNING' | 'INVALIDATED';
export type TestMode = 'SAFE_TEST' | 'LIVE_TEST';
export type ExecutionEnvironment = 'CPANEL_SERVER' | 'BROWSER_LOCAL';
export type ExecutionMode = 'REAL_SERVER' | 'CLIENT_FALLBACK';

export type TestCategory = 
  | 'infrastructure' 
  | 'api_contract' 
  | 'authentication' 
  | 'otp_e2e' 
  | 'captcha_human' 
  | 'registration_flow' 
  | 'publication';

export interface TestHarnessStep {
  id?: number | string;
  runId: string;
  category: TestCategory;
  stepName: string;
  endpoint?: string;
  httpStatus: number;
  status: TestStatus;
  jobId?: string | null;
  platform?: string | null;
  durationMs: number;
  stateTransition?: string | null;
  error?: string | null;
  EXECUTION_ENVIRONMENT?: ExecutionEnvironment;
  EXECUTION_MODE?: ExecutionMode;
  evidence?: {
    REAL_EXECUTION?: 'YES' | 'NO';
    EXTERNAL_CALL?: 'YES' | 'NO';
    SMS_ACTUALLY_RECEIVED?: 'YES' | 'NO';
    CAPTCHA_ACTUALLY_DETECTED?: 'YES' | 'NO';
    PUBLISHED_ACTUALLY?: 'YES' | 'NO';
    ANTI_FAKE_VERIFIED?: 'YES' | 'NO';
    EXECUTION_ENVIRONMENT?: ExecutionEnvironment;
    gatewaySignatureVerified?: boolean;
    sender?: string | null;
    messageId?: string | null;
    source?: string | null;
    [key: string]: any;
  } | any;
  createdAt?: string;
}

export interface TestHarnessRun {
  runId: string;
  mode: TestMode;
  overallStatus: TestStatus;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  blockedTests: number;
  skippedTests: number;
  durationMs: number;
  summary: string;
  startedAt: string;
  completedAt?: string | null;
  EXECUTION_ENVIRONMENT: ExecutionEnvironment;
  EXECUTION_MODE?: ExecutionMode;
  REAL_EXECUTION: 'YES' | 'NO';
  EXTERNAL_CALL?: 'YES' | 'NO';
  SMS_ACTUALLY_RECEIVED?: 'YES' | 'NO';
  CAPTCHA_ACTUALLY_DETECTED?: 'YES' | 'NO';
  PUBLISHED_ACTUALLY?: 'YES' | 'NO';
  ANTI_FAKE_VERIFIED?: 'YES' | 'NO';
  invalidationTimestamp?: string;
  invalidationReason?: string;
  invalidationPreviousStatus?: TestStatus;
  invalidatedBy?: string;
  steps: TestHarnessStep[];
}

export interface TestHarnessStatusResponse {
  serverTime: string;
  totalRecordedRuns: number;
  latestRun?: TestHarnessRun | null;
  recentRuns: TestHarnessRun[];
  harnessReady: boolean;
  supportedModes: string[];
}

export * from './browserIntelligence.js';


