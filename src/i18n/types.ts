export type TranslationKey =
    // Status Bar
    | 'status.initializing'
    | 'status.detecting'
    | 'status.fetching'
    | 'status.retrying'
    | 'status.error'
    | 'status.refreshing'

    // Tooltip
    | 'tooltip.title'
    | 'tooltip.credits'
    | 'tooltip.available'
    | 'tooltip.remaining'
    | 'tooltip.depleted'
    | 'tooltip.resetTime'
    | 'tooltip.model'
    | 'tooltip.status'
    | 'tooltip.error'
    | 'tooltip.clickToRetry'

    // Notifications (vscode.window.show*Message)
    | 'notify.unableToDetectProcess'
    | 'notify.retry'
    | 'notify.cancel'
    | 'notify.refreshingQuota'
    | 'notify.detectionSuccess'
    | 'notify.unableToDetectPort'
    | 'notify.unableToDetectPortHint1'
    | 'notify.unableToDetectPortHint2'
    | 'notify.portDetectionFailed'
    | 'notify.configUpdated'
    | 'notify.portCommandRequired'
    | 'notify.portCommandRequiredDarwin';

export interface TranslationMap {
    [key: string]: string;
}
