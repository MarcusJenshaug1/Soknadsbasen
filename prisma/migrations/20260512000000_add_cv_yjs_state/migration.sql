-- CreateTable for Yjs binary CRDT state per CV
-- Used by Hocuspocus collab-server. Non-collab consumers (PDF, AI, share-
-- token viewer) keep reading the JSON snapshot in UserData.resumeData; the
-- two stay eventually-consistent via Hocuspocus.onStoreDocument writing
-- both in the same transaction.

CREATE TABLE "cv_yjs_state" (
    "cv_id" UUID NOT NULL,
    "ydoc" BYTEA NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cv_yjs_state_pkey" PRIMARY KEY ("cv_id")
);

-- Rollback note: `DROP TABLE "cv_yjs_state";` is reversible — no data
-- references it externally. Yjs state can be reconstructed from
-- UserData.resumeData snapshot at any time via the mapper.
