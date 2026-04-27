# Настройка входа через Yandex ID в Supabase с нуля

Этот документ описывает, как подключить вход через Yandex ID к приложению, которое использует Supabase Auth. Инструкция рассчитана на человека без опыта работы с Supabase.

Полезные ссылки:

- [Supabase Custom OAuth/OIDC Providers](https://supabase.com/docs/guides/auth/custom-oauth-providers)
- [Supabase Edge Functions: Deploy](https://supabase.com/docs/guides/functions/deploy)
- [Supabase Edge Functions: Function Configuration](https://supabase.com/docs/guides/functions/function-configuration)
- [Yandex OAuth Control Panel](https://yandex.com/dev/id/doc/en/oauth-cabinet)
- [Yandex OAuth app registration](https://yandex.com/dev/id/doc/en/register-client)
- [Yandex user information API](https://yandex.com/dev/id/doc/en/user-information)

## Что мы настраиваем

Пользователь входит в приложение через Yandex ID, но React-приложение не работает с Yandex напрямую.

Общий поток:

```text
React app
-> Supabase Auth
-> Yandex OAuth
-> Supabase Auth callback
-> Supabase Edge Function
-> Yandex /info API
-> Supabase Auth создает сессию
-> React app получает авторизованного пользователя
```

Edge Function нужна потому, что Yandex возвращает профиль пользователя в формате, который напрямую не подходит Supabase Custom OAuth Provider.

## 1. Создать приложение в Yandex OAuth

Откройте [Yandex OAuth](https://oauth.yandex.com/) и создайте новое приложение.

Укажите тип приложения:

```text
Web service
```

В поле `Redirect URI for web services` укажите callback URL Supabase Auth:

```text
https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
```

Для текущего проекта:

```text
https://aipsfkbssbjrgboyyosd.supabase.co/auth/v1/callback
```

В разрешениях Yandex ID API включите:

```text
- Access to email address
- Access to username, first name and surname, gender
```

Опционально можно включить:

```text
- Access to user avatar
```

После создания приложения скопируйте:

```text
Client ID
Client secret
```

`Client secret` нельзя публиковать или хранить в frontend-коде. Если секрет попал в публичное место, его нужно перевыпустить в Yandex OAuth.

## 2. Создать Custom Auth Provider в Supabase

Откройте Supabase Dashboard:

```text
Authentication -> Providers -> Add provider -> Custom Auth Provider
```

Выберите:

```text
Manual configuration
```

Не используйте Auto-discovery, потому что Yandex ID в этом сценарии используется как OAuth2 provider, а не как полностью совместимый OIDC provider для Supabase.

Заполните поля:

```text
Provider Identifier:
custom:yandex
```

Если интерфейс Supabase уже показывает префикс `custom:`, введите только:

```text
yandex
```

```text
Display Name:
Yandex
```

OAuth endpoints:

```text
Authorization URL:
https://oauth.yandex.com/authorize

Token URL:
https://oauth.yandex.com/token

Userinfo URL:
https://<your-project-ref>.functions.supabase.co/yandex-userinfo
```

Для текущего проекта:

```text
https://aipsfkbssbjrgboyyosd.functions.supabase.co/yandex-userinfo
```

Client credentials:

```text
Client ID:
<Yandex Client ID>

Client Secret:
<Yandex Client secret>
```

Scopes:

```text
login:info, login:email
```

Если нужен avatar:

```text
login:info, login:email, login:avatar
```

Рекомендуемая настройка:

```text
Allow users without email:
false / off
```

JWKS URI:

```text
Оставьте пустым, если Supabase разрешает.
```

Если интерфейс Supabase требует значение, это поле не решает основную проблему интеграции. Ключевая настройка для Yandex в этом проекте — корректный `Userinfo URL`, который ведет на Edge Function.

## 3. Почему нужна Edge Function

Supabase Custom OAuth Provider ожидает, что Userinfo endpoint вернет профиль в стандартном виде:

```json
{
  "sub": "123456",
  "email": "user@yandex.ru",
  "name": "User Name",
  "picture": "https://..."
}
```

Yandex `/info` возвращает другой формат:

```json
{
  "id": "123456",
  "login": "user",
  "default_email": "user@yandex.ru",
  "emails": ["user@yandex.ru"],
  "real_name": "User Name"
}
```

Из-за этого без адаптера Supabase может вернуть ошибки:

```text
error missing provider id
Error getting user email from external provider
```

Edge Function решает две задачи:

1. Меняет схему авторизации в header.
2. Преобразует поля профиля Yandex в поля, которые ожидает Supabase.

## 4. Как работает Edge Function

Supabase Auth вызывает Edge Function так:

```text
GET /yandex-userinfo
Authorization: Bearer <yandex_access_token>
```

Yandex API ожидает тот же токен в другом формате:

```text
Authorization: OAuth <yandex_access_token>
```

Поэтому Edge Function делает запрос:

```text
GET https://login.yandex.ru/info?format=json
Authorization: OAuth <yandex_access_token>
```

После ответа от Yandex функция преобразует поля.

Соответствие полей:

| Поле Yandex `/info` | Поле Supabase userinfo |
| --- | --- |
| `id` | `sub` |
| `default_email` | `email` |
| первый элемент `emails` | fallback для `email` |
| `real_name` | `name` |
| `display_name` | fallback для `name` |
| `login` | fallback для `name`, также `preferred_username` |
| `default_avatar_id` | URL для `picture` |

## 5. Файлы Edge Function

Функция находится здесь:

```text
supabase/functions/yandex-userinfo/index.ts
```

Основная логика:

```ts
const YANDEX_USERINFO_URL = "https://login.yandex.ru/info?format=json";
```

Функция:

1. Читает `Authorization: Bearer <token>` из запроса Supabase Auth.
2. Вызывает Yandex API с `Authorization: OAuth <token>`.
3. Получает профиль Yandex.
4. Возвращает Supabase-compatible JSON:

```ts
{
  sub: yandexUser.id,
  email: yandexUser.default_email ?? yandexUser.emails?.[0],
  name: yandexUser.real_name ?? yandexUser.display_name ?? yandexUser.login,
  preferred_username: yandexUser.login
}
```

Также нужен файл:

```text
supabase/config.toml
```

С настройкой:

```toml
[functions.yandex-userinfo]
verify_jwt = false
```

Это важно: Supabase Auth вызывает Edge Function с Yandex OAuth token, а не с Supabase JWT. Если `verify_jwt` оставить включенным, Supabase Edge Gateway отклонит запрос до выполнения функции.

## 6. Деплой Edge Function

Установите Supabase CLI:

```sh
npm install -D supabase
```

Войдите в Supabase CLI:

```sh
npx supabase login
```

Деплой:

```sh
npx supabase functions deploy yandex-userinfo \
  --project-ref <your-project-ref> \
  --no-verify-jwt
```

Для текущего проекта:

```sh
npx supabase functions deploy yandex-userinfo \
  --project-ref aipsfkbssbjrgboyyosd \
  --no-verify-jwt
```

Проверка, что функция доступна:

```sh
curl -i https://aipsfkbssbjrgboyyosd.functions.supabase.co/yandex-userinfo
```

Ожидаемый ответ без токена:

```text
401
{"error":"missing_bearer_token"}
```

Это нормальный ответ. Он означает, что функция опубликована и доступна, но для настоящего запроса нужен Yandex access token.

## 7. Код React-приложения

Приложение запускает OAuth flow через Supabase SDK:

```ts
await supabase.auth.signInWithOAuth({
  provider: "custom:yandex",
  options: {
    redirectTo: window.location.origin,
    scopes: "login:info login:email",
  },
});
```

Важно: React-приложение не вызывает Edge Function напрямую. Edge Function вызывает Supabase Auth на серверной стороне после того, как Yandex вернул OAuth code и Supabase обменял его на access token.

## 8. Финальный чеклист

Проверьте:

- В Yandex OAuth указан Supabase callback:
  `https://<project-ref>.supabase.co/auth/v1/callback`
- В Supabase provider identifier:
  `custom:yandex`
- В Supabase `Userinfo URL` указан URL Edge Function.
- Edge Function задеплоена с отключенной JWT verification.
- Scopes включают:
  `login:info, login:email`
- `Allow users without email` выключен.
- React-приложение вызывает:
  `provider: "custom:yandex"`

После этого вход через Yandex должен создавать или находить пользователя Supabase Auth и возвращать обычную Supabase session в приложение.
