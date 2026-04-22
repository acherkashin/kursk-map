import { expect, test } from "@playwright/test";

const KURSK_CENTER: [number, number] = [36.191112, 51.730361];
const PLACES_SOURCE_ID = "places-source";
const PLACES_CLUSTERS_LAYER_ID = "places-clusters-layer";
const PLACES_POINTS_LAYER_ID = "places-points-layer";
const MAP_TEST_TIMEOUT_MS = 10_000;

async function waitForMap(page: Parameters<typeof test>[0]["page"]) {
  await page.waitForFunction(() => Boolean((window as { __KURSK_MAP_TEST_MAP__?: unknown }).__KURSK_MAP_TEST_MAP__), {
    timeout: MAP_TEST_TIMEOUT_MS,
  });
}

async function waitForClusterLayers(page: Parameters<typeof test>[0]["page"]) {
  await expect
    .poll(
      async () =>
        page.evaluate(
          ({ sourceId, layerId }) => {
            const map = (window as { __KURSK_MAP_TEST_MAP__?: any }).__KURSK_MAP_TEST_MAP__;
            return Boolean(map?.getSource(sourceId) && map.getLayer(layerId));
          },
          { sourceId: PLACES_SOURCE_ID, layerId: PLACES_CLUSTERS_LAYER_ID },
        ),
      { timeout: MAP_TEST_TIMEOUT_MS },
    )
    .toBe(true);
}

async function getVisibleClusterCounts(page: Parameters<typeof test>[0]["page"]) {
  return page.evaluate((layerId) => {
    const map = (window as { __KURSK_MAP_TEST_MAP__?: any }).__KURSK_MAP_TEST_MAP__;

    if (!map) {
      throw new Error("Map instance is not ready");
    }

    return map
      .queryRenderedFeatures({ layers: [layerId] })
      .map((feature: { properties?: { point_count?: unknown } }) => Number(feature.properties?.point_count))
      .filter((value: number) => Number.isFinite(value));
  }, PLACES_CLUSTERS_LAYER_ID);
}

async function expandClusterNearestToCenter(page: Parameters<typeof test>[0]["page"]) {
  await page.evaluate(
    async ({ center, sourceId, layerId, timeoutMs }) => {
      const map = (window as { __KURSK_MAP_TEST_MAP__?: any }).__KURSK_MAP_TEST_MAP__;

      if (!map) {
        throw new Error("Map instance is not ready");
      }

      const source = map.getSource(sourceId);

      if (!source) {
        throw new Error("Cluster source is not ready");
      }

      const features = map.queryRenderedFeatures({ layers: [layerId] });
      const feature = features.reduce(
        (
          closest:
            | {
                geometry?: { coordinates?: [number, number] };
                properties?: { cluster_id?: unknown };
              }
            | null,
          candidate:
            | {
                geometry?: { coordinates?: [number, number] };
                properties?: { cluster_id?: unknown };
              }
            | null,
        ) => {
          if (candidate?.geometry?.coordinates === undefined) {
            return closest;
          }

          if (closest?.geometry?.coordinates === undefined) {
            return candidate;
          }

          const [candidateLon, candidateLat] = candidate.geometry.coordinates;
          const [closestLon, closestLat] = closest.geometry.coordinates;
          const [centerLon, centerLat] = center;

          const candidateDistance =
            (candidateLon - centerLon) ** 2 + (candidateLat - centerLat) ** 2;
          const closestDistance = (closestLon - centerLon) ** 2 + (closestLat - centerLat) ** 2;

          return candidateDistance < closestDistance ? candidate : closest;
        },
        null,
      );

      if (!feature || feature.geometry?.type !== "Point") {
        throw new Error("No visible cluster was found near the map center");
      }

      const clusterId = Number(feature.properties?.cluster_id);

      if (!Number.isFinite(clusterId)) {
        throw new Error("Closest visible cluster does not have a valid cluster_id");
      }

      const zoom = await source.getClusterExpansionZoom(clusterId);

      await new Promise<void>((resolve, reject) => {
        let settled = false;

        const finish = () => {
          if (settled) {
            return;
          }

          settled = true;
          map.off("moveend", handleMoveEnd);
          window.clearTimeout(timeoutId);
          resolve();
        };

        const handleMoveEnd = () => {
          finish();
        };

        const timeoutId = window.setTimeout(() => {
          map.off("moveend", handleMoveEnd);
          reject(new Error("Timed out while expanding the closest visible cluster"));
        }, timeoutMs);

        map.on("moveend", handleMoveEnd);
        map.easeTo({
          center: feature.geometry.coordinates,
          zoom,
        });

        if (!map.isMoving()) {
          finish();
        }
      });
    },
    {
      center: KURSK_CENTER,
      sourceId: PLACES_SOURCE_ID,
      layerId: PLACES_CLUSTERS_LAYER_ID,
      timeoutMs: MAP_TEST_TIMEOUT_MS,
    },
  );
}

async function isCenterVisible(page: Parameters<typeof test>[0]["page"]) {
  return page.evaluate((center) => {
    const map = (window as { __KURSK_MAP_TEST_MAP__?: any }).__KURSK_MAP_TEST_MAP__;

    if (!map) {
      throw new Error("Map instance is not ready");
    }

    return map.getBounds().contains(center);
  }, KURSK_CENTER);
}

async function setZoom(page: Parameters<typeof test>[0]["page"], zoom: number) {
  await page.evaluate(
    async ({ nextZoom, timeoutMs }) => {
      const map = (window as { __KURSK_MAP_TEST_MAP__?: any }).__KURSK_MAP_TEST_MAP__;

      if (!map) {
        throw new Error("Map instance is not ready");
      }

      await new Promise<void>((resolve, reject) => {
        let settled = false;

        const finish = () => {
          if (settled) {
            return;
          }

          settled = true;
          map.off("moveend", handleMoveEnd);
          window.clearTimeout(timeoutId);
          resolve();
        };

        const handleMoveEnd = () => {
          finish();
        };

        const timeoutId = window.setTimeout(() => {
          map.off("moveend", handleMoveEnd);
          reject(new Error(`Timed out while zooming map to ${nextZoom}`));
        }, timeoutMs);

        map.on("moveend", handleMoveEnd);
        map.easeTo({ zoom: nextZoom });

        if (!map.isMoving()) {
          finish();
        }
      });
    },
    { nextZoom: zoom, timeoutMs: MAP_TEST_TIMEOUT_MS },
  );
}

async function getLayerVisibility(
  page: Parameters<typeof test>[0]["page"],
  layerId: string,
) {
  return page.evaluate((targetLayerId) => {
    const map = (window as { __KURSK_MAP_TEST_MAP__?: any }).__KURSK_MAP_TEST_MAP__;

    if (!map) {
      throw new Error("Map instance is not ready");
    }

    return map.getLayoutProperty(targetLayerId, "visibility") ?? "visible";
  }, layerId);
}

async function getVisiblePhotoMarkerCount(page: Parameters<typeof test>[0]["page"]) {
  return page.locator(".photo-marker").count();
}

async function getMapZoom(page: Parameters<typeof test>[0]["page"]) {
  return page.evaluate(() => {
    const map = (window as { __KURSK_MAP_TEST_MAP__?: any }).__KURSK_MAP_TEST_MAP__;

    if (!map) {
      throw new Error("Map instance is not ready");
    }

    return map.getZoom();
  });
}

async function getLayoutMetrics(page: Parameters<typeof test>[0]["page"]) {
  return page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>(".place-panel:not(.place-panel--empty)");
    const panelScroll = document.querySelector<HTMLElement>(".panel-scroll");
    const mapFrame = document.querySelector<HTMLElement>(".map-frame");

    return {
      documentScrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      panelExists: Boolean(panel),
      panelScrollExists: Boolean(panelScroll),
      panelScrollOverflowY: panelScroll ? window.getComputedStyle(panelScroll).overflowY : null,
      panelScrollClientHeight: panelScroll?.clientHeight ?? 0,
      mapFrameBottom: mapFrame?.getBoundingClientRect().bottom ?? null,
    };
  });
}

async function selectPlaceById(
  page: Parameters<typeof test>[0]["page"],
  placeId: number,
) {
  return page.evaluate(
    ({ nextPlaceId }) => {
      const testWindow = window as {
        __KURSK_MAP_TEST_SELECT_PLACE__?: (placeId: number) => boolean;
      };
      return testWindow.__KURSK_MAP_TEST_SELECT_PLACE__?.(nextPlaceId) ?? false;
    },
    { nextPlaceId: placeId },
  );
}

async function getPlaceIds(page: Parameters<typeof test>[0]["page"]) {
  return page.evaluate(() => {
    const testWindow = window as {
      __KURSK_MAP_TEST_GET_PLACE_IDS__?: () => number[];
    };

    return testWindow.__KURSK_MAP_TEST_GET_PLACE_IDS__?.() ?? [];
  });
}

test("keeps the Kursk city center visible after expanding the nearest visible clusters", async ({
  page,
}) => {
  await page.goto("/?e2e=1");

  await waitForMap(page);
  await waitForClusterLayers(page);

  await expect
    .poll(async () => getVisibleClusterCounts(page).then((counts) => counts.length))
    .toBeGreaterThan(0);

  await expandClusterNearestToCenter(page);

  await expect
    .poll(async () => getVisibleClusterCounts(page).then((counts) => counts.length))
    .toBeGreaterThan(0);

  await expandClusterNearestToCenter(page);

  await expect
    .poll(async () => isCenterVisible(page))
    .toBe(true);
});

test("shows photo markers starting at zoom 15 and hides vector place layers", async ({ page }) => {
  await page.goto("/?e2e=1");

  await waitForMap(page);
  await waitForClusterLayers(page);

  await setZoom(page, 14.9);

  await expect
    .poll(async () => getVisibleClusterCounts(page).then((counts) => counts.length))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => getVisiblePhotoMarkerCount(page))
    .toBe(0);
  await expect
    .poll(async () => getLayerVisibility(page, PLACES_CLUSTERS_LAYER_ID))
    .toBe("visible");
  await expect
    .poll(async () => getLayerVisibility(page, PLACES_POINTS_LAYER_ID))
    .toBe("visible");

  await setZoom(page, 15);

  await expect
    .poll(async () => getVisiblePhotoMarkerCount(page))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => getLayerVisibility(page, PLACES_CLUSTERS_LAYER_ID))
    .toBe("none");
  await expect
    .poll(async () => getLayerVisibility(page, PLACES_POINTS_LAYER_ID))
    .toBe("none");
});

test("selecting a place zooms the map into the photo marker range", async ({ page }) => {
  await page.goto("/?e2e=1");

  await waitForMap(page);
  await waitForClusterLayers(page);

  const placeIds = await getPlaceIds(page);
  const targetPlaceId = placeIds[0];

  expect(targetPlaceId).toBeDefined();

  const didSelectPlace = await selectPlaceById(page, targetPlaceId!);

  expect(didSelectPlace).toBe(true);

  await expect
    .poll(async () => getMapZoom(page))
    .toBeGreaterThanOrEqual(15);
  await expect
    .poll(async () => page.locator('.photo-marker[data-active="true"]').count())
    .toBe(1);
});

test("selecting a place keeps the page locked to the viewport and scrolls inside the panel", async ({
  page,
}) => {
  await page.goto("/?e2e=1");

  await waitForMap(page);
  await waitForClusterLayers(page);

  const placeIds = await getPlaceIds(page);
  const targetPlaceId = placeIds[0];

  expect(targetPlaceId).toBeDefined();

  const didSelectPlace = await selectPlaceById(page, targetPlaceId!);

  expect(didSelectPlace).toBe(true);

  await expect
    .poll(async () => getMapZoom(page))
    .toBeGreaterThanOrEqual(15);

  await expect
    .poll(async () => getLayoutMetrics(page))
    .toMatchObject({
      panelExists: true,
      panelScrollExists: true,
      panelScrollOverflowY: "auto",
    });

  const layoutMetrics = await getLayoutMetrics(page);

  expect(layoutMetrics.documentScrollHeight).toBeLessThanOrEqual(layoutMetrics.viewportHeight);
  expect(layoutMetrics.mapFrameBottom).not.toBeNull();
  expect(layoutMetrics.mapFrameBottom!).toBeLessThanOrEqual(layoutMetrics.viewportHeight);
  expect(layoutMetrics.panelScrollClientHeight).toBeGreaterThan(0);
});
