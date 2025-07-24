import { forwardRef, useImperativeHandle } from "react";
import { useReCaptcha } from "./hooks/useReCaptcha";
import {
  RecaptchaV3Props,
  RecaptchaV3Ref,
} from "./interfaces/reCaptchaV3.interface";

/**
 * Componente ReCAPTCHA v3 con arquitectura limpia
 *
 * Este componente es una capa de presentación delgada que delega toda la lógica
 * al hook personalizado useRecaptcha, siguiendo principios de arquitectura limpia.
 *
 * @example
 * ```tsx
 * // Uso básico
 * <RecaptchaV3
 *   siteKey="your-site-key"
 *   action="page_view"
 *   onVerify={(token) => console.log(token)}
 * />
 *
 * // Con auto-ejecución para analytics
 * <RecaptchaV3
 *   siteKey="your-site-key"
 *   action="analytics"
 *   autoExecute={true}
 *   onVerify={(token) => sendAnalytics(token)}
 * />
 *
 * // Con referencia para ejecución manual
 * const recaptchaRef = useRef<RecaptchaV3Ref>(null);
 *
 * const handleSubmit = async () => {
 *   const token = await recaptchaRef.current?.execute();
 *   if (token) {
 *     // Enviar formulario con token
 *   }
 * };
 *
 * <ReCaptchaV3
 *   ref={recaptchaRef}
 *   siteKey="your-site-key"
 *   action="form_submit"
 *   onVerify={(token) => setFormToken(token)}
 * />
 * ```
 */
const ReCaptchaV3 = forwardRef<RecaptchaV3Ref, RecaptchaV3Props>(
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
    // Toda la lógica delegada al hook personalizado
    const { isReady, execute, reset, isLoading } = useReCaptcha({
      siteKey,
      action,
      hl,
      trustedTypes,
      timeout,
      autoExecute,
      onVerify,
      onError,
    });

    // Exposición de la API pública a través del ref
    useImperativeHandle(
      ref,
      () => ({
        execute,
        isReady: () => isReady,
        reset,
        isLoading: () => isLoading,
      }),
      [execute, isReady, reset, isLoading]
    );

    // Componente sin renderizado visual (headless)
    return null;
  }
);

ReCaptchaV3.displayName = "ReCaptchaV3";

export default ReCaptchaV3;
