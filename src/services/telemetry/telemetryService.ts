/**
 * سرویس تله‌متری، دیباگر و سلامت سامانه (Telemetry & Observability Service)
 */

import {
  PublicationTelemetryLog,
  DiagnosticConsoleEntry,
  TestHarnessRun,
  TestMode,
  SmsRelayHealthStatus,
  ResilienceStatus,
} from '../../types/ashk24.js';
import { callApi } from '../api/apiClient.js';
import { storageVault } from '../storage/storageVault.js';
import { getJalaliCurrentTime } from '../../utils/persianUtils.js';

const DIAGNOSTIC_CONSOLE_KEY = 'ashk24_diagnostic_console_logs';
const TELEMETRY_LOGS_KEY = 'ashk24_telemetry_logs';

export class TelemetryService {
  public static async getDiagnosticConsoleEntries(): Promise<DiagnosticConsoleEntry[]> {
    const serverLogs = await callApi<DiagnosticConsoleEntry[]>('diagnostics/console-entries');
    if (serverLogs && Array.isArray(serverLogs)) {
      storageVault.setItem(DIAGNOSTIC_CONSOLE_KEY, JSON.stringify(serverLogs));
      return serverLogs;
    }

    const saved = storageVault.getItem(DIAGNOSTIC_CONSOLE_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  public static async recordDiagnosticEntry(
    entry: Partial<DiagnosticConsoleEntry>
  ): Promise<DiagnosticConsoleEntry> {
    const fullEntry: DiagnosticConsoleEntry = {
      id: entry.id || `diag_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: entry.timestamp || getJalaliCurrentTime(),
      platformId: entry.platformId || 'platform',
      platformName: entry.platformName || 'پلتفرم هدف',
      requestUrl: entry.requestUrl || '',
      httpMethod: entry.httpMethod || 'POST',
      httpStatus: entry.httpStatus ?? 0,
      httpStatusText: entry.httpStatusText || 'HTTP Error',
      targetSelectorPath: entry.targetSelectorPath || 'form, input',
      errorType: entry.errorType || 'CONNECTION_ERROR',
      rawResponseSnippet: entry.rawResponseSnippet || '',
      resolutionHint: entry.resolutionHint || 'بررسی وضعیت شبکه و هاست پیشنهاد می‌شود.',
      ...entry,
    };

    await callApi('diagnostics/console-entries', {
      method: 'POST',
      body: JSON.stringify(fullEntry),
    });

    const current = await this.getDiagnosticConsoleEntries();
    storageVault.setItem(DIAGNOSTIC_CONSOLE_KEY, JSON.stringify([fullEntry, ...current].slice(0, 100)));
    return fullEntry;
  }

  public static async clearDiagnosticEntries(): Promise<boolean> {
    await callApi('diagnostics/clear', { method: 'POST' });
    storageVault.setItem(DIAGNOSTIC_CONSOLE_KEY, JSON.stringify([]));
    return true;
  }

  public static async getSmsRelayHealth(): Promise<SmsRelayHealthStatus | null> {
    return callApi<SmsRelayHealthStatus>('monitoring/sms-relay-health');
  }

  public static async getResilienceStatus(): Promise<ResilienceStatus | null> {
    const res = await callApi<ResilienceStatus>('resilience/status');
    if (res) return res;

    return {
      cpanelApiAvailable: true,
      totalRequestsCount: 1,
      fallbackCount: 0,
      activeEngine: 'cpanel-native-engine',
      isOnlineAvailable: false,
      forcedOfflineMode: false,
      nativeEngineLatencyMs: 3,
      lastHealthCheck: new Date().toISOString(),
    };
  }

  public static async runTestHarness(
    mode: TestMode = 'SAFE_TEST',
    targetPlatform: string = 'plat_internal_blog'
  ): Promise<TestHarnessRun | null> {
    return callApi<TestHarnessRun>('test-harness/run-all', {
      method: 'POST',
      body: JSON.stringify({ mode, targetPlatform }),
    });
  }
}
