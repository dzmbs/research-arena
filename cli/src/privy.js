import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import pc from "picocolors";
import { PrivyClient } from "@privy-io/node";
import { createX402Client } from "@privy-io/node/x402";
import { wrapFetchWithPayment as wrapX402Fetch, decodePaymentResponseHeader } from "@x402/fetch";

import { FrontierError, API_URL } from "./api.js";

const AUTH_BASE = "https://auth.privy.io";
const TOKEN_PATH = join(homedir(), ".frontier", "privy.json");

export function privyAppId() {
  return process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
}

function requirePrivyAppId() {
  const appId = privyAppId();
  if (!appId) throw new FrontierError(`${pc.yellow("PRIVY_APP_ID")} or ${pc.yellow("NEXT_PUBLIC_PRIVY_APP_ID")} is required.`);
  return appId;
}

async function postPrivy(path, body) {
  const res = await fetch(`${AUTH_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "privy-app-id": requirePrivyAppId() },
    body: JSON.stringify(body || {}),
  });
  let json = {};
  try { json = await res.json(); } catch {}
  if (!res.ok) {
    const err = json.error || json.message || `${res.status} ${res.statusText}`;
    const e = new Error(err);
    e.status = res.status;
    e.body = json;
    throw e;
  }
  return json;
}

export async function login() {
  const d = await postPrivy("/api/oauth/v2/device_authorization", {});
  const url = d.verification_uri_complete || `${d.verification_uri || `${API_URL}/authorize`}?user_code=${d.user_code}`;
  console.log(pc.bold("Authorize Claude Code / Frontier CLI with Privy"));
  console.log(`\nOpen:  ${pc.cyan(url)}`);
  console.log(`Code:  ${pc.yellow(d.user_code)}`);
  console.log(pc.dim("\nWaiting for approval..."));

  let interval = Number(d.interval || 5);
  const expiresAt = Date.now() + Number(d.expires_in || 600) * 1000;
  while (Date.now() < expiresAt) {
    await new Promise((r) => setTimeout(r, interval * 1000));
    try {
      const token = await postPrivy("/api/oauth/v2/token", { grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: d.device_code });
      await saveToken({ ...token, appId: requirePrivyAppId(), savedAt: new Date().toISOString() });
      console.log(pc.green("Approved. Privy agent token saved."));
      console.log(pc.dim(`Token file: ${TOKEN_PATH}`));
      return token;
    } catch (e) {
      const code = e.body?.error || e.message;
      if (code === "authorization_pending") continue;
      if (code === "slow_down") { interval += 5; continue; }
      throw new FrontierError(`Privy login failed: ${code}`);
    }
  }
  throw new FrontierError("Privy login expired; run `frontier login` again.");
}

export async function loadToken() {
  try { return JSON.parse(await readFile(TOKEN_PATH, "utf8")); } catch { return null; }
}

async function saveToken(token) {
  await mkdir(dirname(TOKEN_PATH), { recursive: true });
  await writeFile(TOKEN_PATH, JSON.stringify(token, null, 2));
}

export async function refreshTokenIfPossible(token) {
  if (!token?.refresh_token) return token;
  try {
    const fresh = await postPrivy("/api/oauth/v2/token", { grant_type: "refresh_token", refresh_token: token.refresh_token });
    const saved = { ...fresh, appId: requirePrivyAppId(), savedAt: new Date().toISOString() };
    await saveToken(saved);
    return saved;
  } catch {
    return token;
  }
}

export async function wallet() {
  const token = await loadToken();
  if (!token) throw new FrontierError("Not logged in. Run `frontier login` first.");
  console.log(pc.bold("Privy authorization"));
  console.log(`app:       ${token.appId || requirePrivyAppId()}`);
  console.log(`saved:     ${token.savedAt || "unknown"}`);
  console.log(`wallet id: ${process.env.PRIVY_WALLET_ID || pc.yellow("set PRIVY_WALLET_ID")}`);
  console.log(`address:   ${process.env.PRIVY_WALLET_ADDRESS || pc.yellow("set PRIVY_WALLET_ADDRESS")}`);
}

export async function privyPaidFetch(maxValue) {
  const token = await refreshTokenIfPossible(await loadToken());
  if (!token) throw new FrontierError("No Privy agent authorization. Run `frontier login` and approve in the browser first.");
  const appId = requirePrivyAppId();
  const appSecret = process.env.PRIVY_APP_SECRET;
  const walletId = process.env.PRIVY_WALLET_ID;
  const address = process.env.PRIVY_WALLET_ADDRESS;
  if (!appSecret || !walletId || !address) {
    throw new FrontierError(
      `Privy submit requires ${pc.yellow("PRIVY_APP_SECRET")}, ${pc.yellow("PRIVY_WALLET_ID")}, and ${pc.yellow("PRIVY_WALLET_ADDRESS")} for this demo wallet.`,
    );
  }
  const privy = new PrivyClient({ appId, appSecret });
  const client = createX402Client(privy, {
    walletId,
    address,
    // This is what makes the demo a real Privy agent-authorization flow:
    // the browser-approved device OAuth token is included as a user JWT when
    // Privy authorizes wallet RPC signing for the x402 payment.
    authorizationContext: { user_jwts: [token.access_token] },
  });
  return {
    address,
    fetch: wrapX402Fetch(fetch, client, maxValue),
    decodePaymentResponse: decodePaymentResponseHeader,
  };
}
