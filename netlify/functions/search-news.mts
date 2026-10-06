import type { Config } from "@netlify/functions";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "../../db/index.js";
import { news } from "../../db/schema.js";
import { saveNews, searchWeb, toClient } from "../lib/news.js";

export default async (req: Request) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
  const region = url.searchParams.get("region") || "ALL";
  const category = url.searchParams.get("category") || "ALL";
  const source = url.searchParams.get("source") || "ALL";

  // 1. Buscar en Internet (Google News) y guardar los hallazgos en la base de datos
  let webItems: Awaited<ReturnType<typeof searchWeb>> = [];
  let webError: string | null = null;
  const webQuery = [q, region !== "ALL" ? region.split(" / ")[0] : "", source !== "ALL" ? source : ""].filter(Boolean).join(" ");
  try {
    webItems = await searchWeb(webQuery || "noticias");
    await saveNews(webItems);
  } catch (err) {
    webError = "No se pudo consultar la web en este momento";
    console.error("[search-news] Error en búsqueda web:", err);
  }

  // 2. Consultar el índice completo (RSS + búsquedas anteriores) con los filtros
  const conditions: SQL[] = [];
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean).slice(0, 6);
    for (const term of terms) {
      const like = `%${term}%`;
      conditions.push(or(ilike(news.title, like), ilike(news.snippet, like), ilike(news.sourceName, like))!);
    }
  }
  if (region !== "ALL") conditions.push(eq(news.region, region));
  if (category !== "ALL") conditions.push(eq(news.category, category));
  if (source !== "ALL") conditions.push(ilike(news.sourceName, `%${source}%`));

  const rows = await db
    .select()
    .from(news)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(news.publishedAt))
    .limit(100);

  // 3. Unir resultados web en vivo + índice, sin duplicados y por fecha
  const merged = new Map<string, ReturnType<typeof toClient>>();
  for (const row of rows) merged.set(row.sourceUrl, toClient(row));
  for (const item of webItems) {
    if (category !== "ALL" && item.category !== category) continue;
    if (!merged.has(item.sourceUrl)) {
      merged.set(item.sourceUrl, {
        id: `web_${merged.size}`,
        title: item.title,
        snippet: item.snippet ?? "",
        sourceName: item.sourceName,
        sourceType: item.sourceType ?? "Búsqueda web",
        sourceUrl: item.sourceUrl,
        region: item.region ?? "Nacional",
        category: item.category ?? "General",
        origin: "web",
        publishedAt: new Date(item.publishedAt).toISOString(),
      });
    }
  }
  const results = [...merged.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 120);

  return Response.json(
    { query: q, webFound: webItems.length, webError, results },
    { headers: { "Cache-Control": "no-store" } },
  );
};

export const config: Config = {
  path: "/api/search",
  method: "GET",
};
