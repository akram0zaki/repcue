// Minimal telemetry for exercise demo video failures (Phase 4)
// Privacy & Consent: Records only when user has granted analytics consent.
// Data stored locally (not sent to server) under a bounded key.
// Security: Only records same-origin /videos/ paths to avoid SSRF vectors.

import { ConsentService } from '../services/consentService';

export interface VideoErrorRecord {
  ts: string;              // ISO timestamp
  exercise_id: string;      // exercise id attempted
  url: string;             // video URL (same-origin only)
  status?: number;         // optional HTTP status from HEAD probe
  ct?: string;             // content-type if probed
  reason?: string;         // parseable reason string
}

const STORAGE_KEY = 'repcue_video_errors_v1';
const MAX_RECORDS = 50; // bounded to avoid unbounded growth

function loadRecords(): VideoErrorRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_RECORDS);
  } catch { return []; }
}

function saveRecords(records: VideoErrorRecord[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS))); } catch { /* ignore quota */ }
}

export async function recordVideoLoadError(opts: { exercise_id: string; url: string; reason?: string }) {
  const consent = ConsentService.getInstance();
  if (!consent.hasAnalyticsConsent()) return; // Respect analytics consent
  const { url, exercise_id, reason } = opts;
  // Allow only same-origin /videos/ paths (defense-in-depth)
  if (!url.startsWith('/videos/')) return;
  let status: number | undefined;
  let ct: string | undefined;
  try {
    // Lightweight HEAD to capture status if possible
    const res = await fetch(url, { method: 'HEAD' });
    status = res.status;
    ct = res.headers.get('content-type') || undefined;
  } catch {
    // network/HEAD failure silently ignored (still log base record)
  }
  const rec: VideoErrorRecord = { ts: new Date().toISOString(), exercise_id, url, status, ct, reason };
  const records = loadRecords();
  records.unshift(rec);
  saveRecords(records);
}

export function getVideoErrorTelemetry(): VideoErrorRecord[] {
  return loadRecords();
}

export function clearVideoErrorTelemetry() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}
