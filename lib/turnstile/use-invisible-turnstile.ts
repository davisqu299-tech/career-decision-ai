"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTurnstileSiteKey } from "@/lib/turnstile/config";

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile unavailable"));
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      window.onTurnstileLoad = () => resolve();
      return;
    }

    window.onTurnstileLoad = () => resolve();

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Turnstile script failed"));
    document.head.appendChild(script);
  });
}

export function useInvisibleTurnstile() {
  const siteKey = getTurnstileSiteKey();
  const enabled = Boolean(siteKey);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const resolveRef = useRef<((token: string) => void) | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);
  const [isReady, setIsReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled || !siteKey || !containerRef.current) {
      return;
    }

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) {
          return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          size: "invisible",
          callback: (token) => {
            resolveRef.current?.(token);
            resolveRef.current = null;
            rejectRef.current = null;
          },
          "error-callback": () => {
            rejectRef.current?.(new Error("Turnstile error"));
            resolveRef.current = null;
            rejectRef.current = null;
          },
          "expired-callback": () => {
            rejectRef.current?.(new Error("Turnstile expired"));
            resolveRef.current = null;
            rejectRef.current = null;
          },
        });

        setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setIsReady(false);
        }
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [enabled, siteKey]);

  const execute = useCallback((): Promise<string> => {
    if (!enabled) {
      return Promise.resolve("");
    }

    if (!isReady || !widgetIdRef.current || !window.turnstile) {
      return Promise.reject(new Error("Turnstile not ready"));
    }

    return new Promise((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;
      window.turnstile!.execute(widgetIdRef.current!);
    });
  }, [enabled, isReady]);

  const reset = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  return {
    enabled,
    isReady,
    execute,
    reset,
    containerRef,
  };
}
