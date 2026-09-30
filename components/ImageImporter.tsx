"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Images, Upload, X } from "lucide-react";
import {
  createImageImport,
  extractHandles,
  reviewHandles,
  validateImages,
  type ImageImport,
} from "@/lib/images/participants";
import { readImages } from "@/lib/images/ocr";
interface Attachment {
  file: File;
  url: string;
  id: string;
}
export function ImageImporter({
  onImport,
  onInvalidate,
  onBusy,
  locked,
}: {
  onImport: (data: ImageImport) => void;
  onInvalidate: () => void;
  onBusy: (value: boolean) => void;
  locked: boolean;
}) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const refs = useRef<Attachment[]>([]);
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [raw, setRaw] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [finished, setFinished] = useState(false);
  useEffect(
    () => () => {
      controller.current?.abort();
      refs.current.forEach((a) => URL.revokeObjectURL(a.url));
    },
    [],
  );
  const review = reviewHandles(text);
  function invalidate() {
    setReviewed(false);
    setConfirmed(false);
    onInvalidate();
  }
  function select(files: File[]) {
    if (busy || locked) return;
    try {
      validateImages([...attachments.map((a) => a.file), ...files]);
      const next = [
        ...attachments,
        ...files.map((file) => ({
          file,
          url: URL.createObjectURL(file),
          id: crypto.randomUUID(),
        })),
      ];
      refs.current = next;
      setAttachments(next);
      setText("");
      setRaw([]);
      setFinished(false);
      invalidate();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function read() {
    if (busy || locked) return;
    invalidate();
    setBusy(true);
    onBusy(true);
    setError("");
    setText("");
    setRaw([]);
    setFinished(false);
    setProgress("Preparando leitura…");
    const abort = new AbortController();
    controller.current = abort;
    try {
      const texts = await readImages(
        attachments.map((a) => a.file),
        setProgress,
        abort.signal,
      );
      setRaw(texts);
      setText(
        extractHandles(texts.join("\n"))
          .map((u) => "@" + u)
          .join("\n"),
      );
      setFinished(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível ler as imagens. Tente outro print.",
      );
    } finally {
      setBusy(false);
      onBusy(false);
      controller.current = null;
    }
  }
  return (
    <section className="card">
      <div className="section-heading">
        <span className="step">01</span>
        <div>
          <h2>Traga a galera para o sorteio</h2>
          <p>Envie os prints e confira os @usuários encontrados.</p>
        </div>
        <Images className="section-icon" />
      </div>
      <fieldset disabled={locked || busy}>
        <div
          className="image-drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            select([...e.dataTransfer.files]);
          }}
        >
          <Upload size={25} />
          <label htmlFor="screenshots">
            Adicionar imagens dos participantes
          </label>
          <p>Até 5 imagens · PNG, JPG ou WebP · Até 10 MB por imagem</p>
          <input
            id="screenshots"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(e) => {
              select([...(e.target.files || [])]);
              e.target.value = "";
            }}
          />
        </div>
        <div className="image-previews">
          {attachments.map((a) => (
            <div key={a.id}>
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Ampliar ${a.file.name}`}
              >
                <Image
                  unoptimized
                  src={a.url}
                  width={160}
                  height={110}
                  alt={a.file.name}
                />
              </a>
              <small>{a.file.name}</small>
              <button
                aria-label={`Remover ${a.file.name}`}
                onClick={() => {
                  URL.revokeObjectURL(a.url);
                  const next = attachments.filter((b) => a.id !== b.id);
                  refs.current = next;
                  setAttachments(next);
                  setText("");
                  setRaw([]);
                  setFinished(false);
                  invalidate();
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="primary"
          disabled={!attachments.length}
          onClick={read}
        >
          <Images size={17} /> Ler @usuários das imagens
        </button>
      </fieldset>
      <p className="hint">
        As imagens são lidas neste navegador. Não precisa conectar o Instagram
        nem fornecer chaves.
      </p>
      {busy && (
        <div className="notice" role="status">
          {progress}{" "}
          <button onClick={() => controller.current?.abort()}>
            Cancelar leitura
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {finished && (
        <fieldset disabled={busy || locked}>
          <div className="divider" />
          <h3>Revise a lista antes de continuar</h3>
          <p className="notice">
            A leitura pode confundir caracteres e capturar pessoas marcadas.
            Confira com os prints, remova quem não participa e acrescente
            autores que ficaram de fora, inclusive nomes sem @ na imagem.
          </p>
          <details className="advanced">
            <summary>Ver texto lido nas imagens</summary>
            {raw.map((value, i) => (
              <div key={i}>
                <h3>{attachments[i]?.file.name}</h3>
                <pre className="ocr-text">
                  {value || "Nenhum texto reconhecido."}
                </pre>
              </div>
            ))}
          </details>
          <label htmlFor="review-handles">
            Participantes revisados — um @usuário por linha
          </label>
          <textarea
            id="review-handles"
            rows={8}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              invalidate();
            }}
            placeholder="@usuario1"
          />
          <p className="hint">
            {review.usernames.length} usuários únicos · {review.duplicates}{" "}
            repetições removidas · Uma chance por usuário
          </p>
          {!review.usernames.length && (
            <p className="notice">
              Nenhum @usuário encontrado. Você pode preencher a lista acima
              consultando os prints.
            </p>
          )}
          {!!review.invalid.length && (
            <p role="alert" className="error">
              Linhas inválidas: {review.invalid.slice(0, 5).join(", ")}
            </p>
          )}
          <label className="option">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => {
                setReviewed(e.target.checked);
                setConfirmed(false);
                onInvalidate();
              }}
            />{" "}
            Conferi os nomes e confirmo que esta é a lista de participantes.
          </label>
          <button
            className="primary"
            disabled={
              !reviewed ||
              !review.usernames.length ||
              !!review.invalid.length ||
              confirmed
            }
            onClick={() => {
              onImport(
                createImageImport(
                  text,
                  attachments.map((a) => a.file.name),
                ),
              );
              setConfirmed(true);
            }}
          >
            Usar lista no sorteio
          </button>
          {confirmed && (
            <p className="notice" role="status">
              Lista confirmada. Confira as exclusões abaixo e faça o sorteio ou
              uma seleção por curadoria.
            </p>
          )}
        </fieldset>
      )}
    </section>
  );
}
