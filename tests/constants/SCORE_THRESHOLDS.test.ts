import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCORE_THRESHOLD,
  SCORE_THRESHOLDS,
} from "../../libs/constants/SCORE_THRESHOLDS";

describe("constants/SCORE_THRESHOLDS", () => {
  it("DEFAULT_SCORE_THRESHOLD es 0.5 según la doc oficial", () => {
    expect(DEFAULT_SCORE_THRESHOLD).toBe(0.5);
  });

  it("SCORE_THRESHOLDS cubre los casos de uso documentados", () => {
    expect(SCORE_THRESHOLDS.HOMEPAGE).toBeGreaterThanOrEqual(0);
    expect(SCORE_THRESHOLDS.HOMEPAGE).toBeLessThanOrEqual(1);
    expect(SCORE_THRESHOLDS.LOGIN).toBeGreaterThanOrEqual(0);
    expect(SCORE_THRESHOLDS.LOGIN).toBeLessThanOrEqual(1);
    expect(SCORE_THRESHOLDS.ECOMMERCE).toBeGreaterThanOrEqual(0);
    expect(SCORE_THRESHOLDS.ECOMMERCE).toBeLessThanOrEqual(1);
  });

  it("todos los valores están en el rango [0, 1] (rango válido de score)", () => {
    for (const value of Object.values(SCORE_THRESHOLDS)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("el umbral de ECOMMERCE es al menos tan estricto como LOGIN", () => {
    // Consistencia con la tabla de EXAMPLES.md.
    expect(SCORE_THRESHOLDS.ECOMMERCE).toBeGreaterThanOrEqual(
      SCORE_THRESHOLDS.LOGIN
    );
  });
});
