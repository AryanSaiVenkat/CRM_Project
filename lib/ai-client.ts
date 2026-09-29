/**
 * Client for the FastAPI inference service (ml-service/, PRD §5.2/§7.3):
 *   POST /score-lead  { lead_features } -> { score, top_drivers[] }
 *   POST /sentiment    { text }          -> { label, confidence }
 *
 * If ML_SERVICE_URL is unset, unreachable, or times out, both functions fall
 * back to a small deterministic local heuristic below. That fallback exists
 * so the app degrades gracefully rather than breaking — it does NOT by
 * itself satisfy FR-AI-01 (trained ML model) or FR-AI-02 (VADER); those are
 * implemented in ml-service/. See docs/ARCHITECTURE.md.
 */

export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export interface LeadFeatures {
  hasEmail: boolean;
  hasPhone: boolean;
  source: string | null;
  daysSinceCreated: number;
  status: string;
}

export interface LeadScoreResult {
  score: number; // 0-100
  topDrivers: string[];
  source: "model" | "fallback";
}

export interface SentimentResult {
  label: Sentiment;
  confidence: number;
  source: "model" | "fallback";
}

const TIMEOUT_MS = 3000; // FR-AI-02's own 3s budget

async function callMlService<T>(path: string, body: unknown, isValid: (v: unknown) => v is T): Promise<T | null> {
  const base = process.env.ML_SERVICE_URL;
  if (!base) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    // Defends against ML_SERVICE_URL accidentally pointing at an unrelated
    // service that still returns 200 with an unexpected body shape.
    return isValid(json) ? json : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function isScoreLeadResponse(v: unknown): v is { score: number; top_drivers: string[] } {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.score === "number" && Array.isArray(r.top_drivers) && r.top_drivers.every((d) => typeof d === "string")
  );
}

function isSentimentResponse(v: unknown): v is { label: string; confidence: number } {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.label === "string" &&
    ["POSITIVE", "NEUTRAL", "NEGATIVE"].includes(r.label) &&
    typeof r.confidence === "number"
  );
}

// ---------------------------------------------------------------------------
// Degraded-mode local fallback only — used when ml-service is unreachable.
// ---------------------------------------------------------------------------
const NEG_WORDS = [
  "angry",
  "frustrat",
  "unacceptable",
  "terrible",
  "worst",
  "asap",
  "cancel",
  "fail",
  "slow",
  "unresolved",
  "again",
  "still",
  "disappoint",
  "refund",
  "broken",
  "complain",
  "issue",
  "problem",
  "poor",
  "never",
  "escalate",
];
const POS_WORDS = [
  "thank",
  "great",
  "resolved",
  "fixed",
  "happy",
  "appreciate",
  "excellent",
  "love",
  "perfect",
  "quick",
  "wonderful",
  "awesome",
  "helpful",
];

function localSentiment(text: string): SentimentResult {
  const t = (text || "").toLowerCase();
  let score = 0;
  for (const w of NEG_WORDS) if (t.includes(w)) score -= 1;
  for (const w of POS_WORDS) if (t.includes(w)) score += 1;
  const label: Sentiment = score <= -1 ? "NEGATIVE" : score >= 1 ? "POSITIVE" : "NEUTRAL";
  return { label, confidence: Math.min(1, Math.abs(score) / 3), source: "fallback" };
}

function localLeadScore(features: LeadFeatures): LeadScoreResult {
  const weighted: { w: number; label: string }[] = [];
  let score = 20;

  if (features.hasEmail) {
    score += 15;
    weighted.push({ w: 15, label: "Has a verified email address on file" });
  }
  if (features.hasPhone) {
    score += 10;
    weighted.push({ w: 10, label: "Has a phone number on file" });
  }
  if (features.source && /referral/i.test(features.source)) {
    score += 20;
    weighted.push({ w: 20, label: "Came in through a referral" });
  }
  if (features.status === "CONTACTED") {
    score += 15;
    weighted.push({ w: 15, label: "Already contacted at least once" });
  }
  if (features.daysSinceCreated > 30) {
    score -= 15;
    weighted.push({ w: 15, label: "Open more than 30 days with no resolution" });
  }

  score = Math.max(1, Math.min(99, Math.round(score)));
  weighted.sort((a, b) => b.w - a.w);
  return { score, topDrivers: weighted.slice(0, 3).map((d) => d.label), source: "fallback" };
}

export async function scoreLead(features: LeadFeatures): Promise<LeadScoreResult> {
  const remote = await callMlService("/score-lead", { lead_features: features }, isScoreLeadResponse);
  if (remote) return { score: remote.score, topDrivers: remote.top_drivers, source: "model" };
  return localLeadScore(features);
}

export async function getSentiment(text: string): Promise<SentimentResult> {
  const remote = await callMlService("/sentiment", { text }, isSentimentResponse);
  if (remote) return { label: remote.label as Sentiment, confidence: remote.confidence, source: "model" };
  return localSentiment(text);
}
