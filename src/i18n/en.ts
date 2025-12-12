import { TranslationMap } from './types';

export const en: TranslationMap = {
    // Status Bar
    'status.initializing': '⏳ Initializing...',
    'status.detecting': '🔍 Detecting port...',
    'status.fetching': '$(sync~spin) Fetching quota...',
    'status.retrying': '$(sync~spin) Retrying ({current}/{max})...',
    'status.error': '$(error) Antigravity Quota Watcher: Error',
    'status.refreshing': '$(sync~spin) Refreshing...',

    // Tooltip
    'tooltip.title': '**Antigravity Model Quota**', // Markdown bold
    'tooltip.credits': '💳 **Prompt Credits**',
    'tooltip.available': 'Available',
    'tooltip.remaining': 'Remaining',
    'tooltip.depleted': '⚠️ **Depleted**',
    'tooltip.resetTime': 'Reset',
    'tooltip.model': 'Model',
    'tooltip.status': 'Status',
    'tooltip.error': 'Error fetching quota information.',
    'tooltip.clickToRetry': 'Click to retry',

    // Notifications (vscode.window.show*Message)
    'notify.unableToDetectProcess': 'Antigravity Quota Watcher: Unable to detect the Antigravity process.',
    'notify.retry': 'Retry',
    'notify.cancel': 'Cancel',
    'notify.refreshingQuota': '🔄 Refreshing quota...',
    'notify.detectionSuccess': '✅ Detection successful! Port: {port}',
    'notify.unableToDetectPort': '❌ Unable to detect a valid port. Please ensure:',
    'notify.unableToDetectPortHint1': '1. Your Google account is signed in',
    'notify.unableToDetectPortHint2': '2. The system has permission to run the detection commands',
    'notify.portDetectionFailed': '❌ Port detection failed: {error}',
    'notify.configUpdated': 'Antigravity Quota Watcher config updated',
    'notify.portCommandRequired': 'Port detection requires lsof, ss, or netstat. Please install one of them',
    'notify.portCommandRequiredDarwin': 'Port detection requires lsof or netstat. Please install one of them'
};
