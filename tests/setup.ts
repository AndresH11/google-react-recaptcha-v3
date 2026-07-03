/**
 * Setup global para todos los tests.
 * Se carga desde `vitest.config.ts` → `setupFiles`.
 *
 * - Importa los matchers extendidos de `@testing-library/jest-dom`
 *   (`toBeInTheDocument`, `toHaveTextContent`, etc.).
 * - Registra `cleanup` automático entre tests para que el DOM no se filtre.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
