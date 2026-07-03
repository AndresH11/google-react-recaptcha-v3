import { createRef } from "react";
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReCaptchaV3 } from "../../libs";
import type { RecaptchaV3Ref } from "../../libs/interfaces/reCaptchaV3.interface";
import { installMockGrecaptcha } from "../helpers/mockGrecaptcha";

// Mock del scriptLoader igual que en el hook: queremos controlar la
// inicialización sin depender de la red.
vi.mock("../../libs/utils/scriptLoader", async () => {
  const actual =
    await vi.importActual<typeof import("../../libs/utils/scriptLoader")>(
      "../../libs/utils/scriptLoader"
    );
  return {
    ...actual,
    loadRecaptchaScript: vi.fn().mockResolvedValue({ success: true }),
    waitForRecaptcha: vi.fn().mockImplementation(async () => {
      const start = Date.now();
      while (Date.now() - start < 1000) {
        if (
          typeof window !== "undefined" &&
          (window as unknown as { grecaptcha?: unknown }).grecaptcha
        ) {
          return true;
        }
        await new Promise((r) => setTimeout(r, 10));
      }
      return false;
    }),
  };
});

describe("components/ReCaptchaV3", () => {
  beforeEach(() => {
    delete (window as { grecaptcha?: unknown }).grecaptcha;
  });

  afterEach(() => {
    delete (window as { grecaptcha?: unknown }).grecaptcha;
    vi.restoreAllMocks();
  });

  it("renders without visible output (headless)", async () => {
    installMockGrecaptcha();
    const { container } = render(
      <ReCaptchaV3 siteKey="KEY" action="homepage" />
    );
    // El componente es headless (null) en cualquier estado.
    expect(container.firstChild).toBeNull();
    // Dejamos que las actualizaciones pendientes se estabilicen.
    await waitFor(() => {
      // No assert real: sólo esperamos a que React termine el commit.
    });
  });

  it("exposes a stable ref API", async () => {
    installMockGrecaptcha({ token: "token-from-ref" });
    const ref = createRef<RecaptchaV3Ref>();

    render(<ReCaptchaV3 ref={ref} siteKey="KEY" action="homepage" />);

    await waitFor(() => expect(ref.current?.isReady()).toBe(true));

    expect(typeof ref.current?.execute).toBe("function");
    expect(typeof ref.current?.reset).toBe("function");
    expect(typeof ref.current?.isReady).toBe("function");
    expect(typeof ref.current?.isLoading).toBe("function");

    const token = await ref.current?.execute();
    expect(token).toBe("token-from-ref");
  });

  it("calls onVerify when execute() resolves", async () => {
    installMockGrecaptcha({ token: "verify-token" });
    const onVerify = vi.fn();

    const ref = createRef<RecaptchaV3Ref>();
    render(
      <ReCaptchaV3
        ref={ref}
        siteKey="KEY"
        action="form_submit"
        onVerify={onVerify}
      />
    );

    await waitFor(() => expect(ref.current?.isReady()).toBe(true));
    await ref.current?.execute();

    expect(onVerify).toHaveBeenCalledWith("verify-token");
  });

  it("calls onError and returns null when execute() fails", async () => {
    const mock = installMockGrecaptcha();
    mock.execute.mockRejectedValueOnce(new Error("kaboom"));

    const onError = vi.fn();
    const ref = createRef<RecaptchaV3Ref>();

    render(
      <ReCaptchaV3
        ref={ref}
        siteKey="KEY"
        action="form_submit"
        onError={onError}
      />
    );

    await waitFor(() => expect(ref.current?.isReady()).toBe(true));

    const token = await ref.current?.execute();
    expect(token).toBeNull();
    expect(onError).toHaveBeenCalled();
  });

  it("autoExecute={true} triggers execute() when ready", async () => {
    installMockGrecaptcha({ token: "auto-token" });
    const onVerify = vi.fn();
    const ref = createRef<RecaptchaV3Ref>();

    render(
      <ReCaptchaV3
        ref={ref}
        siteKey="KEY"
        action="page_view"
        autoExecute
        onVerify={onVerify}
      />
    );

    await waitFor(() => expect(onVerify).toHaveBeenCalledWith("auto-token"));
  });

  it("warns via console.warn when autoExecute is combined with a transactional action", async () => {
    installMockGrecaptcha({ token: "warn-token" });
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    const ref = createRef<RecaptchaV3Ref>();
    render(
      <ReCaptchaV3
        ref={ref}
        siteKey="KEY"
        action="login"
        autoExecute
      />
    );

    await waitFor(() => expect(warnSpy).toHaveBeenCalled());
    expect(warnSpy.mock.calls[0]![0]).toMatch(/autoExecute no recomendado/i);
    warnSpy.mockRestore();
  });
});
