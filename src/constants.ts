/** Deficiency added per missing repeat when the dish was ordered and not done. */
export const DEFICIENCY_X = 1.0;
/** Fraction of X added per missing repeat when the dish was never ordered. */
export const DEFICIENCY_C = 0.5;
/** Multiplier applied to a dish's score at the end of any period with at least one completion. */
export const DEFICIENCY_DECAY = 0.8;

/** Local time of the daily "order today" notification. */
export const NOTIFICATION_HOUR = 7;
export const NOTIFICATION_MINUTE = 0;
export const NOTIFICATION_CHANNEL = "daily";
