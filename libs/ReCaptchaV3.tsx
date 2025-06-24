import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  RecaptchaV3Props,
  RecaptchaV3Ref,
} from "./interfaces/reCaptchaV3.interface";

const RecaptchaV3 = forwardRef<RecaptchaV3Ref, RecaptchaV3Props>(
  (
    {
      siteKey,
      action,
      hl,
      onVerify,
      onError,
      trustedTypes = false,
      timeout = 5000,
      autoExecute = false,
    },
    ref
  ) => {
    const [isReady, setIsReady] = useState(false);

    useImperativeHandle(ref, () => ({
      execute: async () => {
        try {
          if (typeof window !== "undefined" && window.grecaptcha && isReady) {
            const token = await window.grecaptcha.execute(siteKey, { action });
            onVerify?.(token);
            return token;
          }
          throw new Error("reCAPTCHA not ready");
        } catch (err) {
          onError?.(err);
          return null;
        }
      },
      isReady: () => isReady,
      reset: () => {
        if (typeof window !== "undefined" && window.grecaptcha?.reset) {
          window.grecaptcha.reset();
        }
      },
    }));

    useEffect(() => {
      const scriptId = "recaptcha-v3-script";
      const trustedTypesParam = trustedTypes ? "&trustedtypes=true" : "";
      const src = `https://www.google.com/recaptcha/api.js?render=${siteKey}${
        hl ? `&hl=${hl}` : ""
      }${trustedTypesParam}`;

      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = src;
        script.async = true;
        script.defer = true;

        const timeoutId = setTimeout(() => {
          onError?.(new Error(`Script loading timeout after ${timeout}ms`));
        }, timeout);

        script.onload = () => {
          clearTimeout(timeoutId);
          if (typeof window !== "undefined" && window.grecaptcha) {
            window.grecaptcha.ready(() => {
              setIsReady(true);
              // Auto-ejecutar si está habilitado
              if (autoExecute && onVerify && window.grecaptcha) {
                window.grecaptcha.execute(siteKey, { action }).then(onVerify);
              }
            });
          }
        };

        script.onerror = () => {
          clearTimeout(timeoutId);
          onError?.(new Error("Failed to load reCAPTCHA script"));
        };

        document.head.appendChild(script);
      } else {
        // Si ya está cargado, verificar si está listo
        if (typeof window !== "undefined" && window.grecaptcha) {
          window.grecaptcha.ready(() => {
            setIsReady(true);
            if (autoExecute && onVerify && window.grecaptcha) {
              window.grecaptcha.execute(siteKey, { action }).then(onVerify);
            }
          });
        } else {
          // Polling para verificar disponibilidad
          const checkReady = setInterval(() => {
            if (typeof window !== "undefined" && window.grecaptcha) {
              window.grecaptcha.ready(() => {
                setIsReady(true);
                if (autoExecute && onVerify && window.grecaptcha) {
                  window.grecaptcha.execute(siteKey, { action }).then(onVerify);
                }
              });
              clearInterval(checkReady);
            }
          }, 100);

          // Cleanup después del timeout
          setTimeout(() => clearInterval(checkReady), timeout);
        }
      }
    }, [
      siteKey,
      hl,
      onError,
      trustedTypes,
      timeout,
      autoExecute,
      action,
      onVerify,
    ]);

    return null;
  }
);

RecaptchaV3.displayName = "RecaptchaV3";

export default RecaptchaV3;
