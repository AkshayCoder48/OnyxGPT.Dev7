/**
 * Playwright Diagnostic Service
 * Handles browser-based debugging logic and state.
 */

class PlaywrightService {
  constructor() {
    this.state = {
      currentUrl: '',
      isNavigating: false,
      networkLogs: [],
      consoleLogs: [],
      runtimeErrors: [],
      cookies: [],
      security: {
        csp: 'Not checked',
        https: false,
        sensitiveHeaders: []
      },
      diagnosticReport: null
    };
    this.listeners = [];
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notify() {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  async navigate_page(url) {
    this.state.isNavigating = true;
    this.state.currentUrl = url;
    this.notify();

    // In a real environment, this would call the Playwright backend.
    // Here we simulate the diagnostic delay.
    await new Promise(r => setTimeout(r, 2000));

    this.state.isNavigating = false;
    this.state.networkLogs.push({
      method: 'GET',
      url: url,
      status: 200,
      duration: '142ms',
      timestamp: new Date().toISOString()
    });

    // Auto-detect common issues for simulation
    if (url.includes('localhost')) {
       this.state.security.https = false;
    }

    this.notify();
    return { success: true, url: url };
  }

  get_network_log() {
    return this.state.networkLogs;
  }

  get_failed_requests() {
    return this.state.networkLogs.filter(n => n.status >= 400);
  }

  get_console_logs() {
    return this.state.consoleLogs;
  }

  get_runtime_exceptions() {
    return this.state.runtimeErrors;
  }

  extract_all_cookies() {
    return this.state.cookies;
  }

  generate_bug_report() {
    const report = {
      summary: "Diagnostic Report",
      issues: [],
      suggestions: []
    };

    if (!this.state.security.https) {
      report.issues.push({ severity: 'Medium', message: 'Insecure connection (HTTP)' });
      report.suggestions.push('Enable HTTPS for production deployments.');
    }

    const failed = this.get_failed_requests();
    if (failed.length > 0) {
      report.issues.push({ severity: 'High', message: `${failed.length} network requests failed.` });
      report.suggestions.push('Check API endpoints and CORS configuration.');
    }

    this.state.diagnosticReport = report;
    this.notify();
    return report;
  }

  reset() {
    this.state = {
      currentUrl: '',
      isNavigating: false,
      networkLogs: [],
      consoleLogs: [],
      runtimeErrors: [],
      cookies: [],
      security: {
        csp: 'Not checked',
        https: false,
        sensitiveHeaders: []
      },
      diagnosticReport: null
    };
    this.notify();
  }
}

export const playwright = new PlaywrightService();
export default playwright;
