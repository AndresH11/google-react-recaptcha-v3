export interface RecaptchaV3Props {
  siteKey: string;
  action: string;
  hl?: string;
  onVerify?: (token: string) => void;
  onError?: (error: unknown) => void;
  /** Enable loading with Trusted Types support */
  trustedTypes?: boolean;
  /** Custom timeout for script loading (default: 5000ms) */
  timeout?: number;
  /** Execute reCAPTCHA automatically on mount */
  autoExecute?: boolean;
}

export interface RecaptchaV3Ref {
  execute: () => Promise<string | null>;
  /** Get the current readiness state */
  isReady: () => boolean;
  /** Reset the reCAPTCHA instance */
  reset: () => void;
}

export interface RecaptchaV3Response {
  success: boolean;
  score: number;
  action: string;
  challenge_ts: string;
  hostname: string;
  "error-codes"?: string[];
}
