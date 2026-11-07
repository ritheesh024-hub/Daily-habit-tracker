import { RunSession, IRunStorageService } from '../types';

const STORAGE_KEY_PREFIX = 'daily_habits_daily_run';

function getActiveRunKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}_active_${userId || 'guest'}`;
}

function getRunHistoryKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}_history_${userId || 'guest'}`;
}

export const runStorageService: IRunStorageService = {
  getActiveRunSession(userId: string): RunSession | null {
    try {
      const data = localStorage.getItem(getActiveRunKey(userId));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveActiveRunSession(session: RunSession): void {
    try {
      localStorage.setItem(getActiveRunKey(session.userId), JSON.stringify(session));
    } catch (e) {
      console.warn('Failed to save active run session to localStorage:', e);
    }
  },

  clearActiveRunSession(userId: string): void {
    try {
      localStorage.removeItem(getActiveRunKey(userId));
    } catch {
      // ignore
    }
  },

  getRunHistory(userId: string): RunSession[] {
    try {
      const data = localStorage.getItem(getRunHistoryKey(userId));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveCompletedRun(session: RunSession): Promise<void> {
    try {
      const history = this.getRunHistory(session.userId);
      const filtered = history.filter((r) => r.id !== session.id);
      const updated = [session, ...filtered];
      localStorage.setItem(getRunHistoryKey(session.userId), JSON.stringify(updated));
      this.clearActiveRunSession(session.userId);
    } catch (e) {
      console.warn('Failed to save completed run to localStorage:', e);
    }
  },

  async deleteRun(userId: string, runId: string): Promise<void> {
    try {
      const history = this.getRunHistory(userId);
      const updated = history.filter((r) => r.id !== runId);
      localStorage.setItem(getRunHistoryKey(userId), JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to delete run from localStorage:', e);
    }
  },
};
