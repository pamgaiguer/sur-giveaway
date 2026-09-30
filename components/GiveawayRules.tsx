import type { Rules } from "@/lib/giveaway/types";
export function GiveawayRules({
  rules,
  onChange,
  blacklist,
  onBlacklist,
  imagesOnly = false,
}: {
  imagesOnly?: boolean;
  rules: Rules;
  onChange: (r: Rules) => void;
  blacklist: string;
  onBlacklist: (s: string) => void;
}) {
  return (
    <div className="rules">
      <h3>Regras de participação</h3>
      <p className="hint">Defina o que vale uma chance.</p>
      {imagesOnly && (
        <p className="notice">
          Uma chance por usuário revisado. Regras de comentários e menções não
          se aplicam aos prints.
        </p>
      )}
      <div hidden={imagesOnly}>
        <fieldset>
          <legend>Distribuição de chances</legend>
          <label className="option">
            <input
              type="radio"
              name="chance"
              checked={rules.entryMode === "user"}
              onChange={() => onChange({ ...rules, entryMode: "user" })}
            />{" "}
            Cada usuário = apenas 1 chance
          </label>
          <label className="option">
            <input
              type="radio"
              name="chance"
              checked={rules.entryMode === "comment"}
              onChange={() => onChange({ ...rules, entryMode: "comment" })}
            />{" "}
            Cada comentário válido = 1 chance
          </label>
        </fieldset>
        <label className="option">
          <input
            type="checkbox"
            checked={rules.minMentions > 0}
            onChange={(e) =>
              onChange({ ...rules, minMentions: e.target.checked ? 1 : 0 })
            }
          />{" "}
          Exigir @menções
        </label>
        {rules.minMentions > 0 && (
          <label className="inline-label">
            Mínimo de menções distintas
            <input
              aria-label="Mínimo de menções distintas"
              className="number"
              type="number"
              min="1"
              max="100"
              value={rules.minMentions}
              onChange={(e) =>
                onChange({
                  ...rules,
                  minMentions: Math.max(
                    1,
                    Math.min(100, Number(e.target.value)),
                  ),
                })
              }
            />
          </label>
        )}
        <label className="option">
          <input
            type="checkbox"
            checked={rules.ignoreDuplicates}
            onChange={(e) =>
              onChange({ ...rules, ignoreDuplicates: e.target.checked })
            }
          />{" "}
          Ignorar comentários duplicados idênticos
        </label>
      </div>
      <label className="option">
        <input
          type="checkbox"
          checked={rules.ignoreOwner}
          onChange={(e) =>
            onChange({ ...rules, ignoreOwner: e.target.checked })
          }
        />{" "}
        Ignorar comentários do @sempreumrock
      </label>
      <div className="divider" />
      <label htmlFor="blacklist">Blacklist manual</label>
      <textarea
        id="blacklist"
        rows={3}
        placeholder={"@usuario1\n@usuario2"}
        value={blacklist}
        onChange={(e) => onBlacklist(e.target.value)}
      />
      <p className="hint">
        Um usuário por linha. Salva apenas neste navegador.
      </p>
    </div>
  );
}
