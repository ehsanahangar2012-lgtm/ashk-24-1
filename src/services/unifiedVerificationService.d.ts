export interface VerificationEvidenceInput {
  url: string;
  expectedTitle: string;
  expectedJobId?: string;
  expectedCampaignId?: string;
  expectedPhone?: string;
  timeoutMs?: number;
}

export interface VerificationEvidenceResult {
  verified: boolean;
  httpStatus: number;
  url: string;
  matchedTitle: boolean;
  matchedId: boolean;
  matchedKeywords: string[];
  error?: string;
  verifiedAt: string;
}

export function extractSpecificKeywords(text: string): string[];

export function validatePublicAdUrlFormat(url: string): { valid: boolean; reason?: string };

export function evaluatePageContentEvidence(
  pageContent: string,
  currentUrl: string,
  options?: { expectedTitle?: string; expectedJobId?: string; expectedCampaignId?: string; expectedPhone?: string }
): {
  matched: boolean;
  matchedKeywords: string[];
  matchedJobId: boolean;
  matchedPhone?: boolean;
  reason?: string;
};

export function verifyPublicationEvidence(options: VerificationEvidenceInput): Promise<VerificationEvidenceResult>;
