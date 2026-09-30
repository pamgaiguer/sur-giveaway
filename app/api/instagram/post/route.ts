import { NextResponse } from "next/server";
import { extractShortcode } from "@/lib/instagram/url";
import { InstagramClient } from "@/lib/instagram/client";
import { findMedia } from "@/lib/instagram/media";
import { getComments } from "@/lib/instagram/comments";
import { InstagramError } from "@/lib/instagram/errors";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      return NextResponse.json(
        { error: "Origem não permitida." },
        { status: 403, headers },
      );
    const raw = await request.text();
    if (raw.length > 4096)
      return NextResponse.json(
        { error: "Requisição muito grande." },
        { status: 413, headers },
      );
    let shortcode: string;
    try {
      const body = JSON.parse(raw);
      if (typeof body?.url !== "string") throw Error();
      shortcode = extractShortcode(body.url);
    } catch {
      return NextResponse.json(
        {
          error: "URL inválida. Informe um link de post ou reel do Instagram.",
        },
        { status: 400, headers },
      );
    }
    const client = new InstagramClient();
    const media = await findMedia(client, shortcode);
    const comments = await getComments(client, media.id);
    return NextResponse.json(
      { media, comments, importedAt: new Date().toISOString() },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof InstagramError
            ? error.message
            : "Não foi possível importar os comentários. Tente novamente.",
        code: error instanceof InstagramError ? error.code : "INTERNAL",
      },
      { status: error instanceof InstagramError ? error.status : 500, headers },
    );
  }
}
