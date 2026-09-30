export function extractShortcode(input: string): string {
  try {
    const url = new URL(input.trim());
    if (
      url.protocol !== "https:" ||
      !["instagram.com", "www.instagram.com"].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port
    )
      throw Error();
    const match = url.pathname.match(/^\/(?:p|reel)\/([A-Za-z0-9_-]+)\/?$/);
    if (!match) throw Error();
    return match[1];
  } catch {
    throw new Error(
      "URL inválida. Cole um link https://www.instagram.com/p/… ou /reel/…",
    );
  }
}
