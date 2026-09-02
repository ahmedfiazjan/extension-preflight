export type AnalyticsEvent =
  | { name: 'scan_started' }
  | { name: 'scan_completed'; high: number; review: number; erroredRules: number }
  | { name: 'scan_failed'; reason: string }
  | { name: 'rule_errored'; ruleId: string }
  | { name: 'justifications_copied' }
  | { name: 'report_downloaded' }

export const track = (event: AnalyticsEvent): void => {
  if (import.meta.env.DEV) console.info('[analytics]', event)
}
