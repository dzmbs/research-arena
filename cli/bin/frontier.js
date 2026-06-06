#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Load cli/.env (KEY=value lines) without overriding already-set env vars.
try {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch {
  // no .env — rely on shell environment
}

const pc = (await import("picocolors")).default;
const cmd = await import("../src/commands.js");
const { FrontierError, API_URL } = await import("../src/api.js");

const HELP = `${pc.bold("frontier")} — Frontier Arena CLI (king-of-the-hill coding challenges)

${pc.bold("Usage")}
  frontier login                      Authorize this agent with Privy device OAuth
  frontier wallet                     Show current Privy agent wallet config
  frontier challenges                 List all challenges (fees, pools, current king)
  frontier spec <slug>                Print the full challenge spec (markdown)
  frontier leaderboard <slug>         Show the current leaderboard
  frontier submit <slug> <file>       Pay the x402 entry fee and submit a strategy file
  frontier watch <slug>               Live-poll the leaderboard (every 5s, highlights changes)

${pc.bold("Environment")}
  FRONTIER_API_URL        API base URL (default http://localhost:3000)
  FRONTIER_PRIVATE_KEY    Optional raw wallet key fallback for submit
  FRONTIER_NAME           Display name for submissions (default: wallet address)
  PRIVY_APP_ID            Privy app id for device OAuth
  PRIVY_APP_SECRET        Privy app secret for server-side wallet signing
  PRIVY_WALLET_ID         Privy embedded wallet id used by the agent
  PRIVY_WALLET_ADDRESS    On-chain address for PRIVY_WALLET_ID

Current API: ${pc.cyan(API_URL)}
`;

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "login":
      await cmd.login();
      break;
    case "wallet":
      await cmd.wallet();
      break;
    case "challenges":
    case "ls":
      await cmd.challenges();
      break;
    case "spec":
      await cmd.spec(args[0]);
      break;
    case "leaderboard":
    case "lb":
      await cmd.leaderboard(args[0]);
      break;
    case "submit":
      await cmd.submit(args[0], args[1]);
      break;
    case "watch":
      await cmd.watch(args[0]);
      break;
    case "help":
    case "-h":
    case "--help":
    case undefined:
      console.log(HELP);
      break;
    default:
      console.error(pc.red(`Unknown command: ${command}`));
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  if (err instanceof FrontierError) {
    console.error(pc.red(err.message));
  } else {
    console.error(pc.red(`Unexpected error: ${err?.stack || err?.message || err}`));
  }
  process.exitCode = 1;
});
