import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  installMockGrecaptcha,
} from "../helpers/mockGrecaptcha";

// Mock de los helpers que el hook usa para cargar el script.
// Mantenemos el control del flujo de inicialización en los tests.
vi.mock("../../libs/utils/scriptLoader", async () => {
  const actual =
    await vi.importActual<typeof import("../../libs/utils/scriptLoader")>(
      "../../libs/utils/scriptLoader"
    );
  return {
    ...actual,
    loadRecaptchaScript: vi.fn().mockResolvedValue({ success: true }),
    waitForRecaptcha: vi.fn().mockImplementation(async () => {
      // Esperar a que window.grecaptcha exista (polling simple).
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

// Importamos DESPUÉS de vi.mock para que tome los mocks.
import { useReCaptcha } from "../../libs/hooks/useReCaptcha";

describe("hooks/useReCaptcha", () => {
  beforeEach(() => {
    // Empezamos sin grecaptcha en el DOM.
    delete (window as { grecaptcha?: unknown }).grecaptcha;
  });

  afterEach(() => {
    delete (window as { grecaptcha?: unknown }).grecaptcha;
    vi.restoreAllMocks();
  });

  it("starts in 'loading' state and becomes ready when grecaptcha arrives", async () => {
    // grecaptcha aparecerá después de un tick (simula carga real).
    setTimeout(() => installMockGrecaptcha({ token: "tok-a" }), 30);

    const { result } = renderHook(() =>
      useReCaptcha({
        siteKey: "SITE-KEY",
        action: "homepage",
        onVerify: vi.fn(),
        onError: vi.fn(),
      })
    );

    expect(result.current.isReady).toBe(false);
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.isLoading).toBe(false);
  });

  it("execute() returns the token from grecaptcha and triggers onVerify", async () => {
    installMockGrecaptcha({ token: "tok-b" });
    const onVerify = vi.fn();

    const { result } = renderHook(() =>
      useReCaptcha({
        siteKey: "SITE-KEY",
        action: "form_submit",
        onVerify,
      })
    );
    await waitFor(() => expect(result.current.isReady).toBe(true));

    let token: string | null = null;
    await act(async () => {
      token = await result.current.execute();
    });

    expect(token).toBe("tok-b");
    expect(onVerify).toHaveBeenCalledWith("tok-b");
  });

  it("execute() calls onError and returns null when grecaptcha fails", async () => {
    const mock = installMockGrecaptcha();
    mock.execute.mockRejectedValueOnce(new Error("grecaptcha-down"));

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useReCaptcha({
        siteKey: "SITE-KEY",
        action: "form_submit",
        onError,
      })
    );
    await waitFor(() => expect(result.current.isReady).toBe(true));

    let token: string | null = "sentinel";
    await act(async () => {
      token = await result.current.execute();
    });

    expect(token).toBeNull();
    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error);
  });

  it("reset() clears the auto-executed flag", async () => {
    installMockGrecaptcha({ token: "tok-c" });
    const { result } = renderHook(() =>
      useReCaptcha({
        siteKey: "SITE-KEY",
        action: "resetable",
      })
    );
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.reset());
    // El hook expone `isReady` como boolean (no como función).
    // La función `isReady()` vive en el ref del componente ReCaptchaV3.
    expect(result.current.isReady).toBe(true);
  });

  it("uses the latest onVerify callback without causing re-init", async () => {
    installMockGrecaptcha({ token: "tok-d" });
    const first = vi.fn();
    const second = vi.fn();

    const { result, rerender } = renderHook(
      ({ cb }: { cb: (t: string) => void }) =>
        useReCaptcha({ siteKey: "K", action: "a", onVerify: cb }),
      { initialProps: { cb: first } }
    );
    await waitFor(() => expect(result.current.isReady).toBe(true));

    // Cambiamos el callback. El hook usa refs estables, así que NO debe
    // re-disparar la inicialización.
    rerender({ cb: second });

    await act(async () => {
      await result.current.execute();
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("tok-d");
  });
});
