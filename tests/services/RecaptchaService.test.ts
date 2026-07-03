import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRecaptchaService,
  recaptchaService,
  RecaptchaService,
} from "../../libs/services/RecaptchaService";
import { TRANSACTIONAL_ACTIONS } from "../../libs/enums/TRANSACTIONAL_ACTIONS";
import { installMockGrecaptcha, createMockGrecaptcha } from "../helpers/mockGrecaptcha";

describe("RecaptchaService", () => {
  let originalGrecaptcha: unknown;

  beforeEach(() => {
    originalGrecaptcha = (window as { grecaptcha?: unknown }).grecaptcha;
  });

  afterEach(() => {
    if (originalGrecaptcha === undefined) {
      delete (window as { grecaptcha?: unknown }).grecaptcha;
    } else {
      (window as { grecaptcha?: unknown }).grecaptcha = originalGrecaptcha;
    }
    vi.restoreAllMocks();
  });

  describe("createRecaptchaService (factory)", () => {
    it("creates a service with a mocked grecaptcha instance", () => {
      const mock = createMockGrecaptcha({ token: "tkn-1" });
      const service = createRecaptchaService(mock);

      expect(service.isReady()).toBe(true);
    });

    it("execute() returns the token when grecaptcha resolves", async () => {
      const mock = installMockGrecaptcha({ token: "factory-token" });
      const service = createRecaptchaService(mock);

      const result = await service.execute({
        siteKey: "key-1",
        action: "home",
      });

      expect(result.success).toBe(true);
      expect(result.token).toBe("factory-token");
      expect(mock.execute).toHaveBeenCalledWith("key-1", { action: "home" });
    });

    it("execute() captures errors thrown by grecaptcha.execute", async () => {
      const mock = installMockGrecaptcha();
      mock.execute.mockRejectedValueOnce(new Error("boom"));
      const service = createRecaptchaService(mock);

      const result = await service.execute({
        siteKey: "key-1",
        action: "home",
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("boom");
    });

    it("execute() returns 'not ready' when grecaptcha lacks execute()", async () => {
      const partial = { ready: () => undefined };
      const service = createRecaptchaService(partial);

      // isReady() requires execute to be a function
      expect(service.isReady()).toBe(false);

      const result = await service.execute({
        siteKey: "key-1",
        action: "home",
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("reCAPTCHA not ready");
    });

    it("reset() delegates when grecaptcha provides reset()", () => {
      const mock = installMockGrecaptcha();
      const service = createRecaptchaService(mock);
      service.reset();
      expect(mock.reset).toHaveBeenCalledTimes(1);
    });

    it("reset() does not throw when grecaptcha lacks reset()", () => {
      const service = createRecaptchaService({
        ready: () => undefined,
        execute: async () => "t",
      });

      expect(() => service.reset()).not.toThrow();
    });
  });

  describe("validateAction()", () => {
    const service = new RecaptchaService();

    it("rejects actions with invalid characters", () => {
      const result = service.validateAction("special@action");
      expect(result.isValid).toBe(false);
      expect(result.warning).toMatch(/Invalid action/i);
    });

    it("rejects empty strings", () => {
      const result = service.validateAction("");
      expect(result.isValid).toBe(false);
    });

    it("accepts lowercase alphanumeric actions", () => {
      const result = service.validateAction("submit_form");
      expect(result.isValid).toBe(true);
    });

    it("accepts slashes and underscores", () => {
      expect(service.validateAction("user/login").isValid).toBe(true);
      expect(service.validateAction("page_view").isValid).toBe(true);
      expect(service.validateAction("a/b/c_d").isValid).toBe(true);
    });

    it("warns when using autoExecute with a transactional action", () => {
      const result = service.validateAction(TRANSACTIONAL_ACTIONS.LOGIN);
      expect(result.isValid).toBe(true);
      expect(result.warning).toMatch(/autoExecute no recomendado/i);
    });

    it("does not warn for non-transactional valid actions", () => {
      const result = service.validateAction("homepage_view");
      expect(result.warning).toBeUndefined();
    });
  });

  describe("setGrecaptcha (injection)", () => {
    it("allows swapping the grecaptcha instance after construction", async () => {
      installMockGrecaptcha({ token: "old" });
      const service = new RecaptchaService();

      expect(service.isReady()).toBe(true);

      const newMock = installMockGrecaptcha({ token: "new" });
      service.setGrecaptcha(newMock);

      const result = await service.execute({
        siteKey: "k",
        action: "a",
      });
      expect(result.token).toBe("new");
    });
  });

  describe("recaptchaService (singleton)", () => {
    it("is exported as an instance of RecaptchaService", () => {
      expect(recaptchaService).toBeInstanceOf(RecaptchaService);
    });

    it("returns a 'not ready' error when grecaptcha is absent", async () => {
      delete (window as { grecaptcha?: unknown }).grecaptcha;

      // Build a fresh instance so it doesn't see a previously cached grecaptcha.
      const localService = new RecaptchaService();

      const result = await localService.execute({
        siteKey: "k",
        action: "a",
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("reCAPTCHA not ready");
    });
  });
});
