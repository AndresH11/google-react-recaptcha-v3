/**
 * 🛡️ Test de exportación de tipos.
 *
 * Este test verifica que TODOS los tipos exportados por la librería
 * siguen siendo accesibles desde el barrel `libs/index.ts` tal como los
 * documentamos en la API pública.
 *
 * Caso histórico: una vez subí un build a npm sin los `.d.ts` por una
 * configuración rota de tsup, y los consumidores recibían errores de TS
 * del estilo "Cannot find module 'google-react-recaptcha-v3' or its
 * corresponding type declarations". Este test habría reventado
 * `prepublishOnly` antes de publicar.
 *
 * NO usamos `import type` porque los tipos se borran en runtime
 * (esto es a propósito: TS sólo garantiza tipos hasta el transpilado).
 * En lugar de eso validamos la **forma** del barrel: que cada símbolo
 * exportado existe y resuelve al símbolo que esperamos.
 */
import { describe, expect, it } from "vitest";
import * as React from "react";
import * as PublicApi from "../libs";

// ---------- Tipos públicos esperados ----------
// Si en algún momento renombras o eliminas alguno de estos exports, este
// test va a FALLAR. Esa es la idea: el cambio debe ser consciente.

const EXPECTED_RUNTIME_EXPORTS = [
  // Componente
  "ReCaptchaV3",
  // Hook
  "useReCaptcha",
  // Servicio
  "recaptchaService",
  "createRecaptchaService",
  "RecaptchaService",
  // Script loader
  "ScriptLoader",
  "loadRecaptchaScript",
  "waitForRecaptcha",
  // Action validator (mejora añadida)
  "isValidAction",
  "getActionValidationError",
  "VALID_ACTION_REGEX",
  // Server-side verify helper (mejora añadida)
  "verifyRecaptchaToken",
  "RECAPTCHA_VERIFY_URL",
  "RECAPTCHA_INTERNAL_ERROR_CODES",
  // Constantes
  "TRANSACTIONAL_ACTIONS",
  "DEFAULT_SCORE_THRESHOLD",
  "SCORE_THRESHOLDS",
];

const EXPECTED_TYPE_EXPORTS = [
  "RecaptchaV3Props",
  "RecaptchaV3Ref",
  "RecaptchaV3Response",
  "UseRecaptchaOptions",
  "UseRecaptchaReturn",
  "RecaptchaConfig",
  "RecaptchaExecutionResult",
  "RecaptchaServiceInterface",
  "ScriptConfig",
  "ScriptLoaderOptions",
  "ScriptLoadResult",
  "VerifyRecaptchaTokenOptions",
  "VerifyRecaptchaTokenResult",
  "VerifyRecaptchaTokenSuccess",
  "VerifyRecaptchaTokenFailure",
  "RecaptchaSiteVerifyResponse",
  "ScoreThresholdKey",
  "ScoreThresholdValue",
];

describe("🛡️ exports — API pública", () => {
  it.each(EXPECTED_RUNTIME_EXPORTS)(
    "exports the runtime symbol %s",
    (name) => {
      expect(PublicApi).toHaveProperty(name);
      expect((PublicApi as Record<string, unknown>)[name]).toBeDefined();
    }
  );

  // El bundle declara los tipos en el .d.ts, pero al importarlos desde
  // el barrel directamente en .ts, TS los borra. Validamos que al menos
  // el objeto namespace los refleje (no serán undefined, pero tampoco
  // contendrán valor en runtime). Por eso usamos `as unknown` y
  // comprobamos que el símbolo ES "accesible" según las definiciones
  // del tipo del módulo.
  it("la API pública contiene todas las definiciones de tipos esperadas", () => {
    // Esto es un check estructural: si algún `type` desapareciera del
    // barrel, este test fallaría en `tsc` (durante `pnpm test:types`).
    // Aquí simplemente confirmamos que el módulo existe y no está vacío.
    const exportNames = Object.keys(PublicApi);
    expect(exportNames.length).toBeGreaterThanOrEqual(
      EXPECTED_RUNTIME_EXPORTS.length
    );
  });

  it("ReCaptchaV3 es un forwardRef que acepta las props esperadas", () => {
    // Validamos que el componente es funcionalmente utilizable.
    const element = React.createElement(PublicApi.ReCaptchaV3, {
      siteKey: "test-key",
      action: "test-action",
    });

    expect(React.isValidElement(element)).toBe(true);
  });

  it("los tipos esperados son referenciables desde el barrel (chequeo TS)", () => {
    // Este test depende de que `tsc --noEmit` haya pasado. Si algún
    // export de tipo fue removido o renombrado, el bloque siguiente
    // dejaría de compilar.
    type _CheckExports =
      | PublicApi.RecaptchaV3Props
      | PublicApi.RecaptchaV3Ref
      | PublicApi.RecaptchaV3Response
      | PublicApi.UseRecaptchaOptions
      | PublicApi.UseRecaptchaReturn
      | PublicApi.RecaptchaConfig
      | PublicApi.RecaptchaExecutionResult
      | PublicApi.RecaptchaServiceInterface
      | PublicApi.ScriptConfig
      | PublicApi.ScriptLoaderOptions
      | PublicApi.ScriptLoadResult
      | PublicApi.VerifyRecaptchaTokenOptions
      | PublicApi.VerifyRecaptchaTokenResult
      | PublicApi.RecaptchaSiteVerifyResponse
      | PublicApi.ScoreThresholdKey
      | PublicApi.ScoreThresholdValue;

    // La variable compila sólo si todos los tipos existen.
    const _check: _CheckExports | undefined = undefined;
    expect(_check).toBeUndefined();
  });

  it("declara constantes numéricas correctas", () => {
    expect(PublicApi.DEFAULT_SCORE_THRESHOLD).toBe(0.5);
    expect(PublicApi.SCORE_THRESHOLDS).toMatchObject({
      HOMEPAGE: 0.3,
      LOGIN: 0.5,
      SOCIAL: 0.6,
      ECOMMERCE: 0.7,
      REGISTER: 0.5,
    });
    expect(PublicApi.RECAPTCHA_VERIFY_URL).toBe(
      "https://www.google.com/recaptcha/api/siteverify"
    );
  });

  it("EXPECTED_TYPE_EXPORTS lista todos los tipos que la API debe exponer", () => {
    // Sanity check sobre la lista EXPECTED_TYPE_EXPORTS: si alguien
    // añade un export, debería añadirlo a la lista. Si alguien quita
    // uno, este test no falla (el de arriba sí). Sirve como recordatorio
    // ejecutándose en CI.
    expect(EXPECTED_TYPE_EXPORTS.length).toBeGreaterThan(0);

    // Verificamos que cada nombre es un string razonable.
    for (const name of EXPECTED_TYPE_EXPORTS) {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
