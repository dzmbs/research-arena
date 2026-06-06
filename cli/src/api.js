// Thin API client for the Research Arena Next.js backend.
import pc from "picocolors";

export const API_URL = (process.env.FRONTIER_API_URL || "http://localhost:3000").replace(/\/+$/, "");

/**
 * Wrapper around fetch that produces friendly errors when the API is
 * unreachable (e.g. the backend isn't running yet) or returns non-2xx.
 *
 * @param {string} path  Path beginning with `/api/...`
 * @param {RequestInit} [init]
 * @param {typeof fetch} [fetchImpl]  Optional fetch (e.g. x402-wrapped).
 */
export async function apiFetch(path, init = {}, fetchImpl = fetch) {
  const url = `${API_URL}${path}`;
  let res;
  try {
    res = await fetchImpl(url, init);
  } catch (err) {
    const code = err?.cause?.code || err?.code;
    // Network-level failure (backend down) vs. an x402 payment-flow error.
    if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ECONNRESET" || code === "UND_ERR_SOCKET") {
      throw new FrontierError(
        `Could not reach the Frontier API at ${pc.cyan(API_URL)} (${code}).\n` +
          `Is the backend running? Set ${pc.yellow("FRONTIER_API_URL")} if it lives elsewhere.`,
      );
    }
    throw new FrontierError(`Request to ${path} failed: ${err?.message || String(err)}`);
  }

  if (!res.ok && res.status !== 402) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error || body?.message || JSON.stringify(body);
    } catch {
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new FrontierError(`API ${path} -> HTTP ${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`);
  }
  return res;
}

export async function getJson(path, fetchImpl = fetch) {
  const res = await apiFetch(path, {}, fetchImpl);
  return res.json();
}

export class FrontierError extends Error {}
