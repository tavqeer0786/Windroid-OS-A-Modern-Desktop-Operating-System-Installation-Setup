// Diagnostics & Safe Mode Utility for Windroid OS

function checkQueryParam(param: string): boolean {
  if (typeof window === 'undefined') return false;
  const search = new URLSearchParams(window.location.search);
  return search.has(param) && search.get(param) !== '0';
}

function getQueryValue(param: string): string | null {
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  return search.get(param);
}

const isSafeModeActive = checkQueryParam('safeMode');

export const SAFE_MODE_FLAGS = {
  active: isSafeModeActive,
  disableDemoMedia: isSafeModeActive && getQueryValue('safeDemoMedia') !== '0',
  disableDemoPackages: isSafeModeActive && getQueryValue('safeDemoPackages') !== '0',
  disableFsSync: isSafeModeActive && getQueryValue('safeFsSync') !== '0',
  disableDockScroll: isSafeModeActive && getQueryValue('safeDockScroll') !== '0',
  disableRuntime: isSafeModeActive && getQueryValue('safeRuntime') !== '0',
  disableNotifications: isSafeModeActive && getQueryValue('safeNotifications') !== '0',
};

class MetricsTracker {
  public renders: Record<string, number> = {};
  public fsNotifications = 0;
  public localStorageWrites = 0;
  public rAFCalls = 0;
  public timersCreated = 0;
  public eventEmissions: Record<string, number> = {};

  private summaryCount = 0;
  private timerId: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).__WINDROID_METRICS__ = this;
      (window as any).__AETHER_METRICS__ = this;
      this.startSummaryLoop();
    }
  }

  public trackRender(componentName: string): void {
    this.renders[componentName] = (this.renders[componentName] || 0) + 1;
  }

  public trackFsNotification(): void {
    this.fsNotifications++;
  }

  public trackLocalStorageWrite(): void {
    this.localStorageWrites++;
  }

  public trackRAF(): void {
    this.rAFCalls++;
  }

  public trackTimer(): void {
    this.timersCreated++;
  }

  public trackEvent(eventName: string): void {
    this.eventEmissions[eventName] = (this.eventEmissions[eventName] || 0) + 1;
  }

  private startSummaryLoop(): void {
    if (this.timerId) return;
    this.timerId = setInterval(() => {
      this.summaryCount++;
      console.log(`[WINDROID METRICS ${this.summaryCount}/6]`, {
        renders: { ...this.renders },
        fsNotifications: this.fsNotifications,
        localStorageWrites: this.localStorageWrites,
        rAFCalls: this.rAFCalls,
        timersCreated: this.timersCreated,
        eventEmissions: { ...this.eventEmissions },
      });
      if (this.summaryCount >= 6) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    }, 5000);
  }
}

export const metrics = new MetricsTracker();
