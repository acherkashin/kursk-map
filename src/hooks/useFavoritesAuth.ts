import { useCallback, useEffect, useState } from "react";
import {
  addFavoritePlace,
  getCurrentUser,
  loadFavoritePlaceIds,
  removeFavoritePlace,
  sendMagicLink,
  signOut,
  subscribeToAuthChanges,
} from "../services/favoritesAuthService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import type { AppUser, Place } from "../types";

type UseFavoritesAuthResult = {
  user: AppUser | null;
  favoritePlaceIds: Set<number>;
  pendingFavoritePlaceIds: Set<number>;
  isAuthControlOpen: boolean;
  isSendingMagicLink: boolean;
  authMessage: string | null;
  isSupabaseConfigured: boolean;
  setIsAuthControlOpen: (isOpen: boolean) => void;
  sendSignInMagicLink: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  toggleFavorite: (place: Place) => Promise<void>;
};

function getMagicLinkRedirectUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}

export function useFavoritesAuth(): UseFavoritesAuthResult {
  const [user, setUser] = useState<AppUser | null>(null);
  const [favoritePlaceIds, setFavoritePlaceIds] = useState<Set<number>>(() => new Set());
  const [pendingFavoritePlaceIds, setPendingFavoritePlaceIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [isAuthControlOpen, setIsAuthControlOpen] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

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
        setIsAuthControlOpen(false);
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
      await sendMagicLink(trimmedEmail, getMagicLinkRedirectUrl());
      setAuthMessage("Проверьте почту: ссылка для входа уже там.");
    } catch {
      setAuthMessage("Не удалось отправить ссылку. Проверьте email.");
    } finally {
      setIsSendingMagicLink(false);
    }
  }, []);

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
        setIsAuthControlOpen(true);
        setAuthMessage("Вход пока не настроен.");
        return;
      }

      if (!user) {
        setIsAuthControlOpen(true);
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
    isAuthControlOpen,
    isSendingMagicLink,
    authMessage,
    isSupabaseConfigured,
    setIsAuthControlOpen,
    sendSignInMagicLink,
    signOutUser,
    toggleFavorite,
  };
}
