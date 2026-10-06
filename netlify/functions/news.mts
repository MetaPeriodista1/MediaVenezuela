import type { Config } from "@netlify/functions";
import { desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { news } from "../../db/schema.js";
import { lastRefresh, refreshAllSources, toClient } from "../lib/news.js";

const STALE_MS = 15 * 60 * 1000;
const MIN_FORCED_INTERVAL_MS = 60 * 1000;

export default async (req: Request) => {
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 60, 1), 200);
  const forced = url.searchParams.get("refresh") === "1";

  // Si el cron aún no ha corrido (o es un deploy preview), actualiza bajo demanda
  let refreshed: Awaited<ReturnType<typeof refreshAllSources>> | null = null;
  const last = await lastRefresh();
  const age = last ? Date.now() - last.getTime() : Infinity;
  if (age > STALE_MS || (forced && age > MIN_FORCED_INTERVAL_MS)) {
    try {
      refreshed = await refreshAllSources();
    } catch (err) {
      console.error("[news] Error al actualizar fuentes:", err);
    }
  }

  const rows = await db.select().from(news).orderBy(desc(news.publishedAt)).limit(limit);

  return Response.json(
    {
      news: rows.map(toClient),
      lastRefresh: (refreshed ? new Date() : last)?.toISOString() ?? null,
      refreshed,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
};

export const config: Config = {
  path: "/api/news",
  method: "GET",
};
