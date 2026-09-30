import { ArrowRight, Camera, LoaderCircle, ExternalLink } from "lucide-react";
import Image from "next/image";
import type { ImportedPost } from "@/lib/instagram/types";
export function PostImporter({
  loading,
  post,
  onImport,
}: {
  loading: boolean;
  post: ImportedPost | null;
  onImport: (url: string) => void;
}) {
  return (
    <section className="card">
      <div className="section-heading">
        <span className="step">01</span>
        <div>
          <h2>Comece pelo post</h2>
          <p>O próximo nome da lista pode estar aqui.</p>
        </div>
        <Camera className="section-icon" />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onImport(String(new FormData(e.currentTarget).get("url")));
        }}
      >
        <label htmlFor="post-url">Link do post do Instagram</label>
        <div className="import-row">
          <input
            id="post-url"
            name="url"
            type="url"
            required
            placeholder="https://www.instagram.com/p/…"
            disabled={loading}
          />
          <button className="primary" disabled={loading}>
            {loading ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <ArrowRight size={17} />
            )}{" "}
            {loading ? "Carregando…" : "Carregar comentários"}
          </button>
        </div>
        <p className="hint">
          Posts e reels da conta conectada · Integração oficial com a Meta
        </p>
      </form>
      {post && (
        <div className="post-preview">
          {(post.media.thumbnail_url ||
            (post.media.media_type === "IMAGE" && post.media.media_url)) && (
            <Image
              unoptimized
              width={70}
              height={80}
              src={(post.media.thumbnail_url || post.media.media_url)!}
              alt="Miniatura do post importado"
              referrerPolicy="no-referrer"
            />
          )}
          <div>
            <span className="badge success">Post encontrado</span>
            <p>{post.media.caption?.slice(0, 200) || "Post sem legenda"}</p>
            <small>
              {post.comments.length} comentários carregados ·{" "}
              {
                new Set(post.comments.map((c) => c.username).filter(Boolean))
                  .size
              }{" "}
              usuários únicos
              {post.media.timestamp &&
                ` · ${new Date(post.media.timestamp).toLocaleDateString("pt-BR")}`}
            </small>
          </div>
          <a
            href={post.media.permalink}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir post no Instagram"
          >
            <ExternalLink size={18} />
          </a>
        </div>
      )}
    </section>
  );
}
