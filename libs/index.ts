// Componente principal
export { default as ReCaptchaV3 } from "./ReCaptchaV3";

// Interfaces principales
export type {
  RecaptchaV3Props,
  RecaptchaV3Ref,
  RecaptchaV3Response,
} from "./interfaces/reCaptchaV3.interface";

// Hook personalizado para uso avanzado
export {
  useReCaptcha,
  type UseRecaptchaOptions,
  type UseRecaptchaReturn,
} from "./hooks/useReCaptcha";

// Servicio para testing e integración personalizada
export {
  createRecaptchaService,
  recaptchaService,
} from "./services/RecaptchaService";
export type {
  RecaptchaConfig,
  RecaptchaExecutionResult,
  RecaptchaServiceInterface,
} from "./services/RecaptchaService";

// Utilidades para casos avanzados
export {
  loadRecaptchaScript,
  ScriptLoader,
  waitForRecaptcha,
} from "./utils/scriptLoader";
export type {
  ScriptConfig,
  ScriptLoaderOptions,
  ScriptLoadResult,
} from "./utils/scriptLoader";

// Constantes públicas
export { TRANSACTIONAL_ACTIONS } from "./enums/TRANSACTIONAL_ACTIONS";
