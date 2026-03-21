export type RawBalloonContent = {
  url: string;
  image: string;
  thumbnail?: string;
  name: string;
  description: string;
  address: string;
  coordinates: string;
  button: string;
};

export type RawFeature = {
  type: "Feature";
  id: number;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    section: string;
    type: string;
    id: number;
    balloonContent: RawBalloonContent;
  };
};

export type RawFeatureCollection = {
  type: "FeatureCollection";
  features: RawFeature[];
};

export type Place = {
  id: number;
  name: string;
  description: string;
  highlight: string;
  address: string;
  lat: number;
  lon: number;
  images: string[];
  imageUrl: string;
  thumbnailUrl: string;
  detailsUrl: string;
  section: string;
  categoryType: string;
  ctaLabel: string;
};
