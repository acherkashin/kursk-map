import { expect, test } from "@playwright/test";

const KURSK_CENTER: [number, number] = [36.191112, 51.730361];
const PLACES_SOURCE_ID = "places-source";
const PLACES_CLUSTERS_LAYER_ID = "places-clusters-layer";
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

async function expandClusterByCount(
  page: Parameters<typeof test>[0]["page"],
  pointCount: number,
) {
  await page.evaluate(
    async ({ count, sourceId, layerId, timeoutMs }) => {
      const map = (window as { __KURSK_MAP_TEST_MAP__?: any }).__KURSK_MAP_TEST_MAP__;

      if (!map) {
        throw new Error("Map instance is not ready");
      }

      const source = map.getSource(sourceId);

      if (!source) {
        throw new Error("Cluster source is not ready");
      }

      const features = map.queryRenderedFeatures({ layers: [layerId] });
      const feature = features.find(
        (candidate: { properties?: { point_count?: unknown } }) =>
          Number(candidate.properties?.point_count) === count,
      );

      if (!feature || feature.geometry?.type !== "Point") {
        const visibleCounts = features
          .map((candidate: { properties?: { point_count?: unknown } }) =>
            Number(candidate.properties?.point_count),
          )
          .filter((value: number) => Number.isFinite(value));

        throw new Error(
          `Visible cluster ${count} was not found. Visible clusters: ${visibleCounts.join(", ") || "none"}`,
        );
      }

      const clusterId = Number(feature.properties?.cluster_id);

      if (!Number.isFinite(clusterId)) {
        throw new Error(`Cluster ${count} does not have a valid cluster_id`);
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
          reject(new Error(`Timed out while expanding cluster ${count}`));
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
      count: pointCount,
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

test("keeps the Kursk city center visible after expanding the 64 and 36 clusters", async ({
  page,
}) => {
  await page.goto("/?e2e=1");

  await waitForMap(page);
  await waitForClusterLayers(page);

  await expect
    .poll(async () => getVisibleClusterCounts(page))
    .toContain(64);

  await expandClusterByCount(page, 64);

  await expect
    .poll(async () => getVisibleClusterCounts(page))
    .toContain(36);

  await expandClusterByCount(page, 36);

  await expect
    .poll(async () => isCenterVisible(page))
    .toBe(true);
});
