import { cookies } from "next/headers";
import { BROWSER_UUID_COOKIE_NAME } from "@/lib/visitor/constants";
import { isValidUuidV4 } from "@/lib/visitor/uuid";

export function resolveBrowserUuid(
  bodyUuid?: string,
  cookieUuid?: string | null
): string | null {
  if (cookieUuid && isValidUuidV4(cookieUuid)) {
    return cookieUuid;
  }

  if (bodyUuid && isValidUuidV4(bodyUuid)) {
    return bodyUuid;
  }

  return null;
}

export async function getBrowserUuidFromRequest(
  bodyUuid?: string
): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieUuid = cookieStore.get(BROWSER_UUID_COOKIE_NAME)?.value ?? null;
  return resolveBrowserUuid(bodyUuid, cookieUuid);
}
