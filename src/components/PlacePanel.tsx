import { useEffect, useState } from "react";
import type { Place } from "../types";

type PlacePanelProps = {
  place: Place | null;
  onClose: () => void;
};

export function PlacePanel({ place, onClose }: PlacePanelProps) {
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [place?.id]);

  if (!place) {
    return null;
  }

  const totalImages = place.images.length;
  const currentImage = place.images[imageIndex] ?? place.imageUrl;

  return (
    <aside className="place-panel" aria-label={`Информация о месте ${place.name}`}>
      <button className="panel-close" type="button" onClick={onClose} aria-label="Закрыть карточку">
        Закрыть
      </button>

      <div className="panel-scroll">
        <div className="panel-carousel">
          <img className="panel-image" src={currentImage} alt={place.name} />
          <div className="panel-carousel-controls">
            <button
              type="button"
              onClick={() => setImageIndex((current) => (current - 1 + totalImages) % totalImages)}
              disabled={totalImages <= 1}
              aria-label="Предыдущее изображение"
            >
              ‹
            </button>
            <span>
              {imageIndex + 1} / {totalImages}
            </span>
            <button
              type="button"
              onClick={() => setImageIndex((current) => (current + 1) % totalImages)}
              disabled={totalImages <= 1}
              aria-label="Следующее изображение"
            >
              ›
            </button>
          </div>
        </div>

        <div className="panel-copy">
          <div className="panel-meta">
            <span className="eyebrow">Weekend pick</span>
            <span className="meta-pill">Категория {place.categoryType}</span>
          </div>
          <h2>{place.name}</h2>
          <p className="panel-highlight">{place.highlight}</p>
          <p className="panel-description">{place.description}</p>

          <dl className="panel-details">
            <div>
              <dt>Адрес</dt>
              <dd>{place.address}</dd>
            </div>
            <div>
              <dt>Коллекция</dt>
              <dd>Раздел {place.section}</dd>
            </div>
          </dl>

          <a className="panel-link" href={place.detailsUrl} target="_blank" rel="noreferrer">
            {place.ctaLabel}
          </a>
        </div>
      </div>
    </aside>
  );
}
