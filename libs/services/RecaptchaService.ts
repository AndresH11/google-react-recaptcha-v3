import { TRANSACTIONAL_ACTIONS } from "../enums/TRANSACTIONAL_ACTIONS";

export interface RecaptchaConfig {
  siteKey: string;
  action: string;
  hl?: string;
  trustedTypes?: boolean;
}

export interface RecaptchaExecutionResult {
  success: boolean;
  token?: string;
  error?: Error;
}

export interface RecaptchaServiceInterface {
  execute(config: RecaptchaConfig): Promise<RecaptchaExecutionResult>;
  isReady(): boolean;
  reset(): void;
  validateAction(action: string): { isValid: boolean; warning?: string };
}

class RecaptchaService implements RecaptchaServiceInterface {
  private grecaptcha: any = null;

  constructor(grecaptchaInstance?: any) {
    this.grecaptcha =
      grecaptchaInstance ||
      (typeof window !== "undefined" ? window.grecaptcha : null);
  }

  async execute(config: RecaptchaConfig): Promise<RecaptchaExecutionResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: new Error("reCAPTCHA not ready"),
      };
    }

    try {
      const token = await this.grecaptcha.execute(config.siteKey, {
        action: config.action,
      });

      return {
        success: true,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error("Unknown reCAPTCHA error"),
      };
    }
  }

  isReady(): boolean {
    return !!(this.grecaptcha && typeof this.grecaptcha.execute === "function");
  }

  reset(): void {
    if (this.grecaptcha?.reset) {
      this.grecaptcha.reset();
    }
  }

  validateAction(action: string): { isValid: boolean; warning?: string } {
    const isTransactional = Object.values(TRANSACTIONAL_ACTIONS).includes(
      action as TRANSACTIONAL_ACTIONS
    ) as boolean;

    if (isTransactional) {
      return {
        isValid: true,
        warning: `autoExecute no recomendado para acción transaccional: "${action}". Los tokens expiran en 2 minutos.`,
      };
    }

    return { isValid: true };
  }

  // Método para inyectar grecaptcha (útil para testing)
  setGrecaptcha(grecaptchaInstance: any): void {
    this.grecaptcha = grecaptchaInstance;
  }
}

// Singleton para uso global
export const recaptchaService = new RecaptchaService();

// Factory para crear instancias (útil para testing)
export const createRecaptchaService = (
  grecaptchaInstance?: any
): RecaptchaService => {
  return new RecaptchaService(grecaptchaInstance);
};
