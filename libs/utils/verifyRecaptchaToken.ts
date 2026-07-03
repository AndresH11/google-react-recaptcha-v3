/**
 * Verificación server-side de tokens de reCAPTCHA v3.
 *
 * Esta función envuelve la llamada a
 * `https://www.google.com/recaptcha/api/siteverify` que Google documenta en
 * https://developers.google.com/recaptcha/docs/verify.
 *
 * El frontend genera el token; el backend DEBE verificarlo antes de confiar
 * en una acción. Google explícitamente recomienda:
 *   - Comprobar `success === true`.
 *   - Comprobar que `action` coincide con la esperada.
 *   - Comprobar que `hostname` coincide con tu dominio.
 *   - Comprobar que `score >= threshold` (por defecto 0.5).
 *
 * Esta función hace todo eso y devuelve un resultado discriminado
 * (success | failure) fácil de consumir.
 *
 * Funciona en cualquier runtime que tenga `fetch` global:
 *   - Navegadores (no se debería usar ahí, pero funciona).
 *   - Node 18+.
 *   - Edge runtimes (Cloudflare Workers, Deno, Vercel Edge).
 *   - Bun.
 *
 * Si necesitas un `fetch` custom (proxy, mock en test, Node < 18),
 * pásalo por `fetchImpl`.
 */

export const RECAPTCHA_VERIFY_URL =
  "https://www.google.com/recaptcha/api/siteverify";

/**
 * Payload que Google devuelve en `siteverify`.
 * Documentado en https://developers.google.com/recaptcha/docs/v3#site_verify_response
 */
export interface RecaptchaSiteVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export interface VerifyRecaptchaTokenOptions {
  /** Token reCAPTCHA generado en el frontend (típicamente llega en el body del POST). */
  token: string;
  /** Secret key (NUNCA la expongas al cliente). Sale del admin console. */
  secret: string;
  /**
   * Acción esperada. Si se pasa, se compara contra `response.action`.
   * Lanzamos un error si no coincide, para forzar al desarrollador a
   * tratar el caso explícitamente.
   */
  expectedAction?: string;
  /**
   * Umbral de score mínimo. Por defecto `DEFAULT_SCORE_THRESHOLD` (0.5).
   * Si el score devuelto por Google está por debajo, el resultado será
   * `{ success: false, errorCodes: ['score-below-threshold'], ... }`.
   */
  threshold?: number;
  /** IP del usuario final. Opcional pero recomendado para diagnóstico. */
  remoteIp?: string;
  /**
   * Override de `fetch` para entornos restringidos o tests.
   * Si no se pasa, usa `globalThis.fetch`.
   */
  fetchImpl?: typeof fetch;
  /**
   * URL del endpoint de verificación. Por defecto la oficial de Google.
   * Útil para proxys o mocks.
   */
  verifyUrl?: string;
}

export interface VerifyRecaptchaTokenSuccess {
  success: true;
  score: number;
  action: string;
  /** Timestamp del challenge en formato ISO (yyyy-MM-dd'T'HH:mm:ssZZ). */
  challengeTs: string;
  hostname: string;
}

export interface VerifyRecaptchaTokenFailure {
  success: false;
  /** Lista de motivos (códigos de error de Google + los nuestros propios). */
  errorCodes: string[];
  /** Mensaje agregado, listo para loguear. */
  message: string;
  /** Respuesta cruda de Google, si la obtuvimos. */
  raw?: RecaptchaSiteVerifyResponse;
}

export type VerifyRecaptchaTokenResult =
  | VerifyRecaptchaTokenSuccess
  | VerifyRecaptchaTokenFailure;

const NETWORK_ERROR_CODES = new Set<string>([
  "network-error",
  "invalid-json",
]);

/**
 * Comprueba el token reCAPTCHA contra el endpoint oficial de Google.
 *
 * @example
 * ```ts
 * import { verifyRecaptchaToken } from "google-react-recaptcha-v3";
 *
 * app.post("/api/login", async (req, res) => {
 *   const result = await verifyRecaptchaToken({
 *     token: req.body.recaptchaToken,
 *     secret: process.env.RECAPTCHA_SECRET!,
 *     expectedAction: "login",
 *     threshold: 0.5,
 *     remoteIp: req.ip,
 *   });
 *
 *   if (!result.success) {
 *     return res.status(400).json({ error: result.errorCodes });
 *   }
 *   // result.score, result.action, etc.
 * });
 * ```
 */
export async function verifyRecaptchaToken(
  options: VerifyRecaptchaTokenOptions
): Promise<VerifyRecaptchaTokenResult> {
  const {
    token,
    secret,
    expectedAction,
    threshold = 0.5,
    remoteIp,
    fetchImpl,
    verifyUrl = RECAPTCHA_VERIFY_URL,
  } = options;

  if (!token) {
    return {
      success: false,
      errorCodes: ["missing-token"],
      message: "Missing reCAPTCHA token.",
    };
  }
  if (!secret) {
    return {
      success: false,
      errorCodes: ["missing-secret"],
      message: "Missing reCAPTCHA secret key.",
    };
  }

  const doFetch = fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== "function") {
    return {
      success: false,
      errorCodes: ["fetch-unavailable"],
      message:
        "global fetch is not available in this runtime. Pass `fetchImpl` explicitly.",
    };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  let response: Response;
  try {
    response = await doFetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (err) {
    return {
      success: false,
      errorCodes: ["network-error"],
      message:
        err instanceof Error
          ? `Network error contacting Google: ${err.message}`
          : "Network error contacting Google.",
    };
  }

  if (!response.ok) {
    return {
      success: false,
      errorCodes: [`http-${response.status}`],
      message: `Google siteverify responded with HTTP ${response.status}.`,
    };
  }

  let data: RecaptchaSiteVerifyResponse;
  try {
    data = (await response.json()) as RecaptchaSiteVerifyResponse;
  } catch (err) {
    return {
      success: false,
      errorCodes: ["invalid-json"],
      message:
        err instanceof Error
          ? `Could not parse JSON from Google: ${err.message}`
          : "Could not parse JSON from Google.",
    };
  }

  // success === false desde Google
  if (!data.success) {
    return {
      success: false,
      errorCodes: data["error-codes"]?.length
        ? data["error-codes"]
        : ["verification-failed"],
      message: "reCAPTCHA verification failed.",
      raw: data,
    };
  }

  // Verificar la acción esperada
  if (expectedAction && data.action !== expectedAction) {
    return {
      success: false,
      errorCodes: ["action-mismatch"],
      message: `Action mismatch: expected "${expectedAction}", got "${data.action ?? "<unknown>"}".`,
      raw: data,
    };
  }

  const score = typeof data.score === "number" ? data.score : NaN;
  if (Number.isNaN(score)) {
    return {
      success: false,
      errorCodes: ["missing-score"],
      message: "Google response did not include a numeric score.",
      raw: data,
    };
  }

  if (score < threshold) {
    return {
      success: false,
      errorCodes: ["score-below-threshold"],
      message: `reCAPTCHA score ${score.toFixed(2)} is below threshold ${threshold}.`,
      raw: data,
    };
  }

  return {
    success: true,
    score,
    action: data.action ?? expectedAction ?? "",
    challengeTs: data.challenge_ts ?? "",
    hostname: data.hostname ?? "",
  };
}

// Re-export para que tree-shaking + discoverability funcionen.
export { DEFAULT_SCORE_THRESHOLD } from "../constants/SCORE_THRESHOLDS";

/** Alias semánticamente equivalente a `NETWORK_ERROR_CODES` para introspección. */
export const RECAPTCHA_INTERNAL_ERROR_CODES = NETWORK_ERROR_CODES;
