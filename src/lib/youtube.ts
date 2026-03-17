/**
 * YouTube URL parser and validator for Callister Scout video analysis.
 * Handles all common YouTube URL formats and extracts video IDs.
 */

const YT_PATTERNS: RegExp[] = [
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
];

export type YouTubeParseResult =
  | { ok: true; videoId: string }
  | { ok: false; error: string };

export function parseYouTubeUrl(url: string): YouTubeParseResult {
  const trimmed = url.trim();
  if (!trimmed) return { ok: false, error: "URL boş olamaz." };

  for (const pattern of YT_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return { ok: true, videoId: match[1] };
    }
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return { ok: true, videoId: trimmed };
  }

  return { ok: false, error: "Geçerli bir YouTube URL'si girin." };
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
