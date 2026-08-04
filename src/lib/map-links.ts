export type NavigationPoint = {
  label?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function coordinateValue(point: NavigationPoint) {
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `${latitude},${longitude}`;
  }
  return point.label?.trim() || "";
}

export function formatRouteDistance(meters?: number | null) {
  if (!meters || meters <= 0) return "A calcular";
  const kilometers = meters / 1000;
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: kilometers < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(kilometers)} km`;
}

export function formatRouteDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "A calcular";
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${minutes} min`;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
}

export function googleMapsNavigationUrl(destination: NavigationPoint) {
  const destinationValue = coordinateValue(destination);
  const params = new URLSearchParams({ api: "1", travelmode: "driving" });
  if (destinationValue) params.set("destination", destinationValue);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function googleMapsDirectionsUrl(origin: NavigationPoint, destination: NavigationPoint) {
  const originValue = coordinateValue(origin);
  const destinationValue = coordinateValue(destination);
  const params = new URLSearchParams({ api: "1", travelmode: "driving" });
  if (originValue) params.set("origin", originValue);
  if (destinationValue) params.set("destination", destinationValue);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function wazeNavigationUrl(destination: NavigationPoint) {
  const destinationValue = coordinateValue(destination);
  const params = new URLSearchParams({ navigate: "yes" });
  if (destinationValue) params.set("q", destinationValue);
  return `https://waze.com/ul?${params.toString()}`;
}
