import { useState } from "react";
import { Search, Users } from "lucide-react";
import type { Participant } from "@/lib/giveaway/types";
export function ParticipantTable({
  participants,
  imagesOnly = false,
}: {
  imagesOnly?: boolean;
  participants: Participant[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const filtered = participants.filter((p) =>
    p.username.includes(search.toLowerCase().replace(/^@/, "")),
  );
  const current = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 20) - 1),
  );
  return (
    <div className="participant-list">
      <div className="search">
        <Search size={17} />
        <input
          aria-label="Pesquisar participante por username"
          placeholder="Pesquisar por @username"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
      </div>
      {!participants.length ? (
        <div className="empty">
          <div className="empty-icon">
            <Users size={28} />
          </div>
          <h3>A galera aparece aqui</h3>
          <p>
            Importe participantes para visualizar os nomes
            <br />e conferir quem está participando.
          </p>
        </div>
      ) : (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Participante / origem</th>
                  <th>{imagesOnly ? "Registros" : "Comentários"}</th>
                  <th>Chances</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(current * 20, current * 20 + 20).map((p) => (
                  <tr key={p.username}>
                    <td>
                      <details>
                        <summary>
                          <strong>@{p.username || "indisponível"}</strong>
                          <span className="comment-preview">
                            {p.comments[0]?.source === "images"
                              ? "Lista revisada de imagens"
                              : p.comments[0]?.text}
                          </span>
                          <small>
                            Ver {p.comments.length}{" "}
                            {imagesOnly ? "registro(s)" : "comentário(s)"}
                          </small>
                        </summary>
                        <div className="comments">
                          {p.comments.map((c) => (
                            <div key={c.id}>
                              <p>
                                {c.source === "images"
                                  ? "Nome confirmado na revisão dos prints"
                                  : c.text || "(sem texto)"}
                              </p>
                              <small>
                                {c.mentionedUsers
                                  .map((u) => `@${u}`)
                                  .join(" · ") || "Sem marcações"}
                                {c.timestamp &&
                                  ` · ${new Date(c.timestamp).toLocaleString("pt-BR")}`}
                              </small>
                            </div>
                          ))}
                        </div>
                      </details>
                    </td>
                    <td>{p.comments.length}</td>
                    <td>{p.entries}</td>
                    <td>
                      <span
                        className={`badge ${p.eligible ? "success" : "muted"}`}
                      >
                        {p.eligible ? "Elegível" : "Excluído"}
                      </span>
                      {p.exclusionReason && (
                        <small className="reason">{p.exclusionReason}</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && (
            <p className="hint">Nenhum participante encontrado.</p>
          )}
          <div className="pagination">
            <small>
              {filtered.length} participantes · Página {current + 1}
            </small>
            <button
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Anterior
            </button>
            <button
              disabled={(current + 1) * 20 >= filtered.length}
              onClick={() => setPage(current + 1)}
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </div>
  );
}
