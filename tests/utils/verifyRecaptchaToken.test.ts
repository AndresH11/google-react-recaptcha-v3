import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RECAPTCHA_VERIFY_URL,
  verifyRecaptchaToken,
} from "../../libs/utils/verifyRecaptchaToken";

const VALID_RESPONSE_BODY = {
  success: true,
  score: 0.9,
  action: "login",
  challenge_ts: "2025-01-01T00:00:00Z",
  hostname: "example.com",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("utils/verifyRecaptchaToken", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Restablecemos un stub controlable antes de cada test.
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("sends a POST to Google's siteverify URL with the right body", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse(VALID_RESPONSE_BODY));

    await verifyRecaptchaToken({
      token: "abc",
      secret: "SECRET",
      remoteIp: "203.0.113.1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(RECAPTCHA_VERIFY_URL);
    expect(init!.method).toBe("POST");
    expect(init!.headers).toEqual({
      "Content-Type": "application/x-www-form-urlencoded",
    });

    const body = init!.body as URLSearchParams;
    expect(body.get("secret")).toBe("SECRET");
    expect(body.get("response")).toBe("abc");
    expect(body.get("remoteip")).toBe("203.0.113.1");
  });

  it("returns success when Google responds with success=true and score above threshold", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse({
        success: true,
        score: 0.9,
        action: "login",
        challenge_ts: "2025-01-01T00:00:00Z",
        hostname: "example.com",
      })
    );

    const result = await verifyRecaptchaToken({
      token: "abc",
      secret: "SECRET",
      expectedAction: "login",
      threshold: 0.5,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.score).toBe(0.9);
      expect(result.action).toBe("login");
      expect(result.hostname).toBe("example.com");
    }
  });

  it("uses DEFAULT_SCORE_THRESHOLD (0.5) when threshold is omitted", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse({ ...VALID_RESPONSE_BODY, score: 0.5 })
    );

    const result = await verifyRecaptchaToken({
      token: "abc",
      secret: "SECRET",
    });
    expect(result.success).toBe(true);
  });

  it("returns failure when score is below threshold", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse({ ...VALID_RESPONSE_BODY, score: 0.2 })
    );

    const result = await verifyRecaptchaToken({
      token: "abc",
      secret: "SECRET",
      threshold: 0.5,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCodes).toContain("score-below-threshold");
      expect(result.message).toMatch(/below threshold/i);
    }
  });

  it("returns failure on action mismatch", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse({ ...VALID_RESPONSE_BODY, action: "checkout" })
    );

    const result = await verifyRecaptchaToken({
      token: "abc",
      secret: "SECRET",
      expectedAction: "login",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCodes).toContain("action-mismatch");
    }
  });

  it("returns failure on success=false from Google", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse({
        success: false,
        "error-codes": ["invalid-input-response"],
      })
    );

    const result = await verifyRecaptchaToken({
      token: "abc",
      secret: "SECRET",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCodes).toEqual(["invalid-input-response"]);
    }
  });

  it("returns failure with network-error on fetch rejection", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(
      new Error("ECONNRESET")
    );

    const result = await verifyRecaptchaToken({
      token: "abc",
      secret: "SECRET",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCodes).toContain("network-error");
      expect(result.message).toContain("ECONNRESET");
    }
  });

  it("returns failure with http-<status> on non-2xx response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse({}, 500)
    );

    const result = await verifyRecaptchaToken({
      token: "abc",
      secret: "SECRET",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCodes).toContain("http-500");
    }
  });

  it("returns failure with invalid-json when body is not JSON", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response("not json", { status: 200 })
    );

    const result = await verifyRecaptchaToken({
      token: "abc",
      secret: "SECRET",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCodes).toContain("invalid-json");
    }
  });

  it("returns missing-token / missing-secret without calling fetch", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);

    let r1 = await verifyRecaptchaToken({ token: "", secret: "S" });
    expect(r1.success).toBe(false);
    if (!r1.success) expect(r1.errorCodes).toContain("missing-token");
    expect(fetchMock).not.toHaveBeenCalled();

    let r2 = await verifyRecaptchaToken({ token: "t", secret: "" });
    expect(r2.success).toBe(false);
    if (!r2.success) expect(r2.errorCodes).toContain("missing-secret");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a custom fetchImpl (avoids touching global)", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(VALID_RESPONSE_BODY));

    const result = await verifyRecaptchaToken({
      token: "abc",
      secret: "SECRET",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.success).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("accepts a custom verifyUrl", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(VALID_RESPONSE_BODY));

    await verifyRecaptchaToken({
      token: "abc",
      secret: "SECRET",
      verifyUrl: "https://proxy.example/verify",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init.method).toBe("POST");
    expect(fetchImpl.mock.calls[0]![0]).toBe("https://proxy.example/verify");
  });

  it("returns failure with missing-score when score is not numeric", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse({ ...VALID_RESPONSE_BODY, score: undefined as unknown })
    );

    const result = await verifyRecaptchaToken({
      token: "abc",
      secret: "SECRET",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCodes).toContain("missing-score");
    }
  });
});
