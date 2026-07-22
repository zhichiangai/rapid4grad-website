import "server-only";

export type PlaybackSource = {
  src: string;
  contentType: "video/mp4" | "video/webm";
};

const MAX_SOURCE_LENGTH = 2048;

function inferContentType(pathname: string): PlaybackSource["contentType"] {
  const normalized = pathname.toLowerCase();
  if (normalized.endsWith(".webm")) return "video/webm";
  if (normalized.endsWith(".mp4")) return "video/mp4";
  throw new Error("Unsupported video format");
}

export function resolvePlaybackSource(
  provider: string,
  externalId: string,
  requestOrigin: string,
): PlaybackSource {
  if (provider !== "html5") throw new Error("Unsupported video provider");

  const value = externalId.trim();
  if (!value || value.length > MAX_SOURCE_LENGTH || value.startsWith("//")) {
    throw new Error("Invalid video source");
  }

  const url = value.startsWith("/")
    ? new URL(value, requestOrigin)
    : new URL(value);

  if (url.protocol !== "https:" && url.origin !== requestOrigin) {
    throw new Error("Video source must use HTTPS");
  }

  return {
    src: url.toString(),
    contentType: inferContentType(url.pathname),
  };
}
