import { scoreLead, getSentiment } from "@/lib/ai-client";

const originalFetch = global.fetch;
const originalUrl = process.env.ML_SERVICE_URL;

afterEach(() => {
  global.fetch = originalFetch;
  process.env.ML_SERVICE_URL = originalUrl;
});

describe("scoreLead", () => {
  it("falls back to a local heuristic when ML_SERVICE_URL is unset", async () => {
    delete process.env.ML_SERVICE_URL;
    const result = await scoreLead({
      hasEmail: true,
      hasPhone: true,
      source: "Referral",
      daysSinceCreated: 1,
      status: "NEW",
    });
    expect(result.source).toBe("fallback");
    expect(result.score).toBeGreaterThan(0);
    expect(result.topDrivers.length).toBeGreaterThan(0);
  });

  it("uses the remote model when it returns a valid response shape", async () => {
    process.env.ML_SERVICE_URL = "http://ml.test";
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ score: 77, top_drivers: ["x"] }) }) as any;
    const result = await scoreLead({
      hasEmail: true,
      hasPhone: true,
      source: null,
      daysSinceCreated: 0,
      status: "NEW",
    });
    expect(result).toEqual({ score: 77, topDrivers: ["x"], source: "model" });
  });

  it("falls back when the remote response has an unexpected shape (e.g. an unrelated service on that port)", async () => {
    process.env.ML_SERVICE_URL = "http://ml.test";
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ unrelated: true }) }) as any;
    const result = await scoreLead({
      hasEmail: false,
      hasPhone: false,
      source: null,
      daysSinceCreated: 0,
      status: "NEW",
    });
    expect(result.source).toBe("fallback");
  });

  it("falls back when the remote call rejects or times out", async () => {
    process.env.ML_SERVICE_URL = "http://ml.test";
    global.fetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED")) as any;
    const result = await scoreLead({
      hasEmail: false,
      hasPhone: false,
      source: null,
      daysSinceCreated: 0,
      status: "NEW",
    });
    expect(result.source).toBe("fallback");
  });
});

describe("getSentiment", () => {
  it("classifies obviously negative text via the local fallback", async () => {
    delete process.env.ML_SERVICE_URL;
    const result = await getSentiment("This is unacceptable, terrible, I want to cancel and get a refund.");
    expect(result.label).toBe("NEGATIVE");
  });

  it("classifies obviously positive text via the local fallback", async () => {
    delete process.env.ML_SERVICE_URL;
    const result = await getSentiment("Thank you, excellent and wonderful service, really appreciate it.");
    expect(result.label).toBe("POSITIVE");
  });

  it("uses the remote sentiment model when available", async () => {
    process.env.ML_SERVICE_URL = "http://ml.test";
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ label: "NEUTRAL", confidence: 0.1 }) }) as any;
    const result = await getSentiment("hello");
    expect(result).toEqual({ label: "NEUTRAL", confidence: 0.1, source: "model" });
  });
});
