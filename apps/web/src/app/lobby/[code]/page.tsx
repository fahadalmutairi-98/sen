"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Button, Card, Logo, Screen } from "@/components/ui";
import { connectSocket, emitEvent } from "@/lib/socket";
import type { RoomState } from "@seen/shared";
import Link from "next/link";

export default function LobbyPage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();
  const locale = useApp((s) => s.locale);
  const t = useT(locale);
  const [room, setRoom] = useState<RoomState | null>(null);

  useEffect(() => {
    connectSocket({
      onEvent: (e) => {
        if (e.type === "ROOM_STATE") setRoom(e.payload);
      },
    });
  }, []);

  function assign(playerId: string, teamId: "A" | "B") {
    emitEvent({ type: "TEAM_ASSIGN", payload: { playerId, teamId } });
  }

  return (
    <Screen>
      <header className="mb-6 flex items-center justify-between">
        <Link href="/">
          <Logo size="sm" />
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <div className="text-center">
          <div className="text-white/60">{t("roomCode")}</div>
          <div className="font-mono text-5xl font-black tracking-[0.3em] text-[var(--sj-gold)]">
            {code}
          </div>
        </div>

        <Card>
          <h2 className="mb-3 font-display text-xl">{t("players")}</h2>
          <ul className="space-y-2">
            {(room?.players ?? []).map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
              >
                <span>
                  {p.displayName}
                  {p.isHost && (
                    <span className="ms-2 text-xs text-[var(--sj-gold)]">host</span>
                  )}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="teamA"
                    className="!px-3 !py-1 !text-sm"
                    onClick={() => assign(p.id, "A")}
                  >
                    A
                  </Button>
                  <Button
                    variant="teamB"
                    className="!px-3 !py-1 !text-sm"
                    onClick={() => assign(p.id, "B")}
                  >
                    B
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Link href="/play">
          <Button variant="primary" className="w-full">
            {t("createGame")}
          </Button>
        </Link>
      </div>
    </Screen>
  );
}
