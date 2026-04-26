import type { Provider } from "@supabase/supabase-js";

export type OAuthAuthMethod = {
  id: string;
  label: string;
  provider: Provider;
  scopes: string;
};

export const OAUTH_AUTH_METHODS: OAuthAuthMethod[] = [
  {
    id: "yandex",
    label: "Яндекс ID",
    provider: "custom:yandex",
    scopes: "login:info login:email",
  },
];
