import { vi, type MockInstance } from "vitest";

/**
 * Crea un mock del objeto `window.grecaptcha` para uso en tests.
 * Por defecto, `execute` resuelve con un token falso y `ready` ejecuta
 * el callback de forma síncrona (no asíncrona).
 *
 * Opciones:
 * - `token`: token a devolver en `execute`. Default: `"mock-token"`.
 * - `readyAsync`: si es `true`, `ready` envuelve el callback en un
 *   `setTimeout(..., 0)` para simular el comportamiento real.
 */
export interface MockGrecaptcha {
  ready: (cb: () => void) => void;
  execute: MockInstance<(siteKey: string, options: { action: string }) => Promise<string>>;
  reset: MockInstance<() => void>;
  getResponse: MockInstance<() => string>;
}

export function createMockGrecaptcha(options?: {
  token?: string;
  readyAsync?: boolean;
  reset?: () => void;
}): MockGrecaptcha {
  const token = options?.token ?? "mock-token";
  const reset = options?.reset ?? (() => undefined);

  return {
    ready: (cb: () => void) => {
      if (options?.readyAsync) {
        setTimeout(cb, 0);
      } else {
        cb();
      }
    },
    execute: vi.fn().mockResolvedValue(token),
    reset: vi.fn().mockImplementation(reset),
    getResponse: vi.fn().mockReturnValue(token),
  };
}

/**
 * Inyecta el mock en `window.grecaptcha` y devuelve la referencia.
 * El llamador es responsable de hacer cleanup (o usar `vi.unstubAllGlobals`
 * + `delete window.grecaptcha`).
 */
export function installMockGrecaptcha(
  options?: Parameters<typeof createMockGrecaptcha>[0]
): MockGrecaptcha {
  const mock = createMockGrecaptcha(options);
  (window as unknown as { grecaptcha: unknown }).grecaptcha = mock;
  return mock;
}
