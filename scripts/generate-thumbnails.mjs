import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const BASE_URL = "https://gokursk.ru";
const ROOT_DIR = process.cwd();
const JSON_PATH = path.join(ROOT_DIR, "src", "all-objects.json");
const THUMBNAIL_DIR = path.join(ROOT_DIR, "public", "place-thumbnails");
const THUMBNAIL_PUBLIC_PREFIX = "/place-thumbnails";
const THUMBNAIL_SIZE = 128;
const REQUEST_TIMEOUT_MS = 60_000;
const CONCURRENCY = 6;
const RETRIES = 3;

async function readCollection() {
  const raw = await readFile(JSON_PATH, "utf-8");
  return JSON.parse(raw);
}

function buildAbsoluteUrl(relativeOrAbsoluteUrl) {
  return new URL(relativeOrAbsoluteUrl, BASE_URL).toString();
}

function buildThumbnailFileName(feature) {
  const imagePath = feature.properties.balloonContent.image;
  const digest = createHash("sha1").update(imagePath).digest("hex").slice(0, 10);
  return `${feature.properties.id ?? feature.id}-${digest}.webp`;
}

async function fetchBuffer(url) {
  let lastError;

  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

async function createThumbnail(inputBuffer, outputPath) {
  await sharp(inputBuffer)
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
      fit: "cover",
      position: "attention",
    })
    .webp({
      quality: 72,
      effort: 4,
    })
    .toFile(outputPath);
}

async function runWorker(items, worker) {
  let index = 0;

  async function next() {
    const currentIndex = index;
    index += 1;

    if (currentIndex >= items.length) {
      return;
    }

    await worker(items[currentIndex], currentIndex);
    await next();
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => next()));
}

async function main() {
  const collection = await readCollection();
  const features = collection.features ?? [];

  await mkdir(THUMBNAIL_DIR, { recursive: true });

  let completed = 0;
  let skipped = 0;
  const failures = [];

  await runWorker(features, async (feature) => {
    const content = feature.properties.balloonContent;
    const sourceUrl = buildAbsoluteUrl(content.image);
    const fileName = buildThumbnailFileName(feature);
    const outputPath = path.join(THUMBNAIL_DIR, fileName);
    const publicPath = `${THUMBNAIL_PUBLIC_PREFIX}/${fileName}`;

    try {
      await access(outputPath);
      content.thumbnail = publicPath;
      skipped += 1;
      process.stdout.write(`Processed ${completed + skipped}/${features.length}\r`);
      return;
    } catch {
      // The file does not exist yet, continue to generation.
    }

    try {
      const imageBuffer = await fetchBuffer(sourceUrl);
      await createThumbnail(imageBuffer, outputPath);
      content.thumbnail = publicPath;
      completed += 1;
      process.stdout.write(`Processed ${completed + skipped}/${features.length}\r`);
    } catch (error) {
      failures.push({
        id: feature.properties.id ?? feature.id,
        image: content.image,
        reason: error instanceof Error ? error.message : String(error),
      });
      delete content.thumbnail;
    }
  });

  await writeFile(JSON_PATH, `${JSON.stringify(collection, null, 2)}\n`, "utf-8");
  process.stdout.write("\n");

  if (failures.length > 0) {
    console.error(`Failed to generate ${failures.length} thumbnails.`);
    failures.slice(0, 10).forEach((failure) => {
      console.error(`- #${failure.id} ${failure.reason} (${failure.image})`);
    });

    process.exitCode = 1;
    return;
  }

  console.log(`Generated ${completed} thumbnails and reused ${skipped} in ${THUMBNAIL_DIR}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
