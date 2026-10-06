CREATE TABLE "news" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"snippet" text DEFAULT '' NOT NULL,
	"source_name" text NOT NULL,
	"source_type" text DEFAULT 'Medio' NOT NULL,
	"source_url" text NOT NULL UNIQUE,
	"region" text DEFAULT 'Nacional' NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"origin" text DEFAULT 'rss' NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_refreshes" (
	"id" serial PRIMARY KEY,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added" integer DEFAULT 0 NOT NULL,
	"sources_ok" integer DEFAULT 0 NOT NULL,
	"sources_failed" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "news_published_at_idx" ON "news" ("published_at");--> statement-breakpoint
CREATE INDEX "news_region_idx" ON "news" ("region");