const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export class TurnstileVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TurnstileVerificationError";
  }
}

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

export async function verifyTurnstileToken(token: string): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new TurnstileVerificationError("Turnstile 未配置");
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new TurnstileVerificationError("Turnstile 验证请求失败");
  }

  const result = (await response.json()) as TurnstileVerifyResponse;
  if (!result.success) {
    throw new TurnstileVerificationError("验证失败，请稍后重试。");
  }
}
