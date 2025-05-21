import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  RecaptchaV3Props,
  RecaptchaV3Ref,
} from "./interfaces/reCaptchaV3.interface";

const RecaptchaV3 = forwardRef<RecaptchaV3Ref, RecaptchaV3Props>(
  ({ siteKey, action, hl, onVerify, onError }, ref) => {
    const [isReady, setIsReady] = useState(false);

    useImperativeHandle(ref, () => ({
      execute: async () => {
        try {
          if (grecaptcha && isReady) {
            const token = await grecaptcha.execute(siteKey, { action });
            onVerify?.(token);
            return token;
          }
          throw new Error("reCAPTCHA not ready");
        } catch (err) {
          onError?.(err);
          return null;
        }
      },
    }));

    useEffect(() => {
      const scriptId = "recaptcha-v3-script";
      const src = `https://www.google.com/recaptcha/api.js?render=${siteKey}${
        hl ? `&hl=${hl}` : ""
      }`;

      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = src;
        script.async = true;
        script.onload = () => {
          grecaptcha.ready(() => {
            setIsReady(true);
          });
        };
        script.onerror = () => {
          onError?.(new Error("Failed to load reCAPTCHA script"));
        };
        document.body.appendChild(script);
      } else {
        // Si ya está cargado, esperar a que esté listo
        const checkReady = setInterval(() => {
          if (grecaptcha) {
            grecaptcha.ready(() => {
              setIsReady(true);
              clearInterval(checkReady);
            });
          }
        }, 300);
        return () => clearInterval(checkReady);
      }
    }, [siteKey, hl, onError]);

    return null;
  }
);

export default RecaptchaV3;
