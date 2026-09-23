import React, { useState, useEffect } from 'react';
import { APP_VERSION, APP_VERSION_TAG } from './config/version.js';
import { BUILD_TIMESTAMP, BUILD_HASH } from './config/build-info.js';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { MediaDiscoveryModule } from './components/MediaDiscoveryModule';
import { CampaignManagerModule } from './components/CampaignManagerModule';
import { JobQueueMonitorModule } from './components/JobQueueMonitorModule';
import { PublicationReportModule } from './components/PublicationReportModule';
import { ProductionTestHarnessModule } from './components/ProductionTestHarnessModule';
import { CompanyProfileView } from './components/CompanyProfileView';
import { CompanyProfileModal } from './components/CompanyProfileModal';
import { CompanyAssetsAndConfigModule } from './components/CompanyAssetsAndConfigModule';
import { CampaignHealthMonitorModule } from './components/CampaignHealthMonitorModule';
import { AnalyticsDashboardModule } from './components/AnalyticsDashboardModule';
import { ImageUploadVaultModal } from './components/ImageUploadVaultModal';
import { CpanelGuideModal } from './components/CpanelGuideModal';
import { StepByStepGuideModal } from './components/StepByStepGuideModal';
import { MobileCompanionModule } from './components/MobileCompanionModule';
import { LoginGate, UserSecurityModal } from './components/LoginGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { KeyRound, Sparkles, RefreshCw, ShieldCheck, Database } from 'lucide-react';
import { clientStorage } from './services/clientStorageService';

import {
  CompanyProfile,
  Campaign,
  MediaPlatform,
  PublicationJob,
  SmsWebhookPayload,
  ResilienceStatus,
  UserAccount,
} from './types/ashk24';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('campaigns');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [showCompanyModal, setShowCompanyModal] = useState<boolean>(false);
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);
  const [showMediaVaultModal, setShowMediaVaultModal] = useState<boolean>(false);
  const [showCpanelModal, setShowCpanelModal] = useState<boolean>(false);
  const [showStepByStepGuideModal, setShowStepByStepGuideModal] = useState<boolean>(false);

  // Authentication state initialized only with saved localStorage or null (force login gate)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const savedUser = localStorage.getItem('ashk24_user');
      if (savedUser) return JSON.parse(savedUser);
    } catch (e) {}
    return null;
  });

  const handleLoginSuccess = (user: UserAccount, token: string) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('ashk24_user', JSON.stringify(user));
      localStorage.setItem('ashk24_token', token);
    } catch (e) {}
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowSecurityModal(false);
    try {
      localStorage.removeItem('ashk24_user');
      localStorage.removeItem('ashk24_token');
    } catch (e) {}
  };

  // Data states
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [platforms, setPlatforms] = useState<MediaPlatform[]>([]);
  const [jobs, setJobs] = useState<PublicationJob[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsWebhookPayload[]>([]);
  const [resilience, setResilience] = useState<ResilienceStatus | null>(null);

  // Fetch all initial data using unified clientStorage service
  const fetchAllData = async () => {
    try {
      const [cmpRes, cmpsRes, campRes, platRes, jobRes, smsRes, resilRes] = await Promise.all([
        clientStorage.getCompanyProfile(),
        clientStorage.getCompanies(),
        clientStorage.getCampaigns(),
        clientStorage.getPlatforms(),
        clientStorage.getJobs(),
        clientStorage.getSmsLogs(),
        clientStorage.getResilienceStatus(),
      ]);

      setCompany(cmpRes);
      setCompanies(cmpsRes);
      setCampaigns(campRes);
      setPlatforms(platRes);
      setJobs(jobRes);
      setSmsLogs(smsRes);
      setResilience(resilRes);
    } catch (e) {
      console.error('Error fetching data:', e);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Poll jobs and SMS logs every 3 seconds
    const interval = setInterval(() => {
      clientStorage.getJobs().then((data) => setJobs(data)).catch(() => {});
      clientStorage.getSmsLogs().then((data) => setSmsLogs(data)).catch(() => {});
      clientStorage.getResilienceStatus().then((data) => setResilience(data)).catch(() => {});
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleSelectCompany = async (id: string) => {
    try {
      const updated = await clientStorage.setActiveCompany(id);
      const all = await clientStorage.getCompanies();
      setCompany(updated);
      setCompanies(all);
    } catch (e) {
      console.error('Error switching active company:', e);
    }
  };

  const handleCreateCompany = async (newCompany: Omit<CompanyProfile, 'id' | 'updatedAt'>) => {
    try {
      const created = await clientStorage.createCompanyProfile(newCompany);
      const all = await clientStorage.getCompanies();
      setCompanies(all);
      if (all.length === 1) {
        setCompany(created);
      }
    } catch (e) {
      console.error('Error creating new company:', e);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    try {
      const success = await clientStorage.deleteCompanyProfile(id);
      if (success) {
        const all = await clientStorage.getCompanies();
        const active = await clientStorage.getCompanyProfile();
        setCompanies(all);
        setCompany(active);
      }
    } catch (e) {
      console.error('Error deleting company:', e);
    }
  };

  // Handlers
  const handleTriggerJob = async (campaignId: string, platformId: string) => {
    try {
      const createdJob = await clientStorage.triggerJob(campaignId, platformId);
      if (createdJob) {
        setJobs((prev) => [createdJob, ...prev]);
        setActiveTab('jobs');
      }
    } catch (e) {
      console.error('Error triggering publication job:', e);
    }
  };

  const handleCreateCampaign = async (
    newCamp: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      const created = await clientStorage.createCampaign(newCamp);
      if (created) {
        setCampaigns((prev) => [created, ...prev]);

        // Refresh platforms and jobs immediately to reflect auto-launched jobs and authenticated sessions
        setTimeout(async () => {
          try {
            const [refreshedJobs, refreshedPlatforms] = await Promise.all([
              clientStorage.getJobs(),
              clientStorage.getPlatforms(),
            ]);
            setJobs(refreshedJobs);
            setPlatforms(refreshedPlatforms);
          } catch (err) {}
        }, 500);

        setActiveTab('jobs');
        return created;
      }
    } catch (e) {
      console.error('Error creating campaign:', e);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      await clientStorage.deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error('Error deleting campaign:', e);
    }
  };

  const handleSaveCompanyProfile = async (updated: Partial<CompanyProfile>) => {
    try {
      const saved = await clientStorage.saveCompanyProfile(updated);
      if (saved) {
        setCompany(saved);
      }
    } catch (e) {
      console.error('Error updating company profile:', e);
    }
  };

  const handleToggleForcedOffline = async (forced: boolean) => {
    try {
      const cur = await clientStorage.getResilienceStatus();
      setResilience({ ...cur, forcedOfflineMode: forced });
    } catch (e) {
      console.error('Error toggling forced offline mode:', e);
    }
  };

  const activeJobsCount = jobs.filter(
    (j) => j.status !== 'published' && j.status !== 'failed'
  ).length;

  const waitingOtpJobs = jobs.filter((j) => j.status === 'waiting_otp');

  return (
    <LoginGate
      currentUser={currentUser}
      onLoginSuccess={handleLoginSuccess}
      onLogout={handleLogout}
    >
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Top Navigation */}
        <Navbar
          resilience={resilience}
          company={company}
          companies={companies}
          currentUser={currentUser}
          onOpenCompanyModal={() => setShowCompanyModal(true)}
          onOpenMediaVault={() => setShowMediaVaultModal(true)}
          onOpenCpanelGuide={() => setShowCpanelModal(true)}
          onOpenStepByStepGuide={() => setShowStepByStepGuideModal(true)}
          onOpenSecurityModal={() => setShowSecurityModal(true)}
          onLogout={handleLogout}
          onRefreshData={fetchAllData}
          onSelectCompany={handleSelectCompany}
          onMenuToggle={() => setMobileSidebarOpen((prev) => !prev)}
        />

        {/* Global OTP Required Alert Banner */}
        {waitingOtpJobs.length > 0 && (
          <div className="bg-amber-500 text-slate-950 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-bold text-xs shadow-lg animate-pulse shrink-0">
            <div className="flex items-center space-x-2 space-x-reverse min-w-0">
              <KeyRound className="w-5 h-5 shrink-0" />
              <span className="leading-snug">
                🔔 توجه: نوبت ثبت‌نام در پلتفرم «{waitingOtpJobs[0].platformName}» منتظر ورود کد تایید پیامک (OTP) شماست!
              </span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse shrink-0">
              <button
                onClick={() => setActiveTab('mobile_companion')}
                className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900 transition-colors text-xs font-bold"
                title="مشاهده پل ارتباطی همراه اندروید و رله خودکار"
              >
                📱 پل همراه اندروید (IP ایران)
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-950 text-amber-400 font-bold hover:bg-slate-900 transition-colors text-xs"
              >
                ورود و ثبت کد OTP
              </button>
            </div>
          </div>
        )}

        {/* Smart Stalled / CTR Health Bar Notification */}
        {jobs.some((j) => j.status === 'failed' || j.status === 'paused_user_action') && activeTab !== 'health_monitor' && activeTab !== 'jobs' && (
          <div className="bg-red-950/80 border-b border-red-500/40 text-red-200 px-4 sm:px-6 py-2 flex items-center justify-between gap-2 text-xs font-medium shrink-0 backdrop-blur-sm">
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
              <span>⚠️ سیستم پایش: توقف یا چالش امنیتی در فرآیند ارسال چند نوبت کاری شناسایی شد.</span>
            </div>
            <button
              onClick={() => setActiveTab('health_monitor')}
              className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-[11px] transition-all shrink-0"
            >
              مشاهده در مرکز پایش سلامت ←
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar Navigation */}
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            activeJobsCount={activeJobsCount}
            unreadSmsCount={smsLogs.length}
            isOpenMobile={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            onOpenStepByStepGuide={() => setShowStepByStepGuideModal(true)}
          />

          {/* Dynamic Main View & Footer in Vertical Column */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
              <ErrorBoundary fallbackTitle="خطا در رندر این بخش" onReset={fetchAllData}>
                {activeTab === 'company' && (
                  <CompanyProfileView
                    company={company}
                    companies={companies}
                    onSave={handleSaveCompanyProfile}
                    onSelectCompany={handleSelectCompany}
                    onCreateCompany={handleCreateCompany}
                    onDeleteCompany={handleDeleteCompany}
                  />
                )}

                {activeTab === 'assets_config' && (
                  <CompanyAssetsAndConfigModule
                    companies={companies}
                    activeCompany={company}
                    platforms={platforms}
                    onSelectCompany={handleSelectCompany}
                    onRefreshData={fetchAllData}
                  />
                )}

                {activeTab === 'platforms' && (
                  <MediaDiscoveryModule
                    platforms={platforms}
                    onRefreshPlatforms={fetchAllData}
                    onSelectPlatformForCampaign={() => {
                      setActiveTab('campaigns');
                    }}
                  />
                )}

                {activeTab === 'campaigns' && (
                  <CampaignManagerModule
                    campaigns={campaigns}
                    platforms={platforms}
                    companies={companies}
                    activeCompanyId={company?.id}
                    onCreateCampaign={handleCreateCampaign}
                    onDeleteCampaign={handleDeleteCampaign}
                    onTriggerJob={handleTriggerJob}
                  />
                )}

                {activeTab === 'jobs' && (
                  <JobQueueMonitorModule jobs={jobs} onRefreshJobs={fetchAllData} />
                )}

                {activeTab === 'health_monitor' && (
                  <CampaignHealthMonitorModule
                    campaigns={campaigns}
                    companies={companies}
                    platforms={platforms}
                    jobs={jobs}
                    onTriggerJob={handleTriggerJob}
                    onNavigateToCampaigns={() => setActiveTab('campaigns')}
                    onRefreshData={fetchAllData}
                  />
                )}

                {activeTab === 'analytics' && (
                  <AnalyticsDashboardModule
                    companies={companies}
                    campaigns={campaigns}
                    platforms={platforms}
                    jobs={jobs}
                    onRefreshData={fetchAllData}
                  />
                )}

                {activeTab === 'mobile_companion' && (
                  <MobileCompanionModule />
                )}
              </ErrorBoundary>
            </main>

            {/* Bottom Persistent Version & System Health Footer */}
            <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/90 px-6 py-4 rounded-2xl mx-4 sm:mx-6 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="flex items-center space-x-1.5 space-x-reverse font-bold text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>سامانه اتوماسیون انتشار اشک ۲۴</span>
                </div>
                <span className="text-slate-600">|</span>
                <div className="flex items-center space-x-1.5 space-x-reverse font-mono bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-bold">
                  <span>نسخه {APP_VERSION}</span>
                  <span className="text-[10px] text-amber-500/70">({APP_VERSION_TAG}-Release)</span>
                </div>
                <span className="hidden md:inline text-slate-600">|</span>
                <div className="flex items-center space-x-1.5 space-x-reverse font-mono bg-slate-800/50 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700/60 text-[11px]">
                  <span className="text-slate-500">بیلد:</span>
                  <span className="font-bold text-emerald-400">{BUILD_HASH}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400">{BUILD_TIMESTAMP}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 space-x-reverse">
                <button
                  onClick={async () => {
                    await clientStorage.clearAllOldStorageCache();
                    fetchAllData();
                    alert(`کش نسخه‌های قبلی پاکسازی شد و نسخه ${APP_VERSION} با موفقیت همگام گردید.`);
                  }}
                  className="flex items-center space-x-1 space-x-reverse px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors text-[11px]"
                  title="پاکسازی داده‌های قدیمی جهت جلوگیری از تداخل"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>پاکسازی کش و رفع تداخل</span>
                </button>
                <div className="text-[11px] text-slate-500">
                  وضعیت سیستم: <span className="text-emerald-400 font-semibold">پایدار و فعال</span>
                </div>
              </div>
            </footer>
          </div>
        </div>

        {/* Modal for editing company profile */}
        {showCompanyModal && (
          <CompanyProfileModal
            company={company}
            companies={companies}
            onClose={() => setShowCompanyModal(false)}
            onSave={handleSaveCompanyProfile}
            onSelectCompany={handleSelectCompany}
            onCreateCompany={handleCreateCompany}
            onDeleteCompany={handleDeleteCompany}
          />
        )}

        {/* Modal for User Access Control & Security */}
        {showSecurityModal && currentUser && (
          <UserSecurityModal
            currentUser={currentUser}
            onClose={() => setShowSecurityModal(false)}
            onLogout={handleLogout}
          />
        )}

        {/* Modal for Host Media & File Vault */}
        <ImageUploadVaultModal
          isOpen={showMediaVaultModal}
          onClose={() => setShowMediaVaultModal(false)}
        />

        {/* Modal for cPanel Deployment Guide & Fix */}
        <CpanelGuideModal
          isOpen={showCpanelModal}
          onClose={() => setShowCpanelModal(false)}
        />

        {/* Modal for 5-Step Execution & Publishing Guide */}
        <StepByStepGuideModal
          isOpen={showStepByStepGuideModal}
          onClose={() => setShowStepByStepGuideModal(false)}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
            setShowStepByStepGuideModal(false);
          }}
        />
      </div>
    </LoginGate>
  );
}
