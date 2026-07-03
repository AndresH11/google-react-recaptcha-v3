/**
 * Validador del nombre de acción para reCAPTCHA v3.
 *
 * Según la documentación oficial de Google
 * (https://developers.google.com/recaptcha/docs/v3#actions):
 *
 * > "Actions might contain only alphanumeric characters, slashes,
 * >  and underscores. Actions must not be user-specific."
 *
 * Este módulo expone dos helpers:
 * - `isValidAction(action)`: devuelve `true`/`false`.
 * - `getActionValidationError(action)`: devuelve `null` o un mensaje listo
 *   para mostrar/loguear.
 *
 * Mantenemos la regex como constante exportada para que sea fácil de
 * reutilizar (p.ej. en formularios con `pattern=...`).
 */

/**
 * Regex que valida el formato oficial de un action name de reCAPTCHA v3.
 * Acepta: `[a-zA-Z0-9/_]+` (al menos un carácter).
 */
export const VALID_ACTION_REGEX = /^[a-zA-Z0-9/_]+$/;

/**
 * `true` si el nombre de acción cumple el formato exigido por Google.
 *
 * @example
 * isValidAction("submit_form"); // true
 * isValidAction("user/login");  // true
 * isValidAction("special@ac");  // false
 */
export function isValidAction(action: string): boolean {
  return VALID_ACTION_REGEX.test(action);
}

/**
 * Devuelve un mensaje de error legible cuando la acción no es válida,
 * o `null` cuando sí lo es. Pensado para `console.warn` en modo dev o para
 * re-lanzar como `Error` en validaciones de formulario.
 */
export function getActionValidationError(action: string): string | null {
  if (typeof action !== "string" || action.length === 0) {
    return `Invalid action: must be a non-empty string. Got ${JSON.stringify(action)}.`;
  }
  if (!isValidAction(action)) {
    return `Invalid action "${action}": reCAPTCHA v3 only accepts alphanumeric characters, "/", and "_" (see https://developers.google.com/recaptcha/docs/v3#actions).`;
  }
  return null;
}
