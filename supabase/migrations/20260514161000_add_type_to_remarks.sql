-- Migration to add 'type' to remarks for the Activity Feed & Comments feature
ALTER TABLE "public"."remarks" 
ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'comment';

-- Update existing rows to be type 'comment'
UPDATE "public"."remarks" SET "type" = 'comment' WHERE "type" IS NULL;

-- If we ever need to store JSON metadata (like tagged user IDs), this is useful too:
ALTER TABLE "public"."remarks" 
ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb;
