import type { Config } from "@netlify/functions";
import { refreshAllSources } from "../lib/news.js";

// Actualización automática de noticias desde los RSS de los medios cada 15 minutos
export default async () => {
  const result = await refreshAllSources();
  console.log(`[refresh-news] ${result.added} nuevas de ${result.fetched} leídas (${result.sources} fuentes OK)`, result.failed.length ? `Fallaron: ${result.failed.join(", ")}` : "");
};

export const config: Config = {
  schedule: "*/15 * * * *",
};
