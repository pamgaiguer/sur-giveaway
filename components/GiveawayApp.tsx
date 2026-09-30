"use client";
import { useMemo, useState } from "react";
import {
  AudioLines,
  LockKeyhole,
  ArrowUpRight,
  ListFilter,
} from "lucide-react";
import { ImageImporter } from "./ImageImporter";
import type { ImageImport } from "@/lib/images/participants";
import { PostImporter } from "./PostImporter";
import { GiveawayRules } from "./GiveawayRules";
import { ParticipantTable } from "./ParticipantTable";
import { DrawPanel } from "./DrawPanel";
import { useLocalSettings } from "./useLocalSettings";
import { getParticipants } from "@/lib/giveaway/eligibility";
import { parseBlacklist } from "@/lib/giveaway/normalize";
import type { ImportedPost } from "@/lib/instagram/types";
export function GiveawayApp() {
  const [imageImport, setImageImport] = useState<ImageImport | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [source, setSource] = useState<"images" | "instagram">("images");
  const [post, setPost] = useState<ImportedPost | null>(null);
  const {
    settings,
    update,
    notice: storageNotice,
    freeze,
  } = useLocalSettings();
  const { blacklist, alternates } = settings;
  const rules = useMemo(
    () =>
      source === "images"
        ? {
            ...settings.rules,
            entryMode: "user" as const,
            minMentions: 0,
            ignoreDuplicates: false,
          }
        : settings.rules,
    [settings.rules, source],
  );
  const setAlternates = (alternates: number) => update({ alternates });
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const participants = useMemo(
    () =>
      getParticipants(
        imageImport?.comments || post?.comments || [],
        rules,
        parseBlacklist(blacklist),
      ),
    [imageImport, post, rules, blacklist],
  );
  const eligible = participants.filter((p) => p.eligible).length;
  async function importPost(url: string) {
    setLoading(true);
    setError("");
    setPost(null);
    try {
      const response = await fetch("/api/instagram/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(290000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Não foi possível importar o post.");
      setPost(data);
    } catch (e) {
      setError(
        e instanceof Error &&
          e.name !== "TimeoutError" &&
          e.name !== "SyntaxError"
          ? e.message
          : "A importação não foi concluída. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }
  const stats = [
    [
      source === "images" ? "Nomes importados" : "Comentários",
      imageImport?.usernames.length || post?.comments.length || 0,
    ],
    ["Usuários únicos", participants.filter((p) => p.username).length],
    ["Elegíveis", eligible],
    ["Excluídos", participants.filter((p) => !p.eligible).length],
    ["Total de chances", participants.reduce((n, p) => n + p.entries, 0)],
  ];
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <AudioLines size={25} />
          </span>
          <div>
            SUR <span>GIVEAWAY</span>
            <small>Sempre Um Rock — Instagram Giveaway Tool</small>
          </div>
        </div>
        <span className="internal">
          <LockKeyhole size={13} /> FERRAMENTA INTERNA
        </span>
      </header>
      <main>
        <div className="hero">
          <div>
            <p className="eyebrow">
              <span className="red-line" /> SEMPRE UM ROCK PRESENTS
            </p>
            <h1>
              A sorte também
              <br />
              faz parte do show<span>.</span>
            </h1>
            <p>
              Envie os prints. Confira os nomes. Encontre o próximo vencedor.
            </p>
          </div>
          <a
            href="https://www.instagram.com/sempreumrock/"
            target="_blank"
            rel="noreferrer"
            className="account"
          >
            @sempreumrock <ArrowUpRight size={16} />
          </a>
        </div>
        <nav className="progress" aria-label="Etapas">
          <span className="active">
            <b>01</b> Importar participantes
          </span>
          <i />
          <span className={post || imageImport ? "active" : ""}>
            <b>02</b> Conferir participantes
          </span>
          <i />
          <span className={eligible ? "active" : ""}>
            <b>03</b> Sortear
          </span>
        </nav>
        {storageNotice && (
          <p role="status" className="hint">
            {storageNotice}
          </p>
        )}
        <div
          className="source-tabs"
          role="group"
          aria-label="Origem dos participantes"
        >
          <button
            disabled={locked || loading || imageBusy}
            aria-pressed={source === "images"}
            onClick={() => {
              setSource("images");
              setPost(null);
              setError("");
            }}
          >
            Importar imagens
          </button>
          <button
            disabled={locked || loading || imageBusy}
            aria-pressed={source === "instagram"}
            onClick={() => {
              setSource("instagram");
              setImageImport(null);
              setError("");
            }}
          >
            Link do Instagram (API)
          </button>
        </div>
        {source === "images" ? (
          <ImageImporter
            locked={locked}
            onBusy={setImageBusy}
            onInvalidate={() => {
              setImageImport(null);
              setPost(null);
            }}
            onImport={setImageImport}
          />
        ) : (
          <fieldset disabled={locked || loading}>
            <PostImporter loading={loading} post={post} onImport={importPost} />
          </fieldset>
        )}
        {loading && (
          <p role="status" className="notice">
            Buscando mídias, comentários e respostas. Posts grandes podem levar
            alguns minutos.
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {post && !post.comments.length && (
          <p role="status" className="notice">
            Nenhum comentário disponível neste post. Tente outro post ou importe
            novamente mais tarde.
          </p>
        )}
        <section className="card">
          <div className="section-heading">
            <span className="step">02</span>
            <div>
              <h2>Quem está no jogo</h2>
              <p>Confira os participantes e ajuste as regras.</p>
            </div>
            <ListFilter className="section-icon" />
          </div>
          <div className="stats">
            {stats.map(([label, value]) => (
              <div key={label}>
                <strong>{Number(value).toLocaleString("pt-BR")}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="participants-layout">
            <ParticipantTable
              imagesOnly={source === "images"}
              participants={participants}
            />
            <fieldset disabled={locked || loading}>
              <GiveawayRules
                rules={rules}
                imagesOnly={source === "images"}
                onChange={(rules) => update({ rules })}
                blacklist={blacklist}
                onBlacklist={(blacklist) => update({ blacklist })}
              />
            </fieldset>
          </div>
        </section>
        {locked && (
          <p className="notice">
            Regras e participantes preservados para este resultado. Clique em
            “Novo sorteio” para editar.
          </p>
        )}
        <DrawPanel
          participants={participants}
          alternates={alternates}
          setAlternates={setAlternates}
          onLock={(value) => {
            if (value) freeze();
            setLocked(value);
          }}
          snapshot={{
            source,
            files: imageImport?.files,
            media: post?.media,
            importedAt: imageImport?.importedAt || post?.importedAt,
            rules,
            blacklist: parseBlacklist(blacklist),
            participants,
          }}
        />
        <footer>
          <span className="footer-brand">
            SUR <span>GIVEAWAY</span>
          </span>
          <p>Feito para quem vive a música.</p>
          <small>Sempre Um Rock · Uso interno</small>
        </footer>
      </main>
    </>
  );
}
