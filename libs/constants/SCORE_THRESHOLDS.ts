/**
 * Umbrales de score recomendados por Google para reCAPTCHA v3.
 *
 * Fuente: https://developers.google.com/recaptcha/docs/v3#interpreting_the_score
 *
 * Google explícitamente recomienda iniciar con `0.5` como umbral por defecto
 * y luego ajustarlo según lo observado en el admin console
 * (https://www.google.com/recaptcha/admin) para tráfico real.
 *
 * Cada sitio es distinto: estos son sólo valores de partida razonables.
 */
export const DEFAULT_SCORE_THRESHOLD = 0.5 as const;

/**
 * Umbrales sugeridos por caso de uso según la documentación oficial.
 * Ajusta según los datos de tu propio tráfico.
 */
export const SCORE_THRESHOLDS = {
  HOMEPAGE: 0.3, // Filtrar scrapers
  LOGIN: 0.5, // 2FA si el score es bajo
  SOCIAL: 0.6, // Moderar contenido riesgoso
  ECOMMERCE: 0.7, // Verificación adicional para transacciones
  REGISTER: 0.5, // Verificación por email si el score es bajo
} as const;

export type ScoreThresholdKey = keyof typeof SCORE_THRESHOLDS;
export type ScoreThresholdValue = (typeof SCORE_THRESHOLDS)[ScoreThresholdKey];
