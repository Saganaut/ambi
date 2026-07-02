// Turns a user-pasted YouTube link into a privacy-friendly embed URL, or null
// when the string isn't a recognisable YouTube video reference. Handles the
// common shapes: watch?v=, youtu.be/, /embed/, and /shorts/.
const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;

const extractVideoId = (raw: string): string | null => {
  const value = raw.trim();
  if (value === "") return null;

  // A bare 11-char id.
  if (YOUTUBE_ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return YOUTUBE_ID.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v && YOUTUBE_ID.test(v)) return v;
    const path = url.pathname.split("/").filter(Boolean); // e.g. ["embed", "<id>"]
    if ((path[0] === "embed" || path[0] === "shorts") && path[1] && YOUTUBE_ID.test(path[1])) {
      return path[1];
    }
  }
  return null;
};

/** Embed URL for a YouTube link/id, or `null` if it isn't a valid one. */
export const youTubeEmbedUrl = (raw: string): string | null => {
  const id = extractVideoId(raw);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
};
