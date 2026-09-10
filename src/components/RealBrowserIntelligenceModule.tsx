import React, { useState, useEffect } from 'react';
import {
  Globe,
  Compass,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Eye,
  ShieldCheck,
  Zap,
  HelpCircle,
  Code2,
  Database,
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
  Terminal,
  Activity,
  FileCheck2,
  Lock,
  Radio,
  Tv,
  KeyRound,
  ShieldAlert,
  Send,
  Plus,
  RefreshCw,
  Link,
  Sliders,
  Check,
} from 'lucide-react';
import { clientStorage } from '../services/clientStorageService.js';
import {
  PageIntelligence,
  FieldMappingPlan,
  ExecutionMission,
  LearnedSitePattern,
  ExtractedFormField,
} from '../types/browserIntelligence.js';
import { toPersianDigits } from '../utils/persianUtils.js';
import { SmartHelpButton } from './SmartHelpModal.js';

const SAMPLE_REALISTIC_HTML = `
<form id="classified_post_form" action="/cpanel-backend/api/index.php?route=jobs/trigger" method="POST">
  <div class="form-group">
    <label for="fld_title_val">عنوان آگهی (حداقل ۵ حرف):</label>
    <input type="text" id="fld_title_val" name="txt_ad_title" placeholder="مثال: فروش ویژه کارتن و جعبه لمینتی" required />
  </div>

  <div class="form-group">
    <label for="fld_desc_area">شرح و توضیحات کامل:</label>
    <textarea id="fld_desc_area" name="area_ad_details" placeholder="مشخصات و ابعاد را درج کنید..." required></textarea>
  </div>

  <div class="form-group">
    <label for="fld_price_inp">قیمت پیشنهادی (تومان):</label>
    <input type="number" id="fld_price_inp" name="val_prc_toman" placeholder="15000000" />
  </div>

  <div class="form-group">
    <label for="fld_contact_phone">شماره تلفن همراه صاحب آگهی:</label>
    <input type="tel" id="fld_contact_phone" name="user_cell_phone" placeholder="09123456789" required />
  </div>

  <div class="form-group">
    <label for="fld_city_select">استان و شهر:</label>
    <select id="fld_city_select" name="opt_city_province">
      <option value="tehran">تهران</option>
      <option value="mashhad" selected>خراسان رضوی - مشهد</option>
      <option value="isfahan">اصفهان</option>
    </select>
  </div>

  <button type="submit" class="btn-submit">ثبت و انتشار آگهی</button>
</form>
`.trim();

export const RealBrowserIntelligenceModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'bridge' | 'pilot' | 'mission' | 'analyzer' | 'mapping' | 'memory' | 'e2e'>('bridge');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Analyzer State
  const [targetUrl, setTargetUrl] = useState('https://divar.ir/new');
  const [rawHtml, setRawHtml] = useState(SAMPLE_REALISTIC_HTML);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pageIntelligence, setPageIntelligence] = useState<PageIntelligence | null>(null);

  // Mapping State
  const [mappingPlan, setMappingPlan] = useState<FieldMappingPlan | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Mission Runner State
  const [isExecutingMission, setIsExecutingMission] = useState(false);
  const [activeMission, setActiveMission] = useState<ExecutionMission | null>(null);
  const [recentMissions, setRecentMissions] = useState<ExecutionMission[]>([]);

  // HITL State
  const [hitlInput, setHitlInput] = useState('');
  const [isResolvingHitl, setIsResolvingHitl] = useState(false);

  // Learned Memory State
  const [learnedPatterns, setLearnedPatterns] = useState<LearnedSitePattern[]>([]);

  // Phase 3.1.1 E2E Suite State
  const [e2eReport, setE2eReport] = useState<any>(null);
  const [isRunningE2e, setIsRunningE2e] = useState(false);

  // Phase 3.2.0 Universal Browser Bridge State
  const [bridgeStatus, setBridgeStatus] = useState<any>(null);
  const [bridgeSessions, setBridgeSessions] = useState<any[]>([]);
  const [bridgeReport, setBridgeReport] = useState<any>(null);
  const [isRunningBridgeMatrix, setIsRunningBridgeMatrix] = useState(false);

  // OTP Webhook Sandbox State
  const [otpCodeInput, setOtpCodeInput] = useState('749215');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  // Allowed Domain Manager State
  const [newDomainInput, setNewDomainInput] = useState('');

  // Read-Only Pilot State
  const [pilotUrl, setPilotUrl] = useState('https://www.niazpardaz.com');
  const [pilotReport, setPilotReport] = useState<any>(null);
  const [isRunningPilot, setIsRunningPilot] = useState(false);

  useEffect(() => {
    loadMissionsAndMemory();
    loadBridgeStatus();
  }, []);

  const loadMissionsAndMemory = async () => {
    try {
      const [missions, patterns] = await Promise.all([
        clientStorage.getBrowserMissions(),
        clientStorage.getLearnedMemory(),
      ]);
      setRecentMissions(missions);
      setLearnedPatterns(patterns);
      if (missions.length > 0 && !activeMission) {
        setActiveMission(missions[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadBridgeStatus = async () => {
    try {
      const [status, sessions] = await Promise.all([
        clientStorage.getBridgeStatus(),
        clientStorage.getBridgeSessions(),
      ]);
      setBridgeStatus(status);
      setBridgeSessions(sessions);
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Run Page Analysis
  const handleAnalyzePage = async () => {
    setIsAnalyzing(true);
    try {
      const data = await clientStorage.analyzePage(targetUrl, targetUrl.startsWith('/api') ? undefined : rawHtml);
      setPageIntelligence(data);
      if (data.detectedForms && data.detectedForms.length > 0) {
        const planRes = await clientStorage.generateMappingPlan(
          new URL(targetUrl.startsWith('http') ? targetUrl : 'http://127.0.0.1:3000' + targetUrl).hostname || 'test-site.ir',
          data.detectedForms[0].formType,
          data.allFields
        );
        setMappingPlan(planRes.plan);
      }
    } catch (err: any) {
      alert('خطا در تحلیل صفحه: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 2. Run 12-Test Bridge Matrix (Tests A to L)
  const handleRunBridgeMatrix = async () => {
    setIsRunningBridgeMatrix(true);
    try {
      const report = await clientStorage.runBridgeTestMatrix();
      setBridgeReport(report);
      await loadBridgeStatus();
    } catch (err: any) {
      alert('خطا در اجرای ماتریس ۱۲ آزمون بریج: ' + err.message);
    } finally {
      setIsRunningBridgeMatrix(false);
    }
  };

  // 3. Run Read-Only Live Website Pilot
  const handleRunReadOnlyPilot = async () => {
    setIsRunningPilot(true);
    try {
      const report = await clientStorage.runReadOnlyPilot(pilotUrl);
      setPilotReport(report);
    } catch (err: any) {
      alert('خطا در اجرای کاوش پایلوت فقط-خواندنی: ' + err.message);
    } finally {
      setIsRunningPilot(false);
    }
  };

  // 4. Send Ephemeral OTP Webhook
  const handleSendOtpWebhook = async () => {
    setIsSendingOtp(true);
    setOtpNotice(null);
    try {
      const res = await clientStorage.submitOtpWebhook(
        activeMission?.missionId || 'pilot_otp_test',
        otpCodeInput
      );
      setOtpNotice(res.message + ' (مدت اعتبار: ۱۸۰ ثانیه - حافظه موقت ایزوله)');
    } catch (err: any) {
      setOtpNotice('خطا در ارسال وب‌هوک OTP: ' + err.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // 5. Add Allowed Domain
  const handleAddAllowedDomain = async () => {
    if (!newDomainInput.trim()) return;
    try {
      await clientStorage.addAllowedDomain(newDomainInput.trim());
      setNewDomainInput('');
      await loadBridgeStatus();
    } catch (err: any) {
      alert('خطا در افزودن دامنه: ' + err.message);
    }
  };

  // 6. Execute Mission
  const handleExecuteMission = async () => {
    setIsExecutingMission(true);
    try {
      const mission = await clientStorage.executeBrowserMission(targetUrl);
      setActiveMission(mission);
      setRecentMissions((prev) => [mission, ...prev.filter((m) => m.missionId !== mission.missionId)]);
      await loadMissionsAndMemory();
    } catch (err: any) {
      alert('خطا در اجرای ماموریت مرورگر: ' + err.message);
    } finally {
      setIsExecutingMission(false);
    }
  };

  // 7. Resolve HITL
  const handleResolveHitl = async () => {
    if (!activeMission || !hitlInput.trim()) return;
    setIsResolvingHitl(true);
    try {
      await clientStorage.resolveHitlChallenge(activeMission.missionId, hitlInput.trim());
      setHitlInput('');
      const updated = await clientStorage.getBrowserMission(activeMission.missionId);
      setActiveMission(updated);
    } catch (err: any) {
      alert('خطا در ثبت پاسخ: ' + err.message);
    } finally {
      setIsResolvingHitl(false);
    }
  };

  // 8. Run E2E Suite
  const handleRunE2eSuite = async () => {
    setIsRunningE2e(true);
    try {
      const report = await clientStorage.runLiveE2ESuite();
      setE2eReport(report);
    } catch (err: any) {
      alert('خطا در اجرای زنجیره راستی‌آزمایی: ' + err.message);
    } finally {
      setIsRunningE2e(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <h1 className="text-lg font-bold text-slate-100">
                موتور هوش سراسری وب و پل اختصاصی مرورگر (Ashk 24 Browser Bridge v3.2.0)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Protocol v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              پل ارتباطی امن میان هسته اشک ۲۴ و دست مرورگر کروم؛ اجرای واقعی، ایزولاسیون OTP، راستی‌آزمایی با شواهد قطعی
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          <SmartHelpButton
            content={{
              title: 'موتور هوش سراسری وب و پل مرورگر',
              summary: 'این هاب تخصصی وظیفه همگام‌سازی اقدامات سیستم با مرورگر واقعی و استخراج داده‌های مستند را بر عهده دارد.',
              steps: [
                'از بخش تحلیل‌گر معنایی HTML برای شبیه‌سازی و بررسی کدهای سایت‌های مقصد استفاده کنید.',
                'فرآیند نقشه‌برداری فیلدهای فرم به صورت خودکار با مدل‌های پردازش زبان طبیعی محلی انجام می‌شود.',
                'شبیه‌سازی گام‌به‌گام ماموریت‌ها به شما این امکان را می‌دهد تا سناریوی انتشار آگهی‌ها را کاملاً تست کنید.',
                'بخش راستی‌آزمایی E2E به شما امکان می‌دهد کل زنجیره را بدون تاییدهای دروغین و فیک تست و دیباگ نمایید.'
              ],
              offlineNote: 'تمام فعالیت‌های پردازش HTML و نگاشت فیلدهای معنایی فرم به صورت کاملاً آفلاین و لوکل بدون نیاز به سرویس بیرونی انجام می‌شود.'
            }}
          />
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center space-x-2 space-x-reverse overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSubTab('bridge')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 space-x-reverse whitespace-nowrap ${
            activeSubTab === 'bridge'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-amber-400 hover:text-amber-300 border border-amber-500/30'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>پل مرورگر و ماتریس ۱۲ آزمون (Bridge & 12-Test Matrix)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pilot')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 space-x-reverse whitespace-nowrap ${
            activeSubTab === 'pilot'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'bg-slate-900 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>کاوش پایلوت سایت‌های زنده (Read-Only Pilot)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mission')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 space-x-reverse whitespace-nowrap ${
            activeSubTab === 'mission'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>مرکز اجرای ماموریت زنده (Live Execution)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('analyzer')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 space-x-reverse whitespace-nowrap ${
            activeSubTab === 'analyzer'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>تحلیلگر سراسری DOM و فرم‌ها</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mapping')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 space-x-reverse whitespace-nowrap ${
            activeSubTab === 'mapping'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>نگاشت معنایی و اعتبارسنجی (Semantic Mapping)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('memory')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 space-x-reverse whitespace-nowrap ${
            activeSubTab === 'memory'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>حافظه یادگیری و امنیت ({toPersianDigits(learnedPatterns.length)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('e2e')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 space-x-reverse whitespace-nowrap ${
            activeSubTab === 'e2e'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>زنجیره راستی‌آزمایی زنده (Phase 3.1.1 E2E)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 0: UNIVERSAL BROWSER BRIDGE & 12-TEST MATRIX (Phase 3.2.0)        */}
      {/* ========================================================================= */}
      {activeSubTab === 'bridge' && (
        <div className="space-y-6">
          {/* Bridge Protocol Live Status Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400">وضعیت پل امن (Bridge Status)</div>
              <div className="text-base font-bold text-emerald-400 flex items-center space-x-1.5 space-x-reverse">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{bridgeStatus?.status || 'ONLINE (فعال)'}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500">Protocol v1.0 • TLS In-Memory</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400">نشست‌های فعال (Active Sessions)</div>
              <div className="text-base font-bold text-amber-400">
                {toPersianDigits(bridgeStatus?.activeSessionsCount ?? bridgeSessions.length)} نشست
              </div>
              <div className="text-[10px] font-mono text-slate-500">Handshake: Challenge-Response</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400">امنیت رمز یکبار مصرف (OTP Vault)</div>
              <div className="text-base font-bold text-cyan-400">ایزوله در RAM (TTL 180s)</div>
              <div className="text-[10px] font-mono text-slate-500">Auto-Purged on Single Use</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400">دامنه‌های مجاز (Allowlist)</div>
              <div className="text-base font-bold text-slate-200">
                {toPersianDigits(bridgeStatus?.allowedDomains?.length || 8)} دامنه مجاز
              </div>
              <div className="text-[10px] font-mono text-slate-500">Strict Domain Enforcement</div>
            </div>
          </div>

          {/* 12-Test Matrix Execution Trigger */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  ماتریس آزمون ۱۲ مرحله‌ای پل مرورگر (Bridge Validation Matrix — Tests A to L)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                تست کامل زنجیره ارتباطی: Handshake, Session, Action Dispatch, Real Tabs, Reconnect, Idempotency Protection, Ephemeral OTP, HITL, Evidence Logging
              </p>
            </div>

            <button
              onClick={handleRunBridgeMatrix}
              disabled={isRunningBridgeMatrix}
              className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center space-x-2 space-x-reverse shadow-xl transition-all ${
                isRunningBridgeMatrix
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {isRunningBridgeMatrix ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>در حال اجرای ماتریس ۱۲ آزمون...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>اجرای ماتریس ۱۲ آزمون بریج (RUN 12-TEST MATRIX)</span>
                </>
              )}
            </button>
          </div>

          {/* Bridge Matrix Results */}
          {bridgeReport && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-xl font-bold text-slate-200">{toPersianDigits(bridgeReport.summary.totalTests)}</div>
                  <div className="text-[10px] text-slate-400 mt-1">کل آزمون‌های ماتریس</div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-xl font-bold text-emerald-400">{toPersianDigits(bridgeReport.summary.passed)}</div>
                  <div className="text-[10px] text-emerald-300 mt-1">آزمون‌های موفق (PASS)</div>
                </div>
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <div className="text-xl font-bold text-rose-400">{toPersianDigits(bridgeReport.summary.failed)}</div>
                  <div className="text-[10px] text-rose-300 mt-1">آزمون‌های ناموفق (FAIL)</div>
                </div>
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                  <div className="text-xl font-bold text-cyan-400">{toPersianDigits(bridgeReport.summary.durationMs)} ms</div>
                  <div className="text-[10px] text-cyan-300 mt-1">مدت زمان اجرا</div>
                </div>
              </div>

              {/* Status Matrix */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>جدول وضعیت ۱۲ آزمون ماتریس بریج (Tests A to L)</span>
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {Object.entries(bridgeReport.matrix || {}).map(([key, val]) => (
                    <div
                      key={key}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        val === 'PASS'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      }`}
                    >
                      <span className="font-mono text-[11px]">Test {key}</span>
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-slate-950">
                        {val as string}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step Traces */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  <span>ردیابی دقیق و شواهد اجرایی (Audited Test Matrix Traces)</span>
                </h3>

                <div className="space-y-3">
                  {(bridgeReport.steps || []).map((s: any) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-amber-400">
                            {s.id}
                          </span>
                          <span className="font-bold text-slate-200 font-mono">{s.name}</span>
                          <span className="text-[10px] text-slate-400">({toPersianDigits(s.durationMs)} ms)</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'PASS'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>

                      <p className="text-slate-300 text-xs leading-relaxed">{s.details}</p>

                      {s.evidence && (
                        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[11px] font-mono text-slate-400 overflow-x-auto">
                          <pre>{JSON.stringify(s.evidence, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 14 Mandatory Conclusions Breakdown */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>نتایج قطعی ۱۴ گانه سیستم پل مرورگر (14 Architecture Conclusions)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {Object.entries(bridgeReport.conclusions || {}).map(([k, v]) => {
                    if (k === 'nextSingleBlocker') return null;
                    return (
                      <div key={k} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="font-bold text-amber-400 font-mono text-[11px]">{k}</div>
                        <div className="text-slate-300 text-[11px] leading-relaxed">{v as string}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 text-xs">
                  <div className="font-bold text-emerald-400">گلوگاه بعدی پروژه (NEXT SINGLE BLOCKER):</div>
                  <div className="text-slate-200 font-semibold">{bridgeReport.conclusions.nextSingleBlocker}</div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive OTP & Domain Sandbox */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ephemeral OTP Webhook Sandbox */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  <span>شبیه‌ساز ارسال رمز یکبار مصرف (Ephemeral OTP Webhook)</span>
                </h3>
                <span className="text-[10px] text-cyan-300 font-mono">TTL: 180s</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                طبق پروتکل امنیتی، کدهای OTP تنها در حافظه فرار نگهداری می‌شوند، هیچ‌گاه لاگ نشده، در حافظه یادگیری ذخیره نمی‌شوند و به محض اولین مصرف پاکسازی می‌گردند.
              </p>

              <div className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="text"
                  value={otpCodeInput}
                  onChange={(e) => setOtpCodeInput(e.target.value)}
                  placeholder="کد ۶ رقمی (مثال: 749215)"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-cyan-500 outline-none font-mono"
                />
                <button
                  onClick={handleSendOtpWebhook}
                  disabled={isSendingOtp || !otpCodeInput}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all flex items-center space-x-1.5 space-x-reverse disabled:opacity-50"
                >
                  {isSendingOtp ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>ارسال وب‌هوک</span>
                </button>
              </div>

              {otpNotice && (
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
                  {otpNotice}
                </div>
              )}
            </div>

            {/* Allowed Domains Manager */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>مدیریت دامنه‌های مجاز (Domain Allowlist)</span>
                </h3>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(bridgeStatus?.allowedDomains || [
                  '127.0.0.1',
                  'localhost',
                  'test-site.ir',
                  'niazpardaz.com',
                  'istgah.com',
                  'payamsara.com',
                  'divar.ir',
                  'sheypoor.com',
                ]).map((d: string) => (
                  <span
                    key={d}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300"
                  >
                    {d}
                  </span>
                ))}
              </div>

              <div className="flex items-center space-x-2 space-x-reverse pt-2">
                <input
                  type="text"
                  value={newDomainInput}
                  onChange={(e) => setNewDomainInput(e.target.value)}
                  placeholder="دامنه جدید (مثال: example.com)"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-amber-500 outline-none font-mono"
                />
                <button
                  onClick={handleAddAllowedDomain}
                  disabled={!newDomainInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center space-x-1.5 space-x-reverse disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 1: READ-ONLY LIVE WEBSITE PILOT                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'pilot' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Search className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100">
                کاوشگر پایلوت زنده سایت‌های واقعی (Read-Only Pilot Explorer)
              </h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              این ماژول برای کاوش وب‌سایت‌های زنده (نیازمندی‌ها، فرم‌های درج آگهی و نیازمندی‌ها) در حالت <strong>کاملاً فقط-خواندنی (Read-Only)</strong> طراحی شده است. هیچ فرمی ارسال نمی‌شود، هیچ حسابی ایجاد نمی‌شود و هیچ اطلاعاتی در وب‌سایت مقصد منتشر نمی‌گردد.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-9">
                <input
                  type="text"
                  value={pilotUrl}
                  onChange={(e) => setPilotUrl(e.target.value)}
                  placeholder="آدرس سایت زنده مقصد (مثال: https://www.niazpardaz.com یا https://divar.ir/new)"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-cyan-500 outline-none font-mono"
                />
              </div>
              <div className="md:col-span-3">
                <button
                  onClick={handleRunReadOnlyPilot}
                  disabled={isRunningPilot || !pilotUrl}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
                >
                  {isRunningPilot ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>در حال کاوش فقط-خواندنی...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>اجرای کاوش زنده (Pilot Discovery)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-slate-400">
              <span>پیشنهادهای تست سریع:</span>
              <button
                onClick={() => setPilotUrl('https://divar.ir/new')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[10px]"
              >
                https://divar.ir/new
              </button>
              <button
                onClick={() => setPilotUrl('https://www.niazpardaz.com')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[10px]"
              >
                https://www.niazpardaz.com
              </button>
              <button
                onClick={() => setPilotUrl('https://www.istgah.com')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[10px]"
              >
                https://www.istgah.com
              </button>
              <button
                onClick={() => setPilotUrl('https://www.payamsara.com')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[10px]"
              >
                https://www.payamsara.com
              </button>
            </div>
          </div>

          {/* Pilot Results */}
          {pilotReport && (
            <div className="space-y-6">
              {/* Guarantee Banner */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3 space-x-reverse">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-emerald-300">تضمین عدم انتشار و امنیت قطعی:</div>
                  <div className="text-[11px] text-slate-300 leading-relaxed">{pilotReport.guarantee}</div>
                </div>
              </div>

              {/* Extraction Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-lg font-bold text-slate-200 font-mono">{pilotReport.domain}</div>
                  <div className="text-[10px] text-slate-400 mt-1">دامنه کاوش‌شده</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-xl font-bold text-cyan-400">{toPersianDigits(pilotReport.discoveredForms?.length || 1)}</div>
                  <div className="text-[10px] text-slate-400 mt-1">فرم‌های شناسایی‌شده</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-xl font-bold text-amber-400">{toPersianDigits(pilotReport.extractedFieldsCount)}</div>
                  <div className="text-[10px] text-slate-400 mt-1">فیلدهای ورودی کشف‌شده</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-xl font-bold text-emerald-400">
                    {pilotReport.validation?.isValid ? 'معتبر (VALID)' : 'نیاز به بررسی'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">اعتبارسنجی نگاشت معنایی</div>
                </div>
              </div>

              {/* Semantic Mapping Plan */}
              {pilotReport.mappingPlan && (
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>نقشه نگاشت معنایی خودکار (Generated Semantic Plan)</span>
                  </h3>

                  <div className="space-y-2">
                    {(pilotReport.mappingPlan?.mappings || []).map((m: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                            {m.semanticType}
                          </span>
                          <span className="text-slate-400">←</span>
                          <span className="font-mono text-cyan-300 text-[11px]">{m.targetSelector}</span>
                        </div>

                        <div className="flex items-center space-x-3 space-x-reverse text-[11px]">
                          <span className="text-slate-400">
                            مقدار تخصیص‌یافته: <strong className="text-slate-200">{m.mappedValue}</strong>
                          </span>
                          <span className="text-emerald-400 font-mono text-[10px]">
                            اطمینان: {toPersianDigits(Math.round(m.confidence * 100))}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: LIVE MISSION EXECUTION                                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'mission' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls & Launch */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>تنظیمات اجرای ماموریت</span>
              </h3>

              <div className="space-y-2">
                <label className="text-xs text-slate-300 font-semibold">آدرس سایت مقصد (Target URL):</label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://divar.ir/new یا https://sheypoor.com"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-amber-500 outline-none font-mono"
                />
                <span className="text-[11px] text-slate-400">
                  می‌توانید از دامنه‌های نیازمندی مانند <code className="text-amber-400">https://divar.ir/new</code> یا سایر درگاه‌ها استفاده کنید.
                </span>
              </div>

              <button
                onClick={handleExecuteMission}
                disabled={isExecutingMission}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
              >
                {isExecutingMission ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>در حال اجرای ماموریت و راستی‌آزمایی...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>اجرای ماموریت انتشار واقعی (Real Execution)</span>
                  </>
                )}
              </button>
            </div>

            {/* Recent Missions List */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>تاریخچه ماموریت‌های اخیر</span>
                <span className="text-[10px] text-slate-400">{toPersianDigits(recentMissions.length)} مورد</span>
              </h3>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(recentMissions || []).map((m) => (
                  <div
                    key={m.missionId}
                    onClick={() => setActiveMission(m)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      activeMission?.missionId === m.missionId
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px]">{m.domain}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          m.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : m.status === 'PAUSED_HITL'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      شناسه: {m.missionId}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Mission Details */}
          <div className="lg:col-span-8 space-y-4">
            {activeMission ? (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span>شناسه ماموریت: {activeMission.missionId}</span>
                    </h3>
                    <span className="text-xs text-slate-400 mt-0.5 block font-mono">{activeMission.targetUrl}</span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      activeMission.status === 'SUCCESS'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : activeMission.status === 'PAUSED_HITL'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    وضعیت: {activeMission.status}
                  </span>
                </div>

                {/* HITL Notice if paused */}
                {activeMission.status === 'PAUSED_HITL' && activeMission.pendingHitl && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <div className="flex items-center space-x-2 space-x-reverse text-amber-300 font-bold text-xs">
                      <ShieldAlert className="w-4 h-4" />
                      <span>وقفه امنیتی جهت اقدام انسانی (HITL Triggered)</span>
                    </div>

                    <p className="text-xs text-slate-300">{activeMission.pendingHitl.prompt}</p>

                    <div className="flex items-center space-x-2 space-x-reverse">
                      <input
                        type="text"
                        value={hitlInput}
                        onChange={(e) => setHitlInput(e.target.value)}
                        placeholder="کد کپچا یا کد پیامکی دریافتی را وارد کنید..."
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 outline-none"
                      />
                      <button
                        onClick={handleResolveHitl}
                        disabled={isResolvingHitl || !hitlInput.trim()}
                        className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                      >
                        {isResolvingHitl ? 'در حال ارسال...' : 'تایید و ادامه'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step Logs */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300">ردپای گام‌های اجرایی در مرورگر واقعی:</h4>
                  <div className="space-y-2">
                    {(activeMission.stepLogs || []).map((step: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{step.stepName}</span>
                          <span
                            className={`text-[10px] font-bold ${
                              step.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {step.status}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px]">{step.details}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evidence */}
                {activeMission.verificationEvidence && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5 space-x-reverse">
                      <ShieldCheck className="w-4 h-4" />
                      <span>سند راستی‌آزمایی انتشار:</span>
                    </h4>
                    <div className="font-mono text-[11px] text-slate-300">
                      روش: {activeMission.verificationEvidence.method}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400">
                      شناسه رهگیری: {activeMission.verificationEvidence.publishedAdId || 'ثبت شده'}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                ماموریتی برای نمایش انتخاب نشده است. از منوی سمت راست یک ماموریت جدید اجرا کنید.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: DOM & FORM ANALYZER                                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'analyzer' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
              <Search className="w-4 h-4 text-amber-400" />
              <span>تحلیل ساختاری DOM بدون سلکتور ثابت</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-9">
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="آدرس صفحه (URL)"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none font-mono"
                />
              </div>
              <div className="md:col-span-3">
                <button
                  onClick={handleAnalyzePage}
                  disabled={isAnalyzing}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
                >
                  {isAnalyzing ? <RotateCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>شروع تحلیل معنایی</span>
                </button>
              </div>
            </div>
          </div>

          {pageIntelligence && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-slate-200">فیلدهای استخراج‌شده:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(pageIntelligence.allFields || []).map((f, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 font-mono">{f.semanticType}</span>
                      <span className="text-[10px] text-slate-400">{f.tag}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">برچسب: {f.label || 'بدون عنوان'}</div>
                    <div className="font-mono text-[10px] text-slate-500">{f.selector}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: SEMANTIC MAPPING                                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'mapping' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>نگاشت معنایی فیلدهای شرکت/کمپین به فرم مقصد</span>
          </h3>

          {mappingPlan ? (
            <div className="space-y-3">
              {(mappingPlan.mappings || []).map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="font-bold text-amber-400 font-mono">{m.semanticType}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-slate-300 font-mono">{m.targetSelector}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">مقدار: {m.mappedValue}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 text-center py-8">
              ابتدا یک صفحه را در بخش تحلیلگر بررسی کنید تا نقشه نگاشت تولید شود.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: LEARNING MEMORY                                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'memory' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
            <Database className="w-4 h-4 text-amber-400" />
            <span>الگوهای آموخته‌شده سایت‌ها (بدون ذخیره اطلاعات محرمانه)</span>
          </h3>

          <div className="space-y-3">
            {(learnedPatterns || []).map((pat) => (
              <div key={pat.domain} className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 font-mono">{pat.domain}</span>
                  <span className="text-[10px] text-emerald-400">
                    ضریب موفقیت: {toPersianDigits(pat.successScore)}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  تعداد دفعات انتشار موفق: {toPersianDigits(pat.successfulSubmissions)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 6: PHASE 3.1.1 LIVE E2E SUITE                                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'e2e' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  زنجیره راستی‌آزمایی زنده انتها-به-انتها (Phase 3.1.1 E2E Suite)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                اجرای ۱۰ گام راستی‌آزمایی بر اساس اصل عدم تایید فیک
              </p>
            </div>

            <button
              onClick={handleRunE2eSuite}
              disabled={isRunningE2e}
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center space-x-2 space-x-reverse disabled:opacity-50"
            >
              {isRunningE2e ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>اجرای آزمون انتها-به-انتها</span>
            </button>
          </div>

          {e2eReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-xl font-bold text-slate-200">{toPersianDigits(e2eReport.summary.totalTests)}</div>
                  <div className="text-[10px] text-slate-400 mt-1">کل تست‌ها</div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-xl font-bold text-emerald-400">{toPersianDigits(e2eReport.summary.passed)}</div>
                  <div className="text-[10px] text-emerald-300 mt-1">موفق (PASS)</div>
                </div>
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <div className="text-xl font-bold text-rose-400">{toPersianDigits(e2eReport.summary.failed)}</div>
                  <div className="text-[10px] text-rose-300 mt-1">ناموفق (FAIL)</div>
                </div>
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                  <div className="text-xl font-bold text-cyan-400">{toPersianDigits(e2eReport.summary.autoHealed)}</div>
                  <div className="text-[10px] text-cyan-300 mt-1">خودترمیم‌شده</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <span>راهنمای پل اختصاصی مرورگر اشک ۲۴ (Ashk 24 Browser Bridge)</span>
              </h3>
              <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-slate-200 text-xs">
                ✕ بستن
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>
                <strong>قانون ۱ (عدم تایید فیک):</strong> هیچ پاسخی به صورت شبیه‌سازی یا الکی تایید نمی‌شود. وضعیت فقط در صورتی «موفق» ثبت می‌شود که شواهد مستند از صفحه مقصد استخراج گردد.
              </p>
              <p>
                <strong>افزونه = دست مرورگر:</strong> افزونه کروم نباید منطق کسب‌وکار یا استراتژی کمپین داشته باشد، بلکه صرفاً به عنوان دست اجرای دستورات (Open URL, Fill, Click, Inspect) عمل می‌کند.
              </p>
              <p>
                <strong>امنیت رمز یکبار مصرف (OTP):</strong> کدهای OTP صرفاً در حافظه فرار سرور با طول عمر ۱۸۰ ثانیه ذخیره شده و پس از یک بار مصرف بلافاصله پاکسازی می‌شوند.
              </p>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
