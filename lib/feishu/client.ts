const FEISHU_API_BASE = "https://open.feishu.cn/open-apis";
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

interface TokenCache {
  token: string;
  expireAt: number;
}

let tokenCache: TokenCache | null = null;

function getFeishuCredentials(): { appId: string; appSecret: string } {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("飞书凭证未配置：FEISHU_APP_ID / FEISHU_APP_SECRET");
  }

  return { appId, appSecret };
}

interface TenantAccessTokenResponse {
  code: number;
  msg: string;
  tenant_access_token?: string;
  expire?: number;
}

export async function getTenantAccessToken(): Promise<string> {
  const now = Date.now();

  if (tokenCache && tokenCache.expireAt > now) {
    return tokenCache.token;
  }

  const { appId, appSecret } = getFeishuCredentials();

  const response = await fetch(
    `${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    }
  );

  if (!response.ok) {
    throw new Error(`飞书 token 请求失败: HTTP ${response.status}`);
  }

  const json = (await response.json()) as TenantAccessTokenResponse;

  if (json.code !== 0 || !json.tenant_access_token) {
    throw new Error(`飞书 token 获取失败: ${json.msg || "未知错误"}`);
  }

  const expireSeconds = json.expire ?? 7200;
  tokenCache = {
    token: json.tenant_access_token,
    expireAt: now + expireSeconds * 1000 - TOKEN_REFRESH_BUFFER_MS,
  };

  return tokenCache.token;
}
