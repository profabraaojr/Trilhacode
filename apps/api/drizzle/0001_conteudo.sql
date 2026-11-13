ALTER TABLE "module" DROP CONSTRAINT "module_trackId_position_unique";--> statement-breakpoint
ALTER TABLE "unit" DROP CONSTRAINT "unit_moduleId_position_unique";--> statement-breakpoint
ALTER TABLE "module" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "track" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "unit" ADD COLUMN "level" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "unit" ADD COLUMN "duration_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "unit" ADD COLUMN "objectives" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "unit" ADD COLUMN "requires" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "unit" ADD COLUMN "content" jsonb;--> statement-breakpoint
ALTER TABLE "unit" ADD COLUMN "answer_key" jsonb;--> statement-breakpoint
CREATE INDEX "module_track_id_index" ON "module" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "unit_module_id_index" ON "unit" USING btree ("module_id");