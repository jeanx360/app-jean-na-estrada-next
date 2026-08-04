"use client";

import { useMemo } from "react";
import type { RouteCoordinate } from "@/lib/open-maps";

type Point = {
  label?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Props = {
  origin: Point;
  destination: Point;
  geometry?: RouteCoordinate[] | null;
  className?: string;
  title?: string;
};

type PixelPoint = { x: number; y: number };
type Tile = { key: string; url: string; left: number; top: number; size: number };

const TILE_SIZE = 256;
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 560;
const MAX_LATITUDE = 85.05112878;
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim() || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function validCoordinate(longitude: unknown, latitude: unknown): RouteCoordinate | null {
  const lon = Number(longitude);
  const lat = Number(latitude);
  return Number.isFinite(lon) && Number.isFinite(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90
    ? [lon, lat]
    : null;
}

function worldPixel([longitude, rawLatitude]: RouteCoordinate, zoom: number): PixelPoint {
  const latitude = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, rawLatitude));
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((longitude + 180) / 360) * scale;
  const sinLatitude = Math.sin((latitude * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function chooseZoom(points: RouteCoordinate[]) {
  for (let zoom = 16; zoom >= 2; zoom -= 1) {
    const pixels = points.map((point) => worldPixel(point, zoom));
    const width = Math.max(...pixels.map((point) => point.x)) - Math.min(...pixels.map((point) => point.x));
    const height = Math.max(...pixels.map((point) => point.y)) - Math.min(...pixels.map((point) => point.y));
    if (width <= VIEW_WIDTH * 0.72 && height <= VIEW_HEIGHT * 0.68) return zoom;
  }
  return 2;
}

function tileUrl(zoom: number, x: number, y: number) {
  return TILE_URL.replace("{z}", String(zoom)).replace("{x}", String(x)).replace("{y}", String(y));
}

export function OpenStreetMapRoute({ origin, destination, geometry, className = "", title = "Mapa da rota" }: Props) {
  const model = useMemo(() => {
    const originCoordinate = validCoordinate(origin.longitude, origin.latitude);
    const destinationCoordinate = validCoordinate(destination.longitude, destination.latitude);
    const route = (geometry || []).filter((coordinate) => validCoordinate(coordinate[0], coordinate[1])) as RouteCoordinate[];
    const points = route.length >= 2
      ? route
      : [originCoordinate, destinationCoordinate].filter((point): point is RouteCoordinate => Boolean(point));
    if (!points.length) return null;

    const zoom = chooseZoom(points);
    const pixels = points.map((point) => worldPixel(point, zoom));
    const minX = Math.min(...pixels.map((point) => point.x));
    const maxX = Math.max(...pixels.map((point) => point.x));
    const minY = Math.min(...pixels.map((point) => point.y));
    const maxY = Math.max(...pixels.map((point) => point.y));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const left = centerX - VIEW_WIDTH / 2;
    const top = centerY - VIEW_HEIGHT / 2;
    const maxTile = 2 ** zoom;
    const startTileX = Math.floor(left / TILE_SIZE) - 1;
    const endTileX = Math.floor((left + VIEW_WIDTH) / TILE_SIZE) + 1;
    const startTileY = Math.max(0, Math.floor(top / TILE_SIZE) - 1);
    const endTileY = Math.min(maxTile - 1, Math.floor((top + VIEW_HEIGHT) / TILE_SIZE) + 1);
    const tiles: Tile[] = [];

    for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
      for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
        const wrappedX = ((tileX % maxTile) + maxTile) % maxTile;
        tiles.push({
          key: `${zoom}-${tileX}-${tileY}`,
          url: tileUrl(zoom, wrappedX, tileY),
          left: tileX * TILE_SIZE - left,
          top: tileY * TILE_SIZE - top,
          size: TILE_SIZE,
        });
      }
    }

    const local = (coordinate: RouteCoordinate) => {
      const pixel = worldPixel(coordinate, zoom);
      return { x: pixel.x - left, y: pixel.y - top };
    };
    const routePoints = points.map(local);
    return {
      tiles,
      routePoints,
      originPoint: originCoordinate ? local(originCoordinate) : routePoints[0],
      destinationPoint: destinationCoordinate ? local(destinationCoordinate) : routePoints[routePoints.length - 1],
    };
  }, [destination.latitude, destination.longitude, geometry, origin.latitude, origin.longitude]);

  if (!model) return null;
  const polyline = model.routePoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className={`open-route-map ${className}`.trim()} role="img" aria-label={title}>
      <div className="open-route-map__tiles" aria-hidden="true">
        {model.tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            style={{
              left: `${(tile.left / VIEW_WIDTH) * 100}%`,
              top: `${(tile.top / VIEW_HEIGHT) * 100}%`,
              width: `${(tile.size / VIEW_WIDTH) * 100}%`,
              height: `${(tile.size / VIEW_HEIGHT) * 100}%`,
            }}
          />
        ))}
      </div>
      <svg className="open-route-map__overlay" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
        {model.routePoints.length >= 2 ? <polyline className="open-route-map__line-shadow" points={polyline} /> : null}
        {model.routePoints.length >= 2 ? <polyline className="open-route-map__line" points={polyline} /> : null}
        <circle className="open-route-map__marker open-route-map__marker--origin" cx={model.originPoint.x} cy={model.originPoint.y} r="13" />
        <circle className="open-route-map__marker open-route-map__marker--destination" cx={model.destinationPoint.x} cy={model.destinationPoint.y} r="13" />
      </svg>
      <div className="open-route-map__labels" aria-hidden="true"><span>Saída</span><span>Destino</span></div>
      <a className="open-route-map__attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
    </div>
  );
}
