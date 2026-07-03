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
  RecaptchaService,
  type RecaptchaConfig,
  type RecaptchaExecutionResult,
  type RecaptchaServiceInterface,
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

// Validador de nombres de acción (formato exigido por Google).
export {
  isValidAction,
  getActionValidationError,
  VALID_ACTION_REGEX,
} from "./utils/actionValidator";

// Verificación server-side de tokens.
// Llama a https://www.google.com/recaptcha/api/siteverify y devuelve un
// resultado discriminado (success | failure) fácil de consumir.
export {
  verifyRecaptchaToken,
  RECAPTCHA_VERIFY_URL,
  RECAPTCHA_INTERNAL_ERROR_CODES,
  type VerifyRecaptchaTokenOptions,
  type VerifyRecaptchaTokenResult,
  type VerifyRecaptchaTokenSuccess,
  type VerifyRecaptchaTokenFailure,
  type RecaptchaSiteVerifyResponse,
} from "./utils/verifyRecaptchaToken";

// Constantes públicas
export { TRANSACTIONAL_ACTIONS } from "./enums/TRANSACTIONAL_ACTIONS";

// Umbrales de score recomendados por Google para reCAPTCHA v3.
export {
  DEFAULT_SCORE_THRESHOLD,
  SCORE_THRESHOLDS,
  type ScoreThresholdKey,
  type ScoreThresholdValue,
} from "./constants/SCORE_THRESHOLDS";
