import { desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { news, newsRefreshes } from "../../db/schema.js";

export type NewsItem = typeof news.$inferInsert;

// Fuentes RSS verificadas de medios venezolanos (nacionales, regionales e investigación)
export const RSS_SOURCES = [
  { name: "TalCual", type: "Independiente", url: "https://talcualdigital.com/feed/" },
  { name: "Runrunes", type: "Investigación", url: "https://runrun.es/feed/" },
  { name: "Crónica Uno", type: "Comunitario", url: "https://cronica.uno/feed/" },
  { name: "El Carabobeño", type: "Regional", url: "https://www.el-carabobeno.com/feed/", region: "Carabobo" },
  { name: "Correo del Caroní", type: "Regional / DDHH", url: "https://correodelcaroni.com/feed/", region: "Bolívar" },
  { name: "Armando.info", type: "Investigación", url: "https://armando.info/feed/" },
  { name: "El Estímulo", type: "Independiente", url: "https://elestimulo.com/feed/" },
  { name: "El Nacional", type: "Nacional", url: "https://www.elnacional.com/feed/" },
  { name: "Noticia al Día", type: "Regional", url: "https://www.noticiaaldia.com/feed/", region: "Zulia" },
  { name: "La Prensa de Lara", type: "Regional", url: "https://www.laprensalara.com.ve/feed/", region: "Lara" },
  { name: "Descifrado", type: "Economía", url: "https://www.descifrado.com/feed/" },
];

// Palabras clave por estado (deben coincidir con los nombres de región del mapa)
const REGION_KEYWORDS: Record<string, string[]> = {
  Caracas: ["caracas", "distrito capital", "petare", "miraflores", "chacao", "baruta", "el valle", "catia"],
  Zulia: ["zulia", "maracaibo", "san francisco", "cabimas", "ciudad ojeda", "machiques", "lago de maracaibo"],
  Táchira: ["táchira", "tachira", "san cristóbal", "san cristobal", "ureña", "san antonio del táchira"],
  Bolívar: ["bolívar", "bolivar", "puerto ordaz", "ciudad guayana", "ciudad bolívar", "sidor", "upata", "el callao", "guayana"],
  Carabobo: ["carabobo", "valencia", "puerto cabello", "guacara", "naguanagua"],
  Lara: ["lara", "barquisimeto", "carora", "cabudare"],
  Miranda: ["miranda", "los teques", "valles del tuy", "guarenas", "guatire", "ocumare del tuy", "charallave"],
  Aragua: ["aragua", "maracay", "la victoria", "turmero", "tocorón"],
  Anzoátegui: ["anzoátegui", "anzoategui", "barcelona", "puerto la cruz", "el tigre", "lechería"],
  Mérida: ["mérida", "merida", "el vigía", "tovar"],
  Falcón: ["falcón", "falcon", "coro", "punto fijo", "paraguaná", "amuay", "cardón"],
  Monagas: ["monagas", "maturín", "maturin", "punta de mata"],
  "Nueva Esparta": ["nueva esparta", "margarita", "porlamar", "la asunción", "coche"],
  "Vargas / La Guaira": ["la guaira", "vargas", "maiquetía", "maiquetia", "catia la mar"],
  Apure: ["apure", "san fernando de apure", "achaguas", "guasdualito"],
  Barinas: ["barinas", "socopó"],
  Sucre: ["sucre", "cumaná", "cumana", "carúpano", "carupano", "güiria"],
  Amazonas: ["amazonas", "puerto ayacucho"],
  "Delta Amacuro": ["delta amacuro", "tucupita"],
  Portuguesa: ["portuguesa", "guanare", "acarigua", "araure"],
  Trujillo: ["trujillo", "valera", "boconó"],
  Yaracuy: ["yaracuy", "san felipe"],
  Cojedes: ["cojedes", "san carlos"],
  Guárico: ["guárico", "guarico", "san juan de los morros", "calabozo", "valle de la pascua"],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Servicios Públicos": ["apagón", "apagon", "luz", "electricidad", "eléctric", "corpoelec", "agua", "hidrolago", "hidrocapital", "gas", "gasolina", "combustible", "diésel", "diesel", "internet", "cantv", "transporte", "hospital", "salud"],
  "Derechos Humanos y Medios": ["detenido", "detención", "detencion", "preso político", "presos políticos", "dgcim", "sebin", "provea", "foro penal", "derechos humanos", "ddhh", "periodista", "censura", "bloqueo", "ong", "tortura", "represión"],
  "Política y Partidos": ["cne", "elección", "elecciones", "electoral", "oposición", "oposicion", "chavismo", "psuv", "asamblea nacional", "maduro", "machado", "gobierno", "diputado", "partido", "plataforma unitaria"],
  "Economía y Laboral": ["salario", "dólar", "dolar", "bcv", "inflación", "inflacion", "economía", "economia", "precio", "bono", "sindicato", "trabajadores", "petróleo", "petroleo", "pdvsa", "empresa", "pensión", "comercio"],
  "Sucesos y Seguridad": ["asesinado", "homicidio", "robo", "delincuente", "policía", "policia", "cicpc", "gnb", "lluvias", "inundación", "deslave", "accidente", "sucesos", "incendio", "muerto", "fallecido", "oleaje"],
};

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ",
  uuml: "ü", laquo: "«", raquo: "»", hellip: "…", ndash: "–", mdash: "—",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", iexcl: "¡", iquest: "¿",
};

function decodeEntities(str: string): string {
  return str.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code] ?? m;
  });
}

function cleanText(raw: string): string {
  let s = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  s = decodeEntities(s); // puede revelar HTML codificado
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  return s.replace(/\s+/g, " ").trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
}

export function detectRegion(text: string, fallback = "Nacional"): string {
  const t = ` ${text.toLowerCase()} `;
  for (const [region, words] of Object.entries(REGION_KEYWORDS)) {
    if (words.some((w) => new RegExp(`[^\\p{L}]${w}[^\\p{L}]`, "u").test(t))) return region;
  }
  return fallback;
}

export function detectCategory(text: string): string {
  const t = text.toLowerCase();
  let best = "General";
  let bestScore = 0;
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = words.filter((w) => t.includes(w)).length;
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }
  return best;
}

type ParseOptions = { sourceName?: string; sourceType: string; region?: string; origin: string };

export function parseRss(xml: string, opts: ParseOptions): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    let title = cleanText(tag(block, "title"));
    const link = cleanText(tag(block, "link"));
    if (!title || !/^https?:\/\//.test(link)) continue;

    // Google News incluye el medio en <source> y lo añade al final del título
    let sourceName = opts.sourceName;
    if (!sourceName) {
      sourceName = cleanText(tag(block, "source")) || "Google News";
      const suffix = ` - ${sourceName}`;
      if (title.endsWith(suffix)) title = title.slice(0, -suffix.length);
    }

    let snippet = cleanText(tag(block, "description"));
    if (snippet.startsWith(title)) snippet = "";
    if (snippet.length > 280) snippet = snippet.slice(0, 277).trimEnd() + "…";

    const date = new Date(cleanText(tag(block, "pubDate")) || Date.now());
    const publishedAt = Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 3600_000 ? new Date() : date;

    const text = `${title} ${snippet} ${cleanText(tag(block, "category"))}`;
    items.push({
      title: title.slice(0, 500),
      snippet,
      sourceName,
      sourceType: opts.sourceType,
      sourceUrl: link,
      region: detectRegion(text, opts.region),
      category: detectCategory(text),
      origin: opts.origin,
      publishedAt,
    });
  }
  return items;
}

async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; VzlaMonitoreo/1.0; +https://mediavenezuela.netlify.app)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function saveNews(items: NewsItem[]): Promise<number> {
  if (items.length === 0) return 0;
  const unique = [...new Map(items.map((i) => [i.sourceUrl, i])).values()];
  const inserted = await db
    .insert(news)
    .values(unique)
    .onConflictDoNothing({ target: news.sourceUrl })
    .returning({ id: news.id });
  return inserted.length;
}

// Descarga todas las fuentes RSS en paralelo y guarda las noticias nuevas
export async function refreshAllSources() {
  const results = await Promise.allSettled(
    RSS_SOURCES.map(async (src) => {
      const xml = await fetchXml(src.url);
      return parseRss(xml, { sourceName: src.name, sourceType: src.type, region: src.region, origin: "rss" }).slice(0, 25);
    }),
  );

  const items: NewsItem[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") items.push(...r.value);
    else failed.push(RSS_SOURCES[i].name);
  });

  const added = await saveNews(items);
  const sourcesOk = RSS_SOURCES.length - failed.length;
  await db.insert(newsRefreshes).values({ added, sourcesOk, sourcesFailed: failed.join(", ") });
  return { added, fetched: items.length, sources: sourcesOk, failed };
}

// Búsqueda en la web vía Google News (cobertura de cientos de medios)
export async function searchWeb(query: string): Promise<NewsItem[]> {
  const q = encodeURIComponent(`${query} Venezuela`);
  const xml = await fetchXml(`https://news.google.com/rss/search?q=${q}&hl=es-419&gl=VE&ceid=VE:es-419`);
  return parseRss(xml, { sourceType: "Búsqueda web", origin: "web" }).slice(0, 40);
}

export async function lastRefresh(): Promise<Date | null> {
  const [row] = await db.select({ ranAt: newsRefreshes.ranAt }).from(newsRefreshes).orderBy(desc(newsRefreshes.ranAt)).limit(1);
  return row ? new Date(row.ranAt) : null;
}

export function toClient(row: typeof news.$inferSelect) {
  return {
    id: `db_${row.id}`,
    title: row.title,
    snippet: row.snippet,
    sourceName: row.sourceName,
    sourceType: row.sourceType,
    sourceUrl: row.sourceUrl,
    region: row.region,
    category: row.category,
    origin: row.origin,
    publishedAt: new Date(row.publishedAt).toISOString(),
  };
}
