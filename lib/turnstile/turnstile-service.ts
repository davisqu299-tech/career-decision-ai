import { getTurnstileSiteKey } from "@/lib/turnstile/config";

export { isTurnstileEnabled, getTurnstileSiteKey } from "@/lib/turnstile/config";
export { useInvisibleTurnstile } from "@/lib/turnstile/use-invisible-turnstile";
export {
  setPendingTurnstileToken,
  consumePendingTurnstileToken,
} from "@/lib/turnstile/pending-token-store";

export class TurnstileService {
  static isEnabled(): boolean {
    return Boolean(getTurnstileSiteKey());
  }
}
