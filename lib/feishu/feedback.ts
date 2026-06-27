import { getTenantAccessToken } from "@/lib/feishu/client";
import type { FeedbackRequestBody } from "@/types/feedback";

const FEISHU_API_BASE = "https://open.feishu.cn/open-apis";

function getBitableConfig(): { baseId: string; tableId: string } {
  const baseId = process.env.FEISHU_BASE_ID;
  const tableId = process.env.FEISHU_TABLE_ID;

  if (!baseId || !tableId) {
    throw new Error("飞书多维表格未配置：FEISHU_BASE_ID / FEISHU_TABLE_ID");
  }

  return { baseId, tableId };
}

interface FeishuApiResponse {
  code: number;
  msg: string;
}

export async function createFeedbackRecord(
  data: FeedbackRequestBody
): Promise<void> {
  const token = await getTenantAccessToken();
  const { baseId, tableId } = getBitableConfig();

  const response = await fetch(
    `${FEISHU_API_BASE}/bitable/v1/apps/${baseId}/tables/${tableId}/records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          session_id: data.session_id,
          decision_topic: data.decision_topic,
          feedback_type: data.feedback_type,
          feedback_reason: data.feedback_reason,
          report_stay_seconds: data.report_stay_seconds,
          downloaded_image: data.downloaded_image,
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`飞书写表 HTTP 错误 (${response.status}): ${text}`);
  }

  const json = (await response.json()) as FeishuApiResponse;

  if (json.code !== 0) {
    throw new Error(`飞书写表失败: ${json.msg || "未知错误"}`);
  }
}
