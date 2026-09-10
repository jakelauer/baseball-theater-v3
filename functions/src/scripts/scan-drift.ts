/**
 * `pnpm mlb:scan-drift`
 *
 * Offline by default: scans the committed `fixtures/raw/` payloads and reports
 * every path the parsers drop. Exit 1 when anything unmodeled is found, so it
 * doubles as a gate.
 *
 * `BT_USE_LIVE_MLB=1 pnpm mlb:scan-drift -- --date=2026-09-05 --game=823823`
 * records that game's raw payloads into a temp dir first, then scans those — the
 * "after recording a new game, in season" path. `pnpm verify` / CI never set
 * `BT_USE_LIVE_MLB`, so they only ever run the offline scan.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recordRaw } from "../services/recorder.js";
import { formatDriftReport, scanRawDir } from "../services/scan-drift.js";

const committedRaw = fileURLToPath(new URL("../../../fixtures/raw/", import.meta.url));

function arg(name: string): string | undefined {
  const flag = `--${name}=`;
  return process.argv.find((a) => a.startsWith(flag))?.slice(flag.length);
}

async function resolveScanDir(): Promise<string> {
  if (process.env.BT_USE_LIVE_MLB !== "1") return committedRaw;

  const date = arg("date");
  const game = Number(arg("game"));
  if (!date || !Number.isInteger(game) || game <= 0) {
    console.error("live scan needs --date=YYYY-MM-DD --game=<gamePk>");
    process.exit(2);
  }
  const out = await mkdtemp(path.join(tmpdir(), "bt-scan-drift-"));
  console.log(
    `[scan-drift] BT_USE_LIVE_MLB=1 — recording game ${game} (${date}) into ${out}`,
  );
  await recordRaw({ date, gamePk: game }, out);
  return path.join(out, "raw");
}

const report = await scanRawDir(await resolveScanDir());
console.log(formatDriftReport(report));
process.exit(report.findings.length > 0 ? 1 : 0);
