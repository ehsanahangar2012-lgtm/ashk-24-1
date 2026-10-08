/**
 * سرویس ماشین حالت نوبت‌های انتشار آگهی (Job State Machine Service)
 * وضعیت‌ها: QUEUED, RUNNING, WAITING_FOR_OTP, WAITING_FOR_HUMAN, SUBMITTING, VERIFYING, SUCCEEDED, FAILED, CANCELLED
 */

import { PublicationJob, JobStatus } from '../../types/ashk24.js';
import { callApi } from '../api/apiClient.js';
import { storageVault } from '../storage/storageVault.js';
import { getJalaliCurrentTime } from '../../utils/persianUtils.js';

const JOBS_KEY = 'ashk24_jobs';

export class JobService {
  public static async getJobs(): Promise<PublicationJob[]> {
    const serverJobs = await callApi<PublicationJob[]>('jobs');
    if (serverJobs && Array.isArray(serverJobs)) {
      try {
        storageVault.setItem(JOBS_KEY, JSON.stringify(serverJobs));
      } catch (e) {}
      return serverJobs;
    }

    const saved = storageVault.getItem(JOBS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  }

  public static async getJobById(jobId: string): Promise<PublicationJob | null> {
    const jobs = await this.getJobs();
    return jobs.find((j) => j.id === jobId) || null;
  }

  public static async createJob(jobData: Partial<PublicationJob>): Promise<PublicationJob> {
    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newJob: PublicationJob = {
      id: jobData.id || `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      campaignId: jobData.campaignId || '',
      platformId: jobData.platformId || '',
      platformName: jobData.platformName || 'پلتفرم هدف',
      status: jobData.status || 'pending',
      currentStep: jobData.currentStep || 'در صف انتشار...',
      progressPercent: jobData.progressPercent || 0,
      otpRequired: jobData.otpRequired ?? false,
      usedEngine: 'cpanel-native',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logs: jobData.logs || [
        {
          timestamp: getJalaliCurrentTime(),
          step: 'JobCreated',
          status: 'info',
          message: 'نوبت کاری با کلید یکتا ایجاد و ثبت گردید.',
        },
      ],
      ...jobData,
    };

    await callApi('jobs', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': idempotencyKey },
      body: JSON.stringify(newJob),
    });

    const current = await this.getJobs();
    const updated = [newJob, ...current.filter((j) => j.id !== newJob.id)];
    storageVault.setItem(JOBS_KEY, JSON.stringify(updated));
    return newJob;
  }

  public static async updateJob(
    jobId: string,
    updates: Partial<PublicationJob>
  ): Promise<PublicationJob | null> {
    const current = await this.getJobs();
    const index = current.findIndex((j) => j.id === jobId);
    if (index === -1) return null;

    const updatedJob: PublicationJob = {
      ...current[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    current[index] = updatedJob;

    await callApi(`jobs/${encodeURIComponent(jobId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    storageVault.setItem(JOBS_KEY, JSON.stringify(current));
    return updatedJob;
  }

  public static async setJobStatus(
    jobId: string,
    targetStatus: JobStatus,
    reasonMessage?: string
  ): Promise<PublicationJob | null> {
    const reason =
      reasonMessage ||
      (targetStatus === 'cancelled'
        ? 'نوبت به دستور کاربر لغو گردید.'
        : targetStatus === 'paused' || targetStatus === 'paused_user_action'
        ? 'نوبت کاری متوقف شد.'
        : `وضعیت به ${targetStatus} تغییر یافت.`);

    const current = await this.getJobs();
    const job = current.find((j) => j.id === jobId);
    if (!job) return null;

    const existingLogs = job.logs || [];
    return this.updateJob(jobId, {
      status: targetStatus,
      currentStep: reason,
      logs: [
        ...existingLogs,
        {
          timestamp: getJalaliCurrentTime(),
          step: 'StatusTransition',
          status:
            targetStatus === 'failed' || targetStatus === 'cancelled'
              ? 'warning'
              : targetStatus === 'published'
              ? 'success'
              : 'info',
          message: reason,
        },
      ],
    });
  }

  public static async deleteJob(jobId: string): Promise<boolean> {
    const current = await this.getJobs();
    const filtered = current.filter((j) => j.id !== jobId);

    await callApi(`jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' });
    storageVault.setItem(JOBS_KEY, JSON.stringify(filtered));
    return true;
  }

  public static async clearCompletedJobs(): Promise<boolean> {
    await callApi('jobs/clear-completed', { method: 'POST' });
    const current = await this.getJobs();
    const remaining = current.filter((j) => j.status !== 'published' && j.status !== 'failed');
    storageVault.setItem(JOBS_KEY, JSON.stringify(remaining));
    return true;
  }

  public static async submitOtp(jobId: string, otpCode: string): Promise<boolean> {
    const res = await callApi<{ success: boolean; data?: any }>('jobs/submit-otp', {
      method: 'POST',
      body: JSON.stringify({ jobId, otpCode }),
    });

    if (res?.data) {
      await this.updateJob(jobId, {
        status: 'otp_received',
        currentStep: 'کد OTP دریافت شد؛ آماده ارسال اطلاعات به پلتفرم',
        progressPercent: 70,
      });
      return true;
    }
    return false;
  }

  public static async verifyPublication(
    jobId: string,
    targetUrl: string,
    expectedTitle?: string,
    expectedPhone?: string
  ): Promise<{
    success: boolean;
    verification?: {
      isAccessible: boolean;
      verified: boolean;
      verificationStatus: 'VERIFIED' | 'UNKNOWN' | 'FAILED';
      evidenceSnippet?: string | null;
      httpStatus: number;
    };
  }> {
    const res = await callApi<any>('jobs/verify-publication', {
      method: 'POST',
      body: JSON.stringify({ jobId, targetUrl, expectedTitle, expectedPhone }),
    });

    if (res?.verification) {
      const v = res.verification;
      const newStatus: JobStatus =
        v.verificationStatus === 'VERIFIED'
          ? 'published'
          : v.verificationStatus === 'UNKNOWN'
          ? 'under_review'
          : 'failed';

      await this.updateJob(jobId, {
        status: newStatus,
        independentVerification: v,
      });

      return { success: true, verification: v };
    }

    return { success: false };
  }
}
