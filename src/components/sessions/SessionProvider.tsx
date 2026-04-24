"use client";

import { useEffect } from "react";
import { useSessionStore } from "@/store/useSessionStore";

interface ServerActiveSession {
  id: string;
  name: string;
  status: "ACTIVE" | "CLOSED";
  startedAt: Date | string;
}

interface Props {
  initialSession: ServerActiveSession | null;
  children: React.ReactNode;
}

export function SessionProvider({ initialSession, children }: Props) {
  useEffect(() => {
    if (!initialSession) {
      useSessionStore.setState({ activeSession: null, isLoading: false });
      return;
    }
    useSessionStore.setState({
      activeSession: {
        id: initialSession.id,
        name: initialSession.name,
        status: initialSession.status,
        outcome: null,
        startedAt: typeof initialSession.startedAt === "string"
          ? initialSession.startedAt
          : initialSession.startedAt.toISOString(),
        closedAt: null,
        notes: null,
        _count: { applications: 0 },
      },
      isLoading: false,
    });
  }, [initialSession]);

  return <>{children}</>;
}
