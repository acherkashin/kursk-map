import { useEffect, useState } from "react";
import { MapView } from "./components/MapView";
import { PlacePanel } from "./components/PlacePanel";
import { loadPlaces } from "./data";
import type { Place } from "./types";

const places = loadPlaces();

type AppTestWindow = Window & {
  __KURSK_MAP_TEST_GET_PLACE_IDS__?: () => number[];
  __KURSK_MAP_TEST_SELECT_PLACE__?: (placeId: number) => boolean;
};

export default function App() {
  const [activePlace, setActivePlace] = useState<Place | null>(null);

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
      <main className="experience-layout">
        <section className="map-stage">
          <div className="hero-card">
            <span className="eyebrow">Куда поехать на выходных</span>
            <h1>Карта лучших мест Курской области</h1>
            <p>
              265 идей для поездки, прогулки или короткого культурного маршрута. Выбирайте точку на
              карте и открывайте карточку места.
            </p>
          </div>

          <div className="map-frame">
            <MapView places={places} activePlace={activePlace} onSelectPlace={setActivePlace} />
          </div>
        </section>

        <PlacePanel place={activePlace} onClose={() => setActivePlace(null)} />
      </main>
    </div>
  );
}
