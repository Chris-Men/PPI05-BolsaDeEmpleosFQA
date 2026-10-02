-- CreateTable
CREATE TABLE "email_outbox" (
    "id" UUID NOT NULL,
    "event_key" VARCHAR(160) NOT NULL,
    "kind" VARCHAR(50) NOT NULL,
    "recipient_email" VARCHAR(255) NOT NULL,
    "encrypted_payload" TEXT NOT NULL,
    "iv" VARCHAR(24) NOT NULL,
    "auth_tag" VARCHAR(24) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_until" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "discarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_outbox_event_key_key" ON "email_outbox"("event_key");

-- CreateIndex
CREATE INDEX "email_outbox_sent_at_discarded_at_next_attempt_at_locked_un_idx" ON "email_outbox"("sent_at", "discarded_at", "next_attempt_at", "locked_until");
