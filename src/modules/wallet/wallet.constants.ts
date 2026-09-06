// Credit cost charged per AI action. Change pricing here only,
// never inline in a controller.
export const CREDIT_COSTS = {
  ATS_SCAN: 5,
  JOB_MATCHER: 5,
  ATS_OPTIMIZE: 3,
  RESUME_IMPROVE: 2,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;
