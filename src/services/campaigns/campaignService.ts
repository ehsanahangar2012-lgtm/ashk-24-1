/**
 * سرویس مدیریت کمپین‌های تبلیغاتی و چرخه تمدید خودکار ۳۰ روزه (Campaign Service)
 */

import { Campaign } from '../../types/ashk24.js';
import { callApi } from '../api/apiClient.js';
import { storageVault } from '../storage/storageVault.js';
import { getJalaliCurrentDate } from '../../utils/persianUtils.js';

const CAMPAIGNS_KEY = 'ashk24_campaigns';

export class CampaignService {
  public static async getCampaigns(): Promise<Campaign[]> {
    const serverCampaigns = await callApi<Campaign[]>('campaigns');
    if (serverCampaigns && Array.isArray(serverCampaigns)) {
      try {
        storageVault.setItem(CAMPAIGNS_KEY, JSON.stringify(serverCampaigns));
      } catch (e) {}
      return serverCampaigns;
    }

    const saved = storageVault.getItem(CAMPAIGNS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  }

  public static async getCampaignById(id: string): Promise<Campaign | null> {
    const campaigns = await this.getCampaigns();
    return campaigns.find((c) => c.id === id) || null;
  }

  public static async createCampaign(
    campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Campaign> {
    const newCampaign: Campaign = {
      ...campaign,
      id: `cmp_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const serverRes = await callApi<{ data: Campaign }>('campaigns', {
      method: 'POST',
      body: JSON.stringify(newCampaign),
    });

    const finalCamp = serverRes?.data || newCampaign;
    const current = await this.getCampaigns();
    storageVault.setItem(CAMPAIGNS_KEY, JSON.stringify([finalCamp, ...current]));
    return finalCamp;
  }

  public static async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | null> {
    const current = await this.getCampaigns();
    const index = current.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const updated: Campaign = {
      ...current[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    current[index] = updated;

    await callApi(`campaigns/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    storageVault.setItem(CAMPAIGNS_KEY, JSON.stringify(current));
    return updated;
  }

  public static async deleteCampaign(id: string): Promise<boolean> {
    const current = await this.getCampaigns();
    const filtered = current.filter((c) => c.id !== id);

    await callApi(`campaigns/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    storageVault.setItem(CAMPAIGNS_KEY, JSON.stringify(filtered));
    return true;
  }

  public static async renewCampaignNow(
    campaignId: string
  ): Promise<{ success: boolean; message: string; campaign?: Campaign }> {
    const res = await callApi<{ message: string; campaign: Campaign }>(
      `campaigns/${encodeURIComponent(campaignId)}/renew-now`,
      { method: 'POST' }
    );

    if (res?.campaign) {
      const current = await this.getCampaigns();
      const updated = current.map((c) => (c.id === campaignId ? res.campaign : c));
      storageVault.setItem(CAMPAIGNS_KEY, JSON.stringify(updated));
      return {
        success: true,
        message: res.message || 'تمدید فوری آگهی با موفقیت ثبت شد.',
        campaign: res.campaign,
      };
    }

    const camp = await this.getCampaignById(campaignId);
    if (camp) {
      const updated: Campaign = {
        ...camp,
        lastRenewalDate: getJalaliCurrentDate(),
        renewalCount: (camp.renewalCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      await this.updateCampaign(campaignId, updated);
      return {
        success: true,
        message: `تمدید ۳۰ روزه آگهی «${camp.title}» با موفقیت انجام گردید.`,
        campaign: updated,
      };
    }

    return { success: false, message: 'کمپین یافت نشد.' };
  }
}
