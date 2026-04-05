import { NextResponse } from "next/server";
import { buildDashboardSnapshot } from "@/lib/data";

export async function GET() {
  const { snapshot, yesterdayKey, yesterdayCompletions } = await buildDashboardSnapshot();
  return NextResponse.json({ snapshot, yesterdayKey, yesterdayCompletions });
}
