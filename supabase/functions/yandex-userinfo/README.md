# Yandex UserInfo Adapter

Supabase custom OAuth providers expect a standards-shaped userinfo response with a `sub` field. Yandex ID returns `id`, `default_email`, and `emails`, and expects the access token as `Authorization: OAuth <token>`. This Edge Function adapts Yandex's response for Supabase Auth.

See [AUTH_FLOW.md](./AUTH_FLOW.md) for the full login sequence diagram and field mapping.

See [YANDEX_AUTH_SETUP_RU.md](./YANDEX_AUTH_SETUP_RU.md) for a complete setup guide.

## Deploy

```sh
supabase functions deploy yandex-userinfo --no-verify-jwt
```

## Supabase Provider Settings

- Provider identifier: `custom:yandex`
- Authorization URL: `https://oauth.yandex.com/authorize`
- Token URL: `https://oauth.yandex.com/token`
- Userinfo URL: `https://<project-ref>.functions.supabase.co/yandex-userinfo`
- Scopes: `login:info, login:email`
- Allow users without email: off, once this adapter is deployed and configured

The function has JWT verification disabled in `supabase/config.toml` because Supabase Auth calls it with the Yandex OAuth access token, not with a Supabase project JWT.
