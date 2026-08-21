"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAiBusy, onAiBusyChange } from "@/lib/ai-busy";

const IDLE_MS = 5 * 60 * 1000;
const WARN_BEFORE_MS = 30 * 1000;
const ACTIVITY_STORAGE_KEY = "ki-glossar:last-activity";

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
] as const;

export function IdleLogout() {
  const router = useRouter();
  // Bewusst 0: Date.now() darf nicht im Render aufgerufen werden.
  const lastActivityRef = useRef(0);
  const loggingOutRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const markActive = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
    } catch {
      // bewusst ignoriert
    }
    setSecondsLeft(null);
  }, []);

  const logout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(
      `/login?error=${encodeURIComponent(
        "Du wurdest nach 5 Minuten ohne Aktivität automatisch abgemeldet. Bitte melde dich erneut an."
      )}`
    );
    router.refresh();
  }, [router]);

  useEffect(() => {
    let throttleUntil = 0;
    lastActivityRef.current = Date.now();

    const handleActivity = () => {
      const now = Date.now();
      if (now < throttleUntil) return;
      throttleUntil = now + 1000;
      markActive();
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== ACTIVITY_STORAGE_KEY || !event.newValue) return;
      const value = Number(event.newValue);
      if (Number.isFinite(value) && value > lastActivityRef.current) {
        lastActivityRef.current = value;
        setSecondsLeft(null);
      }
    };
    window.addEventListener("storage", handleStorage);

    const stopBusyListener = onAiBusyChange((busy) => {
      if (busy) markActive();
    });

    const interval = window.setInterval(() => {
      if (isAiBusy()) {
        lastActivityRef.current = Date.now();
        setSecondsLeft(null);
        return;
      }

      const idleFor = Date.now() - lastActivityRef.current;
      const remaining = IDLE_MS - idleFor;

      if (remaining <= 0) {
        setSecondsLeft(0);
        void logout();
      } else if (remaining <= WARN_BEFORE_MS) {
        setSecondsLeft(Math.ceil(remaining / 1000));
      } else {
        setSecondsLeft(null);
      }
    }, 1000);

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }
      window.removeEventListener("storage", handleStorage);
      stopBusyListener();
      window.clearInterval(interval);
    };
  }, [logout, markActive]);

  if (secondsLeft === null) return null;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Automatische Abmeldung steht bevor"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6 flex justify-center pointer-events-none"
    >
      <div className="panel p-5 max-w-md w-full pointer-events-auto shadow-lg">
        <p className="eyebrow mb-2" style={{ color: "var(--danger)" }}>
          Automatische Abmeldung
        </p>
        <p className="text-sm text-muted mb-4">
          Du wirst in <strong className="text-foreground">{secondsLeft}</strong>{" "}
          Sekunden wegen Inaktivität abgemeldet. Ein nicht gespeicherter Entwurf
          bleibt für diese Browsersitzung erhalten.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={markActive}
            className="btn btn-primary"
          >
            Angemeldet bleiben
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="btn btn-secondary"
          >
            Jetzt abmelden
          </button>
        </div>
      </div>
    </div>
  );
}
