import { useState } from "react";
import { MapView } from "./components/MapView";
import { PlacePanel } from "./components/PlacePanel";
import { loadPlaces } from "./data";
import type { Place } from "./types";

const places = loadPlaces();

export default function App() {
  const [activePlace, setActivePlace] = useState<Place | null>(null);

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
