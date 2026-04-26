import { useCallback, useEffect, useState } from "react";
import {
  addFavoritePlace,
  getCurrentUser,
  loadFavoritePlaceIds,
  removeFavoritePlace,
  sendMagicLink,
  signInWithOAuthProvider,
  signOut,
  subscribeToAuthChanges,
} from "../services/favoritesAuthService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import type { Provider } from "@supabase/supabase-js";
import type { AppUser, Place } from "../types";

type UseFavoritesAuthResult = {
  user: AppUser | null;
  favoritePlaceIds: Set<number>;
  pendingFavoritePlaceIds: Set<number>;
  isAuthDialogOpen: boolean;
  isSendingMagicLink: boolean;
  pendingAuthProviderId: string | null;
  authMessage: string | null;
  isSupabaseConfigured: boolean;
  setIsAuthDialogOpen: (isOpen: boolean) => void;
  sendSignInMagicLink: (email: string) => Promise<void>;
  signInWithProvider: (providerId: string, provider: Provider, scopes: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  toggleFavorite: (place: Place) => Promise<void>;
};

function getAuthRedirectUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}

function getAuthErrorMessage(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const errorDescription =
    searchParams.get("error_description") ?? hashParams.get("error_description");

  if (!errorDescription) {
    return null;
  }

  if (errorDescription.includes("Error getting user email from external provider")) {
    return "Яндекс вернул профиль без email в формате, который ожидает Supabase. Включите Allow users without email у провайдера Yandex в Supabase.";
  }

  return "Не удалось завершить вход. Попробуйте еще раз.";
}

function clearAuthErrorFromUrl(): void {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const hasAuthError = searchParams.has("error") || hashParams.has("error");

  if (!hasAuthError) {
    return;
  }

  const cleanUrl = new URL(window.location.href);
  cleanUrl.search = "";
  cleanUrl.hash = "";
  window.history.replaceState({}, "", cleanUrl);
}

export function useFavoritesAuth(): UseFavoritesAuthResult {
  const [user, setUser] = useState<AppUser | null>(null);
  const [favoritePlaceIds, setFavoritePlaceIds] = useState<Set<number>>(() => new Set());
  const [pendingFavoritePlaceIds, setPendingFavoritePlaceIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [pendingAuthProviderId, setPendingAuthProviderId] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    const authErrorMessage = getAuthErrorMessage();

    if (!authErrorMessage) {
      return;
    }

    setIsAuthDialogOpen(true);
    setAuthMessage(authErrorMessage);
    clearAuthErrorFromUrl();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    void getCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuthMessage("Не удалось проверить вход. Попробуйте позже.");
        }
      });

    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        setIsAuthDialogOpen(false);
        setAuthMessage(null);
      } else {
        setFavoritePlaceIds(new Set());
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      setFavoritePlaceIds(new Set());
      return;
    }

    let isCancelled = false;
    setFavoritePlaceIds(new Set());

    void loadFavoritePlaceIds(user.id)
      .then((placeIds) => {
        if (!isCancelled) {
          setFavoritePlaceIds(new Set(placeIds));
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setFavoritePlaceIds(new Set());
          setAuthMessage("Не удалось загрузить избранное.");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const sendSignInMagicLink = useCallback(async (email: string) => {
    const trimmedEmail = email.trim();

    if (!isSupabaseConfigured) {
      setAuthMessage("Вход пока не настроен.");
      return;
    }

    if (!trimmedEmail) {
      setAuthMessage("Введите email для входа.");
      return;
    }

    setIsSendingMagicLink(true);
    setAuthMessage(null);

    try {
      await sendMagicLink(trimmedEmail, getAuthRedirectUrl());
      setAuthMessage("Проверьте почту: ссылка для входа уже там.");
    } catch {
      setAuthMessage("Не удалось отправить ссылку. Проверьте email.");
    } finally {
      setIsSendingMagicLink(false);
    }
  }, []);

  const signInWithProvider = useCallback(
    async (providerId: string, provider: Provider, scopes: string) => {
      if (!isSupabaseConfigured) {
        setAuthMessage("Вход пока не настроен.");
        return;
      }

      setPendingAuthProviderId(providerId);
      setAuthMessage(null);

      try {
        await signInWithOAuthProvider(provider, getAuthRedirectUrl(), scopes);
      } catch {
        setAuthMessage("Не удалось открыть вход. Попробуйте позже.");
      } finally {
        setPendingAuthProviderId(null);
      }
    },
    [],
  );

  const signOutUser = useCallback(async () => {
    try {
      await signOut();
    } catch {
      setAuthMessage("Не удалось выйти. Попробуйте еще раз.");
    }
  }, []);

  const toggleFavorite = useCallback(
    async (place: Place) => {
      if (!isSupabaseConfigured) {
        setIsAuthDialogOpen(true);
        setAuthMessage("Вход пока не настроен.");
        return;
      }

      if (!user) {
        setIsAuthDialogOpen(true);
        setAuthMessage("Войдите, чтобы сохранять места.");
        return;
      }

      const wasFavorite = favoritePlaceIds.has(place.id);

      setPendingFavoritePlaceIds((current) => new Set(current).add(place.id));
      setFavoritePlaceIds((current) => {
        const next = new Set(current);

        if (wasFavorite) {
          next.delete(place.id);
        } else {
          next.add(place.id);
        }

        return next;
      });

      try {
        if (wasFavorite) {
          await removeFavoritePlace(user.id, place.id);
        } else {
          await addFavoritePlace(user.id, place.id);
        }

        setAuthMessage(null);
      } catch {
        setFavoritePlaceIds((current) => {
          const next = new Set(current);

          if (wasFavorite) {
            next.add(place.id);
          } else {
            next.delete(place.id);
          }

          return next;
        });
        setAuthMessage("Не удалось обновить избранное.");
      } finally {
        setPendingFavoritePlaceIds((current) => {
          const next = new Set(current);
          next.delete(place.id);
          return next;
        });
      }
    },
    [favoritePlaceIds, user],
  );

  return {
    user,
    favoritePlaceIds,
    pendingFavoritePlaceIds,
    isAuthDialogOpen,
    isSendingMagicLink,
    pendingAuthProviderId,
    authMessage,
    isSupabaseConfigured,
    setIsAuthDialogOpen,
    sendSignInMagicLink,
    signInWithProvider,
    signOutUser,
    toggleFavorite,
  };
}
