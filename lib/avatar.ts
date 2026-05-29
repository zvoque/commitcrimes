// Pre-fetch a GitHub avatar to a base64 data URI. Satori (next/og) fetches
// remote <img> src at render time, and on Workers that subrequest can hang and
// stall the image — so we fetch it ourselves with a hard timeout and inline it.
// Returns null on any failure so the caller can render without a mugshot.
export async function avatarDataUri(url: string, size = 200): Promise<string | null> {
  try {
    const sized = url.includes("?") ? `${url}&s=${size}` : `${url}?s=${size}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(sized, {
      signal: ctrl.signal,
      headers: { "User-Agent": "commitcrimes.dev" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const ct = res.headers.get("content-type") || "image/jpeg";
    return `data:${ct};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}
