"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { flushQueue, queueCount } from "@/lib/offlineQueue";

export default function PwaProvider() {
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    // Registrar service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    setOffline(!navigator.onLine);
    setPending(queueCount());

    async function tryFlush() {
      await flushQueue();
      setPending(queueCount());
    }

    function onOnline() {
      setOffline(false);
      tryFlush();
    }
    function onOffline() {
      setOffline(true);
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Intento inicial de vaciar la cola y chequeo periódico del contador
    if (navigator.onLine) tryFlush();
    const interval = setInterval(() => setPending(queueCount()), 5000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
  }, []);

  if (!offline && pending === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-[90] px-4">
      {offline ? (
        <div className="flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg">
          <WifiOff className="w-4 h-4" />
          Sin conexión — tus registros se guardarán y enviarán al recuperar señal
        </div>
      ) : pending > 0 ? (
        <div className="flex items-center gap-2 bg-construserv-orange text-white text-sm px-4 py-2.5 rounded-full shadow-lg">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Sincronizando {pending} registro(s) pendiente(s)...
        </div>
      ) : null}
    </div>
  );
}
