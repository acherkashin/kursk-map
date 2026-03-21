import { useEffect, useRef } from "react";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import type { Place } from "../types";

type MapViewProps = {
  places: Place[];
  activePlace: Place | null;
  onSelectPlace: (place: Place) => void;
};

const KURSK_CENTER: [number, number] = [36.191112, 51.730361];
const INITIAL_ZOOM = 11.4;

export function MapView({ places, activePlace, onSelectPlace }: MapViewProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Array<{ marker: Marker; element: HTMLButtonElement; placeId: number }>>([]);

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapNodeRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: KURSK_CENTER,
      zoom: INITIAL_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-left");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    places.forEach((place) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "photo-marker";
      element.setAttribute("aria-label", `Открыть ${place.name}`);
      element.dataset.placeId = String(place.id);

      const image = document.createElement("img");
      image.src = place.thumbnailUrl;
      image.alt = place.name;
      image.loading = "lazy";
      image.decoding = "async";
      element.appendChild(image);

      const marker = new maplibregl.Marker({
        element,
        anchor: "bottom",
      })
        .setLngLat([place.lon, place.lat])
        .addTo(map);

      element.addEventListener("click", () => onSelectPlace(place));

      markersRef.current.push({ marker, element, placeId: place.id });
    });
  }, [onSelectPlace, places]);

  useEffect(() => {
    markersRef.current.forEach(({ element, placeId }) => {
      element.dataset.active = activePlace?.id === placeId ? "true" : "false";
    });
  }, [activePlace]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !activePlace) {
      return;
    }

    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;

    map.flyTo({
      center: [activePlace.lon, activePlace.lat],
      zoom: Math.max(map.getZoom(), 12.6),
      speed: 0.85,
      curve: 1.2,
      padding: isDesktop
        ? { top: 56, right: 420, bottom: 56, left: 56 }
        : { top: 72, right: 24, bottom: 360, left: 24 },
    });
  }, [activePlace]);

  return <div className="map-shell" ref={mapNodeRef} />;
}
