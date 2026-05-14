import { useEffect, useRef, useState } from "react";
import type { FeatureCollection, Point } from "geojson";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
  type MapLayerMouseEvent,
  type Marker,
} from "maplibre-gl";
import type { Place } from "../types";
import { resolveMapStyle } from "../mapStyles";

type MapViewProps = {
  places: Place[];
  activePlace: Place | null;
  onSelectPlace: (place: Place) => void;
};

type PlaceFeatureProperties = {
  placeId: number;
  name: string;
};

type PlacesFeatureCollection = FeatureCollection<Point, PlaceFeatureProperties>;

type PhotoMarkerRecord = {
  marker: Marker;
  element: HTMLButtonElement;
  placeId: number;
};

const KURSK_CENTER: [number, number] = [36.191112, 51.730361];
const INITIAL_ZOOM = 11.4;
const PHOTO_MARKER_ZOOM_THRESHOLD = 15;
const PHOTO_MARKER_VISIBLE_PLACE_LIMIT = 50;
const PLACES_CLUSTER_MAX_ZOOM = 14;
const ACTIVE_PLACE_FLY_TO_ZOOM = 15.1;
const PLACES_SOURCE_ID = "places-source";
const PLACES_CLUSTERS_LAYER_ID = "places-clusters-layer";
const PLACES_CLUSTER_COUNT_LAYER_ID = "places-cluster-count-layer";
const PLACES_POINTS_LAYER_ID = "places-points-layer";

type MapTestWindow = Window & {
  __KURSK_MAP_TEST_MAP__?: MapLibreMap;
};

function buildPlacesFeatureCollection(places: Place[]): PlacesFeatureCollection {
  return {
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature",
      id: place.id,
      geometry: {
        type: "Point",
        coordinates: [place.lon, place.lat],
      },
      properties: {
        placeId: place.id,
        name: place.name,
      },
    })),
  };
}

function createPhotoMarkerElement(place: Place, onSelectPlace: (place: Place) => void) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "photo-marker";
  element.setAttribute("aria-label", `Открыть ${place.name}`);
  element.dataset.placeId = String(place.id);

  const content = document.createElement("span");
  content.className = "photo-marker-content";

  const frame = document.createElement("span");
  frame.className = "photo-marker-frame";

  const image = document.createElement("img");
  image.src = place.thumbnailUrl;
  image.alt = place.name;
  image.loading = "lazy";
  image.decoding = "async";
  frame.appendChild(image);
  content.appendChild(frame);

  const label = document.createElement("span");
  label.className = "photo-marker-label";

  const labelText = document.createElement("span");
  labelText.className = "photo-marker-label-text";
  labelText.textContent = place.name;
  label.appendChild(labelText);

  content.appendChild(label);
  element.appendChild(content);

  element.addEventListener("click", () => onSelectPlace(place));

  return element;
}

function clearPhotoMarkers(markers: Map<number, PhotoMarkerRecord>) {
  markers.forEach(({ marker }) => marker.remove());
  markers.clear();
}

function setPlacesLayersVisibility(map: MapLibreMap, isVisible: boolean) {
  const visibility = isVisible ? "visible" : "none";

  for (const layerId of [
    PLACES_CLUSTERS_LAYER_ID,
    PLACES_CLUSTER_COUNT_LAYER_ID,
    PLACES_POINTS_LAYER_ID,
  ]) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  }
}

function syncPhotoMarkers({
  map,
  places,
  markers,
  activePlaceId,
  onSelectPlace,
}: {
  map: MapLibreMap;
  places: Place[];
  markers: Map<number, PhotoMarkerRecord>;
  activePlaceId: number | null;
  onSelectPlace: (place: Place) => void;
}) {
  const bounds = map.getBounds();
  const visiblePlaces = places.filter((place) => bounds.contains([place.lon, place.lat]));
  const shouldShowPhotoMarkers =
    map.getZoom() >= PHOTO_MARKER_ZOOM_THRESHOLD ||
    visiblePlaces.length < PHOTO_MARKER_VISIBLE_PLACE_LIMIT;

  setPlacesLayersVisibility(map, !shouldShowPhotoMarkers);

  if (!shouldShowPhotoMarkers) {
    clearPhotoMarkers(markers);
    return;
  }

  const visiblePlaceIds = new Set<number>();

  for (const place of visiblePlaces) {
    visiblePlaceIds.add(place.id);

    let record = markers.get(place.id);

    if (!record) {
      const element = createPhotoMarkerElement(place, onSelectPlace);
      const marker = new maplibregl.Marker({
        element,
        anchor: "center",
      })
        .setLngLat([place.lon, place.lat])
        .addTo(map);

      record = {
        marker,
        element,
        placeId: place.id,
      };

      markers.set(place.id, record);
    }

    record.element.dataset.active = activePlaceId === place.id ? "true" : "false";
  }

  markers.forEach((record, placeId) => {
    if (visiblePlaceIds.has(placeId)) {
      return;
    }

    record.marker.remove();
    markers.delete(placeId);
  });
}

function addPlacesLayers(map: MapLibreMap, places: Place[]) {
  if (map.getSource(PLACES_SOURCE_ID)) {
    return;
  }

  map.addSource(PLACES_SOURCE_ID, {
    type: "geojson",
    data: buildPlacesFeatureCollection(places),
    cluster: true,
    clusterMaxZoom: PLACES_CLUSTER_MAX_ZOOM,
    clusterRadius: 54,
  });

  map.addLayer({
    id: PLACES_CLUSTERS_LAYER_ID,
    type: "circle",
    source: PLACES_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": ["step", ["get", "point_count"], "#2e6bff", 8, "#1f5ae8", 24, "#1a4fd6"],
      "circle-radius": ["step", ["get", "point_count"], 16, 8, 20, 24, 26],
      "circle-stroke-color": "rgba(255, 255, 255, 0.96)",
      "circle-stroke-width": 3,
      "circle-opacity": 0.9,
    },
  });

  map.addLayer({
    id: PLACES_CLUSTER_COUNT_LAYER_ID,
    type: "symbol",
    source: PLACES_SOURCE_ID,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 12,
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#fffdf8",
    },
  });

  map.addLayer({
    id: PLACES_POINTS_LAYER_ID,
    type: "circle",
    source: PLACES_SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": [
        "case",
        ["boolean", ["feature-state", "active"], false],
        "#2e6bff",
        "#1a4fd6",
      ],
      "circle-radius": [
        "case",
        ["boolean", ["feature-state", "active"], false],
        9,
        6,
      ],
      "circle-stroke-color": "rgba(255, 255, 255, 0.96)",
      "circle-stroke-width": [
        "case",
        ["boolean", ["feature-state", "active"], false],
        3,
        2,
      ],
      "circle-opacity": 0.95,
    },
  });
}

function getPlaceIdFromFeature(event: MapLayerMouseEvent) {
  const feature = event.features?.[0];

  if (!feature) {
    return null;
  }

  if (typeof feature.id === "number") {
    return feature.id;
  }

  const featurePlaceId = feature.properties?.placeId;

  if (typeof featurePlaceId === "number") {
    return featurePlaceId;
  }

  if (typeof featurePlaceId === "string") {
    const parsed = Number(featurePlaceId);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

export function MapView({ places, activePlace, onSelectPlace }: MapViewProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<number, PhotoMarkerRecord>>(new Map());
  const placesRef = useRef(places);
  const activePlaceRef = useRef(activePlace);
  const onSelectPlaceRef = useRef(onSelectPlace);
  const placeByIdRef = useRef(new Map(places.map((place) => [place.id, place])));
  const previousActivePlaceIdRef = useRef<number | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    placesRef.current = places;
    placeByIdRef.current = new Map(places.map((place) => [place.id, place]));
  }, [places]);

  useEffect(() => {
    activePlaceRef.current = activePlace;
    onSelectPlaceRef.current = onSelectPlace;
  }, [activePlace, onSelectPlace]);

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) {
      return;
    }

    const shouldExposeMapForE2E = new URLSearchParams(window.location.search).get("e2e") === "1";
    const testWindow = window as MapTestWindow;
    let isCancelled = false;
    let map: MapLibreMap | null = null;

    const setMapMovingState = (isMoving: boolean) => {
      mapNodeRef.current?.classList.toggle("map-is-moving", isMoving);
    };

    const refreshVisibleMarkers = () => {
      if (!map) {
        return;
      }

      syncPhotoMarkers({
        map,
        places: placesRef.current,
        markers: markersRef.current,
        activePlaceId: activePlaceRef.current?.id ?? null,
        onSelectPlace: onSelectPlaceRef.current,
      });
    };

    const handleClusterClick = (event: MapLayerMouseEvent) => {
      if (!map) {
        return;
      }

      const feature = event.features?.[0];
      const clusterId = Number(feature?.properties?.cluster_id);

      if (!feature || Number.isNaN(clusterId) || feature.geometry.type !== "Point") {
        return;
      }

      const source = map.getSource(PLACES_SOURCE_ID) as GeoJSONSource | undefined;

      if (!source) {
        return;
      }

      void source
        .getClusterExpansionZoom(clusterId)
        .then((zoom) => {
          if (!map || feature.geometry.type !== "Point") {
            return;
          }

          map.easeTo({
            center: feature.geometry.coordinates as [number, number],
            zoom,
          });
        })
        .catch((error) => {
          console.error("Failed to expand marker cluster", error);
        });
    };

    const handlePointClick = (event: MapLayerMouseEvent) => {
      const placeId = getPlaceIdFromFeature(event);

      if (placeId === null) {
        return;
      }

      const place = placeByIdRef.current.get(placeId);

      if (place) {
        onSelectPlaceRef.current(place);
      }
    };

    const handlePointerEnter = () => {
      map?.getCanvas().style.setProperty("cursor", "pointer");
    };

    const handlePointerLeave = () => {
      map?.getCanvas().style.removeProperty("cursor");
    };

    const handleMoveStart = () => {
      setMapMovingState(true);
    };

    const handleMoveEnd = () => {
      setMapMovingState(false);
      refreshVisibleMarkers();
    };

    const handleIdle = () => {
      setMapMovingState(false);
      refreshVisibleMarkers();
    };

    const handleLoad = () => {
      if (!map) {
        return;
      }

      addPlacesLayers(map, placesRef.current);
      refreshVisibleMarkers();
      setIsMapReady(true);
    };

    void resolveMapStyle()
      .then((style) => {
        if (!mapNodeRef.current || isCancelled) {
          return;
        }

        map = new maplibregl.Map({
          container: mapNodeRef.current,
          style,
          center: KURSK_CENTER,
          zoom: INITIAL_ZOOM,
          attributionControl: false,
        });

        mapRef.current = map;

        if (shouldExposeMapForE2E) {
          testWindow.__KURSK_MAP_TEST_MAP__ = map;
        }

        map.addControl(new maplibregl.NavigationControl(), "bottom-left");

        map.on("load", handleLoad);
        map.on("click", PLACES_CLUSTERS_LAYER_ID, handleClusterClick);
        map.on("click", PLACES_POINTS_LAYER_ID, handlePointClick);
        map.on("mouseenter", PLACES_CLUSTERS_LAYER_ID, handlePointerEnter);
        map.on("mouseenter", PLACES_POINTS_LAYER_ID, handlePointerEnter);
        map.on("mouseleave", PLACES_CLUSTERS_LAYER_ID, handlePointerLeave);
        map.on("mouseleave", PLACES_POINTS_LAYER_ID, handlePointerLeave);
        map.on("movestart", handleMoveStart);
        map.on("zoomstart", handleMoveStart);
        map.on("moveend", handleMoveEnd);
        map.on("zoomend", refreshVisibleMarkers);
        map.on("idle", handleIdle);
      })
      .catch((error) => {
        console.error("Failed to initialize the base map style", error);
      });

    return () => {
      isCancelled = true;
      setMapMovingState(false);
      clearPhotoMarkers(markersRef.current);

      if (map) {
        map.off("load", handleLoad);
        map.off("click", PLACES_CLUSTERS_LAYER_ID, handleClusterClick);
        map.off("click", PLACES_POINTS_LAYER_ID, handlePointClick);
        map.off("mouseenter", PLACES_CLUSTERS_LAYER_ID, handlePointerEnter);
        map.off("mouseenter", PLACES_POINTS_LAYER_ID, handlePointerEnter);
        map.off("mouseleave", PLACES_CLUSTERS_LAYER_ID, handlePointerLeave);
        map.off("mouseleave", PLACES_POINTS_LAYER_ID, handlePointerLeave);
        map.off("movestart", handleMoveStart);
        map.off("zoomstart", handleMoveStart);
        map.off("moveend", handleMoveEnd);
        map.off("zoomend", refreshVisibleMarkers);
        map.off("idle", handleIdle);
        map.remove();
      }

      mapRef.current = null;
      delete testWindow.__KURSK_MAP_TEST_MAP__;
      setIsMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapReady) {
      return;
    }

    const source = map.getSource(PLACES_SOURCE_ID) as GeoJSONSource | undefined;

    source?.setData(buildPlacesFeatureCollection(places));

    syncPhotoMarkers({
      map,
      places,
      markers: markersRef.current,
      activePlaceId: activePlaceRef.current?.id ?? null,
      onSelectPlace: onSelectPlaceRef.current,
    });
  }, [isMapReady, places]);

  useEffect(() => {
    markersRef.current.forEach(({ element, placeId }) => {
      element.dataset.active = activePlace?.id === placeId ? "true" : "false";
    });

    const map = mapRef.current;

    if (!map || !isMapReady) {
      return;
    }

    const previousActivePlaceId = previousActivePlaceIdRef.current;
    const nextActivePlaceId = activePlace?.id ?? null;

    if (previousActivePlaceId !== null && previousActivePlaceId !== nextActivePlaceId) {
      map.removeFeatureState({ source: PLACES_SOURCE_ID, id: previousActivePlaceId }, "active");
    }

    if (nextActivePlaceId !== null) {
      map.setFeatureState({ source: PLACES_SOURCE_ID, id: nextActivePlaceId }, { active: true });
    }

    previousActivePlaceIdRef.current = nextActivePlaceId;
  }, [activePlace, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapReady || !activePlace) {
      return;
    }

    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;

    map.flyTo({
      center: [activePlace.lon, activePlace.lat],
      zoom: Math.max(map.getZoom(), ACTIVE_PLACE_FLY_TO_ZOOM),
      speed: 0.85,
      curve: 1.2,
      padding: isDesktop
        ? { top: 56, right: 420, bottom: 56, left: 56 }
        : { top: 72, right: 24, bottom: 360, left: 24 },
    });
  }, [activePlace, isMapReady]);

  return <div className="map-shell" ref={mapNodeRef} />;
}
