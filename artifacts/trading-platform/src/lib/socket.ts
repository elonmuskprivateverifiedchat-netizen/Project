import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Connect to the same origin — Replit proxy routes socket.io to the API server.
    // In production, set VITE_API_WS_URL to the API server origin.
    const wsUrl = (import.meta.env.VITE_API_WS_URL as string | undefined) ?? window.location.origin;
    socket = io(wsUrl, {
      // Must match the server-side path — routed through /api/ by the proxy.
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
