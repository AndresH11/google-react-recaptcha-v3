import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  loadRecaptchaScript,
  ScriptLoader,
  waitForRecaptcha,
} from "../../libs/utils/scriptLoader";
import { SCRIPT_ID } from "../../libs/constants/SCRIPT_ID";
import { installMockGrecaptcha } from "../helpers/mockGrecaptcha";

describe("utils/scriptLoader", () => {
  beforeEach(() => {
    // Limpiar el script del DOM antes de cada test (si quedó de uno previo).
    document.getElementById(SCRIPT_ID)?.remove();
  });

  afterEach(() => {
    document.getElementById(SCRIPT_ID)?.remove();
    vi.restoreAllMocks();
  });

  describe("ScriptLoader.isScriptLoaded()", () => {
    it("returns false when the script tag is not in the document", () => {
      expect(ScriptLoader.isScriptLoaded()).toBe(false);
    });

    it("returns true once a script tag with the SCRIPT_ID exists", () => {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      document.head.appendChild(s);
      expect(ScriptLoader.isScriptLoaded()).toBe(true);
    });
  });

  describe("loadRecaptchaScript()", () => {
    it("returns success quickly when the script is already loaded (idempotent)", async () => {
      const existing = document.createElement("script");
      existing.id = SCRIPT_ID;
      document.head.appendChild(existing);

      const result = await loadRecaptchaScript({ siteKey: "k1" });

      expect(result.success).toBe(true);
      // No se crean scripts duplicados.
      expect(
        document.querySelectorAll(`script#${SCRIPT_ID}`).length
      ).toBe(1);
    });

    it("appends a script tag with the correct URL and attributes", async () => {
      const create = vi.spyOn(document, "createElement");
      const onLoadSpy = vi.fn();

      // Disparamos el onload manualmente para poder inspeccionar el DOM
      // antes de que la promesa se resuelva.
      const promise = loadRecaptchaScript(
        { siteKey: "SITE-KEY", hl: "es", trustedTypes: true },
        { onLoad: onLoadSpy }
      );

      // El script fue creado y agregado al head.
      const script = document.getElementById(SCRIPT_ID) as HTMLScriptElement;
      expect(script).toBeTruthy();
      expect(script.async).toBe(true);
      expect(script.defer).toBe(true);
      expect(script.src).toContain(
        "https://www.google.com/recaptcha/api.js?render=SITE-KEY"
      );
      expect(script.src).toContain("hl=es");
      expect(script.src).toContain("trustedtypes=true");
      expect(create).toHaveBeenCalledWith("script");

      // Disparamos el handler onload que loadRecaptchaScript dejó registrado.
      script.onload?.(new Event("load"));

      const result = await promise;
      expect(result.success).toBe(true);
      expect(onLoadSpy).toHaveBeenCalledTimes(1);
    });

    it("calls onError and resolves with failure when the script fails", async () => {
      const onError = vi.fn();

      const promise = loadRecaptchaScript(
        { siteKey: "k1" },
        { timeout: 50, onError }
      );

      // Disparamos el error manualmente.
      const script = document.getElementById(SCRIPT_ID) as HTMLScriptElement;
      script.onerror?.(new Event("error"));

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("resolves with a timeout error if the script never fires onload/onerror", async () => {
      const onError = vi.fn();
      const promise = loadRecaptchaScript(
        { siteKey: "k1" },
        { timeout: 20, onError }
      );

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error?.message).toMatch(/timeout/i);
      expect(onError).toHaveBeenCalledTimes(1);

      // El script no queda colgado en el DOM después del timeout.
      // (esto es deseable para no contaminar el documento entre tests).
    });
  });

  describe("waitForRecaptcha()", () => {
    it("resolves true immediately when window.grecaptcha already exists", async () => {
      installMockGrecaptcha();
      const ok = await waitForRecaptcha(100);
      expect(ok).toBe(true);
    });

    it("resolves true once grecaptcha is set within the timeout window", async () => {
      // grecaptcha no existe todavía.
      delete (window as { grecaptcha?: unknown }).grecaptcha;

      const promise = waitForRecaptcha(500);

      // Aparece después de un tick.
      setTimeout(() => installMockGrecaptcha(), 30);

      const ok = await promise;
      expect(ok).toBe(true);
    });

    it("resolves false when grecaptcha never shows up before the timeout", async () => {
      delete (window as { grecaptcha?: unknown }).grecaptcha;
      const ok = await waitForRecaptcha(50);
      expect(ok).toBe(false);
    });
  });
});
