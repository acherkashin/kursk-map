# Yandex Login Flow

This app uses Supabase Auth as the session layer and Yandex ID as a custom OAuth provider. The `yandex-userinfo` Edge Function adapts Yandex's user profile response into the shape Supabase expects.

```mermaid
sequenceDiagram
  participant User as User
  participant App as React App
  participant SupabaseJS as Supabase JS
  participant SupabaseAuth as Supabase Auth
  participant Yandex as Yandex OAuth
  participant EdgeFn as Edge Function<br/>yandex-userinfo
  participant YandexAPI as Yandex API<br/>/info
  participant DB as Supabase DB

  User->>App: Clicks "Войти через Яндекс ID"
  App->>SupabaseJS: signInWithOAuth({ provider: "custom:yandex" })
  SupabaseJS->>SupabaseAuth: Start OAuth flow
  SupabaseAuth->>Yandex: Redirect to authorize URL<br/>scopes: login:info login:email
  User->>Yandex: Signs in and grants access
  Yandex->>SupabaseAuth: Redirects to callback with code
  SupabaseAuth->>Yandex: Exchanges code for access token
  Yandex-->>SupabaseAuth: Access token

  SupabaseAuth->>EdgeFn: GET /yandex-userinfo<br/>Authorization: Bearer {yandex_access_token}
  EdgeFn->>YandexAPI: GET /info?format=json<br/>Authorization: OAuth {yandex_access_token}
  YandexAPI-->>EdgeFn: Yandex user profile JSON

  EdgeFn->>EdgeFn: Map Yandex fields to Supabase fields
  EdgeFn-->>SupabaseAuth: Supabase-compatible userinfo JSON

  SupabaseAuth->>SupabaseAuth: Create or match auth user
  SupabaseAuth->>App: Redirect back to app with session
  App->>SupabaseJS: getSession / auth state change
  SupabaseJS-->>App: Authenticated user
  App->>DB: Load favorite_places for user.id
  DB-->>App: Favorite place IDs
```

## Property Mapping

| Yandex `/info` field | Supabase userinfo field |
| --- | --- |
| `id` | `sub` |
| `default_email` | `email` |
| first item from `emails` | fallback `email` |
| `real_name` | `name` |
| `display_name` | fallback `name` |
| `login` | fallback `name`, also `preferred_username` |
| `default_avatar_id` | `picture` URL |

## Header Mapping

Supabase Auth calls the Edge Function with the Yandex access token as a bearer token:

```text
Authorization: Bearer <yandex_access_token>
```

Yandex expects the same token with the `OAuth` authorization scheme:

```text
Authorization: OAuth <yandex_access_token>
```

The adapter exists because Yandex returns fields like `id` and `default_email`, while Supabase custom OAuth expects a userinfo response with fields like `sub` and `email`.
