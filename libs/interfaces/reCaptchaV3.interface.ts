export interface RecaptchaV3Props {
  siteKey: string;
  action: string;
  hl?: string;
  onVerify?: (token: string) => void;
  onError?: (error: unknown) => void;
}

export interface RecaptchaV3Ref {
  execute: () => Promise<string | null>;
}
