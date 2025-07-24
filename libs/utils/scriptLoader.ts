import { POLLING_INTERVAL } from "../constants/POLLING_INTERVAL";
import { SCRIPT_ID } from "../constants/SCRIPT_ID";

export interface ScriptConfig {
  siteKey: string;
  hl?: string;
  trustedTypes?: boolean;
}

export interface ScriptLoadResult {
  success: boolean;
  error?: Error;
}

export interface ScriptLoaderOptions {
  timeout?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export class ScriptLoader {
  private static buildScriptUrl(config: ScriptConfig): string {
    const trustedTypesParam = config.trustedTypes ? "&trustedtypes=true" : "";
    return `https://www.google.com/recaptcha/api.js?render=${config.siteKey}${
      config.hl ? `&hl=${config.hl}` : ""
    }${trustedTypesParam}`;
  }

  static isScriptLoaded(): boolean {
    return !!document.getElementById(SCRIPT_ID);
  }

  static async loadScript(
    config: ScriptConfig,
    options: ScriptLoaderOptions = {}
  ): Promise<ScriptLoadResult> {
    const { timeout = 5000, onLoad, onError } = options;

    return new Promise((resolve) => {
      if (this.isScriptLoaded()) {
        resolve({ success: true });
        return;
      }

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = this.buildScriptUrl(config);
      script.async = true;
      script.defer = true;

      const timeoutId = setTimeout(() => {
        const error = new Error(`Script loading timeout after ${timeout}ms`);
        onError?.(error);
        resolve({ success: false, error });
      }, timeout);

      script.onload = () => {
        clearTimeout(timeoutId);
        onLoad?.();
        resolve({ success: true });
      };

      script.onerror = () => {
        clearTimeout(timeoutId);
        const error = new Error("Failed to load reCAPTCHA script");
        onError?.(error);
        resolve({ success: false, error });
      };

      document.head.appendChild(script);
    });
  }

  static waitForGrecaptcha(timeout: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.grecaptcha) {
        resolve(true);
        return;
      }

      const startTime = Date.now();
      const checkReady = setInterval(() => {
        if (typeof window !== "undefined" && window.grecaptcha) {
          clearInterval(checkReady);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkReady);
          resolve(false);
        }
      }, POLLING_INTERVAL);
    });
  }
}

// Función utilitaria para uso directo
export const loadRecaptchaScript = (
  config: ScriptConfig,
  options?: ScriptLoaderOptions
): Promise<ScriptLoadResult> => {
  return ScriptLoader.loadScript(config, options);
};

// Función utilitaria para esperar grecaptcha
export const waitForRecaptcha = (timeout?: number): Promise<boolean> => {
  return ScriptLoader.waitForGrecaptcha(timeout);
};
