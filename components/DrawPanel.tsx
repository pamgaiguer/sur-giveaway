import { curateParticipant } from "@/lib/giveaway/curation";
import { randomDraw } from "@/lib/giveaway/draw";
import { downloadJSON, resultText } from "@/lib/giveaway/export";
import type { DrawResult, Participant } from "@/lib/giveaway/types";
import {
  Copy,
  Download,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
export function DrawPanel({
  participants,
  alternates,
  setAlternates,
  snapshot,
  onLock,
}: {
  participants: Participant[];
  alternates: number;
  setAlternates: (n: number) => void;
  snapshot: unknown;
  onLock: (locked: boolean) => void;
}) {
  const [winners, setWinners] = useState(1);
  const [result, setResult] = useState<DrawResult | null>(null);
  const [pending, setPending] = useState<DrawResult | null>(null);
  const [frame, setFrame] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const eligible = participants.filter((p) => p.eligible);
  const busy = !!pending;
  useEffect(() => {
    if (!pending) return;
    const interval = setInterval(() => setFrame((f) => f + 1), 80);
    const timeout = setTimeout(() => {
      setResult(pending);
      setPending(null);
    }, 1600);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pending]);
  function reveal(next: DrawResult) {
    onLock(true);
    setError("");
    setNotice("");
    setResult(null);
    setPending(next);
  }
  return (
    <section className="card draw-card">
      <div className="section-heading">
        <span className="step">03</span>
        <div>
          <h2>Hora do sorteio</h2>
          <p>Expectativa lá em cima. Chances em dia.</p>
        </div>
        <Trophy className="section-icon" />
      </div>
      <fieldset disabled={busy || !!result}>
        <div className="draw-controls">
          <label>
            Número de vencedores
            <input
              className="number"
              type="number"
              min="1"
              max="100"
              value={winners}
              onChange={(e) =>
                setWinners(Math.max(1, Math.min(100, Number(e.target.value))))
              }
            />
          </label>
          <label>
            Número de suplentes
            <input
              className="number"
              type="number"
              min="0"
              max="100"
              value={alternates}
              onChange={(e) =>
                setAlternates(
                  Math.max(0, Math.min(100, Number(e.target.value))),
                )
              }
            />
          </label>
          <button
            className="primary draw-button"
            disabled={eligible.length < winners + alternates}
            onClick={() => {
              try {
                reveal(randomDraw(participants, winners, alternates));
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Shuffle size={20} /> SORTEAR 🤘
          </button>
        </div>
      </fieldset>
      <p className="hint">
        {eligible.length} elegíveis · {winners + alternates} participantes
        distintos necessários · Aleatoriedade com Web Crypto
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {pending && (
        <div className="reveal" role="status">
          <span className="badge">
            {pending.mode === "curation"
              ? "CURADORIA / SIMULAÇÃO"
              : "SORTEANDO"}
          </span>
          <h2 className="rolling">
            @
            {participants[frame % Math.max(1, participants.length)]?.username ||
              "…"}
          </h2>
          <p>Preparando o resultado…</p>
        </div>
      )}
      {result && (
        <div className="reveal" aria-live="polite">
          <span className="badge">
            {result.mode === "random"
              ? "SORTEIO — RESULTADO FINAL"
              : "SORTEIO - RESULTADO FINAL - CURADORIA"}
          </span>
          {result.winners.map((w) => (
            <div key={w.username}>
              <p className="eyebrow">
                {result.mode === "random"
                  ? "🏆 VENCEDOR"
                  : "PARTICIPANTE SELECIONADO"}
              </p>
              <h2>@{w.username || "indisponível"}</h2>
              {w.comment.source !== "images" && (
                <p className="hint">
                  {result.mode === "random"
                    ? "Comentário vencedor"
                    : "Comentário selecionado"}
                </p>
              )}
              {w.comment.source !== "images" && (
                <blockquote>“{w.comment.text}”</blockquote>
              )}
            </div>
          ))}
          {!!result.alternates.length && (
            <div className="alternates">
              <h3>🥈 Suplentes</h3>
              {result.alternates.map((w, i) => (
                <p key={w.username}>
                  {i + 1}. @{w.username}
                </p>
              ))}
            </div>
          )}
          <small>{new Date(result.createdAt).toLocaleString("pt-BR")}</small>
          <div className="result-actions">
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(resultText(result));
                  setNotice("Resultado copiado.");
                } catch {
                  setNotice("Não foi possível copiar. Exporte o JSON.");
                }
              }}
            >
              <Copy size={15} /> Copiar resultado
            </button>
            <button
              onClick={() =>
                downloadJSON({ schemaVersion: 1, ...result, snapshot })
              }
            >
              <Download size={15} /> Exportar JSON
            </button>
            <button
              onClick={() => {
                setResult(null);
                setNotice("");
                onLock(false);
              }}
            >
              <RotateCcw size={15} /> Novo sorteio
            </button>
          </div>
          <p role="status" className="hint">
            {notice}
          </p>
        </div>
      )}
      <details className="advanced">
        <summary>
          <SlidersHorizontal size={16} /> Configurações avançadas
        </summary>
        <h3>Modo Curadoria / Simulação</h3>
        <p className="hint">
          Seleção manual para testes ou decisões editoriais. O resultado será
          identificado como curadoria e não representa um sorteio aleatório.
        </p>
        <input
          aria-label="Pesquisar participante para curadoria"
          placeholder="Pesquisar participante para selecionar…"
          value={search}
          disabled={busy || !!result}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <div className="curation-options">
            {participants
              .filter((p) =>
                p.username.includes(search.toLowerCase().replace(/^@/, "")),
              )
              .slice(0, 10)
              .map((p) => (
                <button
                  key={p.username}
                  disabled={busy || !!result}
                  onClick={() => reveal(curateParticipant(p))}
                >
                  Selecionar @{p.username || "indisponível"}{" "}
                  <span className="badge">CURADORIA</span>
                </button>
              ))}
          </div>
        )}
      </details>
    </section>
  );
}
