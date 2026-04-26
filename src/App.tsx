import { useEffect, useMemo, useState } from "react";
import { BrandCard } from "./components/BrandCard";
import { MapView } from "./components/MapView";
import { PlacePanel } from "./components/PlacePanel";
import { loadPlaces } from "./data";
import { useFavoritesAuth } from "./hooks/useFavoritesAuth";
import { filterPlaces } from "./placeFilters";
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
  const {
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
  } = useFavoritesAuth();
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
          <BrandCard
            user={user}
            isAuthDialogOpen={isAuthDialogOpen}
            isSupabaseConfigured={isSupabaseConfigured}
            isSendingMagicLink={isSendingMagicLink}
            pendingAuthProviderId={pendingAuthProviderId}
            authMessage={authMessage}
            onAuthDialogOpenChange={setIsAuthDialogOpen}
            onSendMagicLink={sendSignInMagicLink}
            onSignInWithProvider={signInWithProvider}
            onSignOut={signOutUser}
          />

          <label className="search-card">
            <input
              type="search"
              value={searchInputValue}
              onChange={(event) => setSearchInputValue(event.target.value)}
              placeholder="Найти место, улицу или район..."
              aria-label="Поиск мест"
            />
          </label>
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
          onToggleFavorite={toggleFavorite}
          onClose={() => setActivePlace(null)}
        />
      </main>
    </div>
  );
}
