import { describe, expect, it } from "vitest";
import {
  getActionValidationError,
  isValidAction,
  VALID_ACTION_REGEX,
} from "../../libs/utils/actionValidator";

describe("utils/actionValidator", () => {
  describe("isValidAction()", () => {
    it.each([
      ["submit_form", true],
      ["page_view", true],
      ["user/login", true],
      ["a", true],
      ["Login123", true],
      ["HOME", true],
      ["submit_form_v2", true],
    ])("accepts %s", (action, expected) => {
      expect(isValidAction(action)).toBe(expected);
    });

    it.each([
      ["", false],
      ["special@action", false],
      ["with space", false],
      ["with-dash", false],
      ["with.dot", false],
      ["acción_con_tildes", false], // Google solo permite ASCII alfanumérico
      ["with%percent", false],
    ])("rejects %s", (action, expected) => {
      expect(isValidAction(action)).toBe(expected);
    });
  });

  describe("getActionValidationError()", () => {
    it("returns null for valid actions", () => {
      expect(getActionValidationError("submit_form")).toBeNull();
    });

    it("returns a non-null message for invalid actions", () => {
      const msg = getActionValidationError("bad@action");
      expect(msg).not.toBeNull();
      expect(msg).toMatch(/Invalid action/i);
      expect(msg).toContain("bad@action");
    });

    it("returns a message for empty input", () => {
      const msg = getActionValidationError("");
      expect(msg).not.toBeNull();
      expect(msg).toMatch(/non-empty string/);
    });

    it("returns a message for non-string input", () => {
      // Forzamos una entrada inválida para comprobar la guarda defensiva.
      // @ts-expect-error -- probando entrada malformada.
      const msg = getActionValidationError(undefined);
      expect(msg).not.toBeNull();
    });
  });

  describe("VALID_ACTION_REGEX", () => {
    it("matches the documented Google format: alphanum, '/', '_'", () => {
      const samples = {
        good: ["submit_form", "user/login", "a1b2c3"],
        bad: ["submit-form", "submit form", "submit.form", "submit;form"],
      };

      for (const s of samples.good) {
        expect(VALID_ACTION_REGEX.test(s)).toBe(true);
      }
      for (const s of samples.bad) {
        expect(VALID_ACTION_REGEX.test(s)).toBe(false);
      }
    });
  });
});
