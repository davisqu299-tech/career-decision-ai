export {};

declare global {
  interface TurnstileRenderOptions {
    sitekey: string;
    size?: "normal" | "compact" | "invisible";
    callback?: (token: string) => void;
    "error-callback"?: () => void;
    "expired-callback"?: () => void;
  }

  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: TurnstileRenderOptions
      ) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}
