import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runSeed } from "@/lib/seed-runner";

/** Re-runs the exact deterministic seed used at first setup. Safe to call
 * repeatedly — it only ever touches this project's local SQLite dev.db. */
export async function POST() {
  const summary = await runSeed(db);
  return NextResponse.json({ ok: true, summary });
}
