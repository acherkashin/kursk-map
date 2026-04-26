import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthControl } from "./components/AuthControl";
import { BrandCard } from "./components/BrandCard";
import { MapView } from "./components/MapView";
import { PlacePanel } from "./components/PlacePanel";
import { loadPlaces } from "./data";
import { filterPlaces } from "./placeFilters";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import type { Place } from "./types";

const places = loadPlaces();
export const SEARCH_DEBOUNCE_MS = 180;

type AppTestWindow = Window & {
  __KURSK_MAP_TEST_GET_PLACE_IDS__?: () => number[];
  __KURSK_MAP_TEST_SELECT_PLACE__?: (placeId: number) => boolean;
};

export default function App() {
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  const [searchInputValue, setSearchInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [favoritePlaceIds, setFavoritePlaceIds] = useState<Set<number>>(() => new Set());
  const [pendingFavoritePlaceIds, setPendingFavoritePlaceIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [isAuthControlOpen, setIsAuthControlOpen] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const filteredPlaces = useMemo(() => filterPlaces(places, searchQuery), [searchQuery]);
  const activePlaceIsFavorite = activePlace ? favoritePlaceIds.has(activePlace.id) : false;
  const isActivePlaceFavoritePending = activePlace
    ? pendingFavoritePlaceIds.has(activePlace.id)
    : false;

  useEffect(() => {
    if (searchInputValue === searchQuery) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchInputValue);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInputValue, searchQuery]);

  useEffect(() => {
    if (!activePlace) {
      return;
    }

    if (!filteredPlaces.some((place) => place.id === activePlace.id)) {
      setActivePlace(null);
    }
  }, [activePlace, filteredPlaces]);

  useEffect(() => {
    const shouldExposeTestApi = new URLSearchParams(window.location.search).get("e2e") === "1";

    if (!shouldExposeTestApi) {
      return;
    }

    const testWindow = window as AppTestWindow;

    testWindow.__KURSK_MAP_TEST_GET_PLACE_IDS__ = () => places.map(({ id }) => id);
    testWindow.__KURSK_MAP_TEST_SELECT_PLACE__ = (placeId) => {
      const nextPlace = places.find((place) => place.id === placeId);

      if (!nextPlace) {
        return false;
      }

      setActivePlace(nextPlace);
      return true;
    };

    return () => {
      delete testWindow.__KURSK_MAP_TEST_GET_PLACE_IDS__;
      delete testWindow.__KURSK_MAP_TEST_SELECT_PLACE__;
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          setAuthMessage("Не удалось проверить вход. Попробуйте позже.");
        }

        setUser(data.session?.user ?? null);
      })
      .catch(() => {
        if (isMounted) {
          setAuthMessage("Не удалось проверить вход. Попробуйте позже.");
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        setIsAuthControlOpen(false);
        setAuthMessage(null);
      } else {
        setFavoritePlaceIds(new Set());
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !user) {
      setFavoritePlaceIds(new Set());
      return;
    }

    let isCancelled = false;

    void supabase
      .from("favorite_places")
      .select("place_id")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (isCancelled) {
          return;
        }

        if (error) {
          setAuthMessage("Не удалось загрузить избранное.");
          return;
        }

        setFavoritePlaceIds(new Set(data.map(({ place_id }) => place_id)));
      });

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const handleSendMagicLink = useCallback(async (email: string) => {
    const trimmedEmail = email.trim();

    if (!supabase || !isSupabaseConfigured) {
      setAuthMessage("Вход пока не настроен.");
      return;
    }

    if (!trimmedEmail) {
      setAuthMessage("Введите email для входа.");
      return;
    }

    setIsSendingMagicLink(true);
    setAuthMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setIsSendingMagicLink(false);

    if (error) {
      setAuthMessage("Не удалось отправить ссылку. Проверьте email.");
      return;
    }

    setAuthMessage("Проверьте почту: ссылка для входа уже там.");
  }, []);

  const handleSignOut = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthMessage("Не удалось выйти. Попробуйте еще раз.");
    }
  }, []);

  const handleToggleFavorite = useCallback(
    async (place: Place) => {
      if (!supabase || !isSupabaseConfigured) {
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

      const { error } = wasFavorite
        ? await supabase
            .from("favorite_places")
            .delete()
            .eq("user_id", user.id)
            .eq("place_id", place.id)
        : await supabase.from("favorite_places").insert({
            user_id: user.id,
            place_id: place.id,
          });

      setPendingFavoritePlaceIds((current) => {
        const next = new Set(current);
        next.delete(place.id);
        return next;
      });

      if (!error) {
        setAuthMessage(null);
        return;
      }

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
    },
    [favoritePlaceIds, user],
  );

  return (
    <div className="app-shell">
      <main className={`experience-layout${activePlace ? " experience-layout--panel-open" : ""}`}>
        <section className="map-stage">
          <div className="map-frame">
            <MapView
              places={filteredPlaces}
              activePlace={activePlace}
              onSelectPlace={setActivePlace}
            />
          </div>
        </section>

        <section className="floating-controls" aria-label="Поиск и фильтры мест">
          <BrandCard />

          <label className="search-card">
            <input
              type="search"
              value={searchInputValue}
              onChange={(event) => setSearchInputValue(event.target.value)}
              placeholder="Найти место, улицу или район..."
              aria-label="Поиск мест"
            />
          </label>

          <AuthControl
            user={user}
            isConfigured={isSupabaseConfigured}
            isOpen={isAuthControlOpen}
            isSendingMagicLink={isSendingMagicLink}
            message={authMessage}
            onOpenChange={setIsAuthControlOpen}
            onSendMagicLink={handleSendMagicLink}
            onSignOut={handleSignOut}
          />
        </section>

        {filteredPlaces.length === 0 ? (
          <section className="empty-map-card" aria-live="polite">
            <span className="eyebrow">Ничего не найдено</span>
            <p>Попробуйте другой запрос или сбросьте фильтры, чтобы вернуть все места.</p>
          </section>
        ) : null}

        <PlacePanel
          place={activePlace}
          isFavorite={activePlaceIsFavorite}
          isFavoritePending={isActivePlaceFavoritePending}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => setActivePlace(null)}
        />
      </main>
    </div>
  );
}
