type YandexUserInfo = {
  id?: string;
  login?: string;
  default_email?: string;
  emails?: string[];
  real_name?: string;
  display_name?: string;
  default_avatar_id?: string;
  is_avatar_empty?: boolean;
};

type SupabaseUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  picture?: string;
};

const YANDEX_USERINFO_URL = "https://login.yandex.ru/info?format=json";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function getBearerToken(request: Request): string | null {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader) {
    return null;
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function getPrimaryEmail(userInfo: YandexUserInfo): string | undefined {
  return userInfo.default_email ?? userInfo.emails?.find(Boolean);
}

function getDisplayName(userInfo: YandexUserInfo): string | undefined {
  return userInfo.real_name ?? userInfo.display_name ?? userInfo.login;
}

function getPictureUrl(userInfo: YandexUserInfo): string | undefined {
  if (!userInfo.default_avatar_id || userInfo.is_avatar_empty) {
    return undefined;
  }

  return `https://avatars.yandex.net/get-yapic/${userInfo.default_avatar_id}/islands-200`;
}

function mapYandexUserInfo(userInfo: YandexUserInfo): SupabaseUserInfo | null {
  if (!userInfo.id) {
    return null;
  }

  const email = getPrimaryEmail(userInfo);
  const name = getDisplayName(userInfo);
  const picture = getPictureUrl(userInfo);

  return {
    sub: userInfo.id,
    ...(email ? { email, email_verified: true } : {}),
    ...(name ? { name } : {}),
    ...(userInfo.login ? { preferred_username: userInfo.login } : {}),
    ...(picture ? { picture } : {}),
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const token = getBearerToken(request);

  if (!token) {
    return jsonResponse({ error: "missing_bearer_token" }, 401);
  }

  const yandexResponse = await fetch(YANDEX_USERINFO_URL, {
    headers: {
      authorization: `OAuth ${token}`,
      accept: "application/json",
    },
  });

  if (!yandexResponse.ok) {
    return jsonResponse({ error: "yandex_userinfo_failed" }, 502);
  }

  const yandexUserInfo = (await yandexResponse.json()) as YandexUserInfo;
  const supabaseUserInfo = mapYandexUserInfo(yandexUserInfo);

  if (!supabaseUserInfo) {
    return jsonResponse({ error: "missing_provider_id" }, 502);
  }

  return jsonResponse(supabaseUserInfo);
});
