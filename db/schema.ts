import { pgTable, serial, text, timestamp, index, integer } from "drizzle-orm/pg-core";

export const news = pgTable(
  "news",
  {
    id: serial().primaryKey(),
    title: text().notNull(),
    snippet: text().notNull().default(""),
    sourceName: text("source_name").notNull(),
    sourceType: text("source_type").notNull().default("Medio"),
    sourceUrl: text("source_url").notNull().unique(),
    region: text().notNull().default("Nacional"),
    category: text().notNull().default("General"),
    origin: text().notNull().default("rss"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("news_published_at_idx").on(t.publishedAt),
    index("news_region_idx").on(t.region),
  ],
);

export const newsRefreshes = pgTable("news_refreshes", {
  id: serial().primaryKey(),
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
  added: integer().notNull().default(0),
  sourcesOk: integer("sources_ok").notNull().default(0),
  sourcesFailed: text("sources_failed").notNull().default(""),
});
