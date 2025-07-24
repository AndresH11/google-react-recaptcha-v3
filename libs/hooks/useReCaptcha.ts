import { useCallback, useEffect, useRef, useState } from "react";
import {
  RecaptchaConfig,
  recaptchaService,
} from "../services/RecaptchaService";
import { loadRecaptchaScript, waitForRecaptcha } from "../utils/scriptLoader";

export interface UseRecaptchaOptions extends RecaptchaConfig {
  timeout?: number;
  autoExecute?: boolean;
  onVerify?: (token: string) => void;
  onError?: (error: Error) => void;
}

export interface UseRecaptchaReturn {
  isReady: boolean;
  execute: () => Promise<string | null>;
  reset: () => void;
  isLoading: boolean;
}

export function useReCaptcha(options: UseRecaptchaOptions): UseRecaptchaReturn {
  const {
    siteKey,
    action,
    hl,
    trustedTypes = false,
    timeout = 5000,
    autoExecute = false,
    onVerify,
    onError,
  } = options;

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasAutoExecutedRef = useRef(false);
  const currentActionRef = useRef(action);
  const currentSiteKeyRef = useRef(siteKey);

  // Referencias estables para callbacks
  const stableOnVerify = useRef(onVerify);
  const stableOnError = useRef(onError);

  // Actualizar referencias sin causar re-renders
  stableOnVerify.current = onVerify;
  stableOnError.current = onError;

  // Reset del estado cuando cambian props críticas
  useEffect(() => {
    if (
      currentSiteKeyRef.current !== siteKey ||
      currentActionRef.current !== action
    ) {
      hasAutoExecutedRef.current = false;
      currentSiteKeyRef.current = siteKey;
      currentActionRef.current = action;
    }
  }, [siteKey, action]);

  // Función para ejecutar reCAPTCHA
  const execute = useCallback(async (): Promise<string | null> => {
    const config: RecaptchaConfig = { siteKey, action, hl, trustedTypes };
    const result = await recaptchaService.execute(config);

    if (result.success && result.token) {
      stableOnVerify.current?.(result.token);
      return result.token;
    } else {
      stableOnError.current?.(result.error || new Error("Unknown error"));
      return null;
    }
  }, [siteKey, action, hl, trustedTypes]);

  // Auto-ejecución controlada
  const handleAutoExecute = useCallback(async () => {
    if (!autoExecute || hasAutoExecutedRef.current || !isReady) {
      return;
    }

    hasAutoExecutedRef.current = true;

    // Validar acción con advertencias
    const validation = recaptchaService.validateAction(action);
    if (validation.warning) {
      console.warn(`⚠️ ${validation.warning}`);
    }

    await execute();
  }, [autoExecute, isReady, action, execute]);

  // Reset function
  const reset = useCallback(() => {
    hasAutoExecutedRef.current = false;
    recaptchaService.reset();
  }, []);

  // Inicialización del script y grecaptcha
  useEffect(() => {
    let isMounted = true;

    const initializeRecaptcha = async () => {
      try {
        setIsLoading(true);

        // Cargar script si es necesario
        const scriptResult = await loadRecaptchaScript(
          { siteKey, hl, trustedTypes },
          {
            timeout,
            onError: (error) => stableOnError.current?.(error),
          }
        );

        if (!scriptResult.success) {
          return;
        }

        // Esperar a que grecaptcha esté disponible
        const grecaptchaReady = await waitForRecaptcha(timeout);

        if (!grecaptchaReady) {
          stableOnError.current?.(new Error("reCAPTCHA failed to initialize"));
          return;
        }

        // Configurar el servicio con la instancia de grecaptcha
        if (typeof window !== "undefined" && window.grecaptcha) {
          recaptchaService.setGrecaptcha(window.grecaptcha);

          window.grecaptcha.ready(() => {
            if (isMounted) {
              setIsReady(true);
              setIsLoading(false);
              // Auto-ejecutar si está habilitado
              handleAutoExecute();
            }
          });
        }
      } catch (error) {
        if (isMounted) {
          const errorInstance =
            error instanceof Error ? error : new Error("Initialization failed");
          stableOnError.current?.(errorInstance);
          setIsLoading(false);
        }
      }
    };

    initializeRecaptcha();

    return () => {
      isMounted = false;
    };
  }, [siteKey, hl, trustedTypes, timeout, handleAutoExecute]);

  return {
    isReady,
    execute,
    reset,
    isLoading,
  };
}
