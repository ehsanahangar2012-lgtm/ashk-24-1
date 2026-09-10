/**
 * Ashk24 Browser Session Persistence & Resume Manager (SessionManager)
 * v4.0.10
 * 
 * Provides atomic, reliable persistence and restoration of Playwright browser sessions:
 * - Cookies
 * - LocalStorage (Origins)
 * - Session state & metadata (job_id, currentUrl, currentStep, timestamp)
 * - Strict validation against corruption / missing sessions
 * - Seamless resume into existing contexts without creating new jobs or resetting state
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define session directory inside local-agent storage
const SESSIONS_DIR = path.resolve(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

/**
 * Returns absolute path to session JSON file for a given jobId
 * @param {string} jobId
 * @returns {string}
 */
export function getSessionFilePath(jobId) {
  if (!jobId || typeof jobId !== 'string') {
    throw new Error('Invalid jobId: must be a non-empty string');
  }
  const sanitizedId = jobId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(SESSIONS_DIR, `session_${sanitizedId}.json`);
}

/**
 * Extracts storageState from Playwright BrowserContext, Page, or pre-extracted object
 * @param {any} context
 * @returns {Promise<object>}
 */
async function extractStorageState(context) {
  if (!context) {
    throw new Error('Cannot extract storage state from null or undefined context');
  }

  // If already a valid storageState object
  if (typeof context === 'object' && (Array.isArray(context.cookies) || Array.isArray(context.origins))) {
    return context;
  }

  // If it's a Playwright Page, get its context
  if (typeof context.context === 'function') {
    const ctx = context.context();
    return await ctx.storageState();
  }

  // If it's a Playwright BrowserContext
  if (typeof context.storageState === 'function') {
    return await context.storageState();
  }

  throw new Error('Invalid context passed: must be a Playwright BrowserContext, Page, or storageState object');
}

/**
 * Saves the current browser context state and metadata for a specific job
 * @param {string} jobId - Unique identifier for the job
 * @param {any} context - Playwright BrowserContext, Page, or storageState object
 * @param {object} [metadata={}] - Workflow metadata (currentUrl, currentStep, platformId, etc.)
 * @returns {Promise<object>} Saved session payload
 */
export async function saveSession(jobId, context, metadata = {}) {
  if (!jobId) {
    throw new Error('jobId is required to save a session');
  }

  const storageState = await extractStorageState(context);
  const now = new Date().toISOString();

  const sessionPayload = {
    jobId,
    savedAt: now,
    timestamp: metadata.timestamp || now,
    currentUrl: metadata.currentUrl || null,
    currentStep: metadata.currentStep || null,
    platformId: metadata.platformId || null,
    challengeType: metadata.challengeType || null,
    workflowStepIndex: metadata.workflowStepIndex !== undefined ? metadata.workflowStepIndex : null,
    storageState: {
      cookies: storageState.cookies || [],
      origins: storageState.origins || []
    },
    metadata: {
      ...metadata,
      savedAt: now,
      cookieCount: (storageState.cookies || []).length,
      originCount: (storageState.origins || []).length,
      resume_supported: true
    }
  };

  const filePath = getSessionFilePath(jobId);
  const tempPath = `${filePath}.tmp_${Date.now()}`;

  // Atomic write to avoid file corruption on interruption
  fs.writeFileSync(tempPath, JSON.stringify(sessionPayload, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);

  console.log(`💾 [SessionManager] Saved session for job ${jobId} -> ${filePath} (${sessionPayload.storageState.cookies.length} cookies, ${sessionPayload.storageState.origins.length} origins)`);

  return sessionPayload;
}

/**
 * Restores a saved browser session for a specific job
 * @param {string} jobId - Unique identifier for the job
 * @returns {Promise<object|null>} The restored session payload or null if not found
 */
export async function restoreSession(jobId) {
  if (!jobId) {
    throw new Error('jobId is required to restore a session');
  }

  const validation = await validateSession(jobId);
  if (!validation.valid) {
    console.warn(`⚠️ [SessionManager] Cannot restore session for job ${jobId}: ${validation.reason}`);
    return null;
  }

  const sessionData = validation.sessionData;
  const restoredAt = new Date().toISOString();

  console.log(`🔑 [SessionManager] Successfully restored session for job ${jobId} (savedAt: ${sessionData.savedAt})`);

  return {
    ...sessionData,
    restoredAt,
    resume_supported: true,
    session_restored: true
  };
}

/**
 * Deletes a saved session from disk
 * @param {string} jobId - Unique identifier for the job
 * @returns {Promise<boolean>} True if deleted, false if file did not exist
 */
export async function deleteSession(jobId) {
  if (!jobId) {
    throw new Error('jobId is required to delete a session');
  }

  const filePath = getSessionFilePath(jobId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`🗑️ [SessionManager] Deleted session file for job ${jobId}`);
    return true;
  }
  return false;
}

/**
 * Validates whether a saved session exists and is uncorrupted
 * @param {string} jobId - Unique identifier for the job
 * @returns {Promise<{ valid: boolean, reason?: string, sessionData?: object }>}
 */
export async function validateSession(jobId) {
  if (!jobId) {
    return { valid: false, reason: 'MISSING_JOB_ID' };
  }

  const filePath = getSessionFilePath(jobId);
  if (!fs.existsSync(filePath)) {
    return { valid: false, reason: 'SESSION_NOT_FOUND', filePath };
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw || raw.trim().length === 0) {
      return { valid: false, reason: 'EMPTY_SESSION_FILE', filePath };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, reason: 'INVALID_SESSION_FORMAT' };
    }

    if (!parsed.storageState || typeof parsed.storageState !== 'object') {
      return { valid: false, reason: 'MISSING_STORAGE_STATE' };
    }

    const hasCookies = Array.isArray(parsed.storageState.cookies);
    const hasOrigins = Array.isArray(parsed.storageState.origins);

    if (!hasCookies && !hasOrigins) {
      return { valid: false, reason: 'CORRUPTED_STORAGE_STATE_STRUCTURE' };
    }

    return {
      valid: true,
      sessionData: parsed,
      filePath
    };
  } catch (err) {
    return {
      valid: false,
      reason: `PARSE_ERROR: ${err.message}`,
      filePath
    };
  }
}

/**
 * Lists all active saved sessions in the local store
 * @returns {Array<object>}
 */
export function listSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) return [];
  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.startsWith('session_') && f.endsWith('.json'));
  const sessions = [];

  for (const f of files) {
    try {
      const fullPath = path.join(SESSIONS_DIR, f);
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      sessions.push({
        jobId: data.jobId,
        savedAt: data.savedAt,
        currentUrl: data.currentUrl,
        currentStep: data.currentStep,
        platformId: data.platformId,
        cookieCount: data.storageState?.cookies?.length || 0,
        originCount: data.storageState?.origins?.length || 0,
        filePath: fullPath
      });
    } catch (_) {}
  }

  return sessions;
}

export default {
  saveSession,
  restoreSession,
  deleteSession,
  validateSession,
  listSessions,
  getSessionFilePath
};
