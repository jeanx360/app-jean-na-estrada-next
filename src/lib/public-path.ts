export function publicPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${process.env.PAGES_BASE_PATH ?? ""}${normalizedPath}`;
}
