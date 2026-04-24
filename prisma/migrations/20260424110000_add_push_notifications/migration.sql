CREATE TABLE "PushSubscription" (
  "id"        TEXT NOT NULL,
  "userId"    UUID NOT NULL,
  "endpoint"  TEXT NOT NULL,
  "auth"      TEXT NOT NULL,
  "p256dh"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id"     TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "title"  TEXT NOT NULL,
  "body"   TEXT NOT NULL,
  "url"    TEXT,
  "readAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_userId_sentAt_idx" ON "Notification"("userId", "sentAt");
