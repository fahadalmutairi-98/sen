"use client";

import { io, Socket } from "socket.io-client";
import type { ClientEvent, ServerEvent } from "@seen/shared";
import { API } from "./api";

let socket: Socket | null = null;

export function getSocket() {
  if (typeof window === "undefined") return null;
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL ?? API, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function connectSocket(handlers: {
  onEvent: (e: ServerEvent) => void;
  onSession?: (s: { playerId: string; roomCode: string }) => void;
}) {
  const s = getSocket();
  if (!s) return null;
  s.off("event");
  s.off("session");
  s.on("event", handlers.onEvent);
  if (handlers.onSession) s.on("session", handlers.onSession);
  if (!s.connected) s.connect();
  return s;
}

export function emitEvent(event: ClientEvent) {
  getSocket()?.emit("event", event);
}
