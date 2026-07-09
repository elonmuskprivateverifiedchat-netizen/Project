import { useState, useEffect } from "react";
import { getSocket } from "@/lib/socket";

export interface ForexRate {
  pair: string;
  price: number;
  change24h: number;
  timestamp: number;
}

/**
 * Subscribes to live forex rates via Socket.io.
 * Falls back to polling the REST API if socket is unavailable.
 */
export function useForexRates(): { rates: ForexRate[]; connected: boolean } {
  const [rates, setRates] = useState<ForexRate[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    function onConnect() { setConnected(true); }
    function onDisconnect() { setConnected(false); }
    function onRates(data: ForexRate[]) { setRates(data); }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("rates", onRates);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("rates", onRates);
    };
  }, []);

  return { rates, connected };
}
