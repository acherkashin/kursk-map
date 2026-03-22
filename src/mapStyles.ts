import type { StyleSpecification } from "maplibre-gl";

export const MAP_STYLE_OPTIONS = {
  positron: {
    id: "positron",
    label: "OpenFreeMap Positron",
    style: "https://tiles.openfreemap.org/styles/positron",
  },
  liberty: {
    id: "liberty",
    label: "OpenFreeMap Liberty",
    style: "https://tiles.openfreemap.org/styles/liberty",
  },
  custom: {
    id: "custom",
    label: "Local Positron Custom",
    style: "/map-styles/positron-custom.json",
  },
} as const satisfies Record<string, { id: string; label: string; style: string }>;

export type MapStyleId = keyof typeof MAP_STYLE_OPTIONS;

const DEFAULT_MAP_STYLE_ID: MapStyleId = "custom";
const FALLBACK_MAP_STYLE_ID: MapStyleId = "positron";
const DEFAULT_PROJECTION = { type: "mercator" } as const;

function isMapStyleId(value: string | undefined): value is MapStyleId {
  return typeof value === "string" && value in MAP_STYLE_OPTIONS;
}

export function getBaseMapStyle() {
  const configuredStyle = import.meta.env.VITE_MAP_STYLE;
  const styleId = isMapStyleId(configuredStyle) ? configuredStyle : DEFAULT_MAP_STYLE_ID;

  return MAP_STYLE_OPTIONS[styleId];
}

function needsProjection(style: StyleSpecification) {
  return !style.projection;
}

function isStyleSpecification(value: unknown): value is StyleSpecification {
  if (!value || typeof value !== "object") {
    return false;
  }

  const style = value as Record<string, unknown>;

  return (
    style.version === 8 &&
    typeof style.sources === "object" &&
    style.sources !== null &&
    Array.isArray(style.layers)
  );
}

export async function resolveMapStyle(styleId = getBaseMapStyle().id): Promise<StyleSpecification | string> {
  const mapStyle = MAP_STYLE_OPTIONS[styleId];

  if (!mapStyle) {
    return resolveMapStyle(FALLBACK_MAP_STYLE_ID);
  }

  try {
    const response = await fetch(mapStyle.style);

    if (!response.ok) {
      throw new Error(`Unable to load style "${styleId}" (${response.status})`);
    }

    const styleJson = (await response.json()) as unknown;

    if (!isStyleSpecification(styleJson)) {
      throw new Error(`Style "${styleId}" is not a valid MapLibre style specification`);
    }

    const style = styleJson as StyleSpecification;

    return needsProjection(style) ? { ...style, projection: DEFAULT_PROJECTION } : style;
  } catch (error) {
    if (styleId === FALLBACK_MAP_STYLE_ID) {
      throw error;
    }

    return resolveMapStyle(FALLBACK_MAP_STYLE_ID);
  }
}
