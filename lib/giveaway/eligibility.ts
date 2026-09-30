import type { InstagramComment } from "@/lib/instagram/types";
import type { Participant, Rules } from "./types";
import { normalizeUsername } from "./normalize";
export function getParticipants(
  comments: InstagramComment[],
  rules: Rules,
  blacklist: string[],
): Participant[] {
  const blocked = new Set(blacklist.map(normalizeUsername));
  const grouped = new Map<string, InstagramComment[]>();
  for (const comment of comments) {
    const key = normalizeUsername(comment.username);
    const group = grouped.get(key);
    if (group) group.push(comment);
    else grouped.set(key, [comment]);
  }
  return [...grouped].map(([username, all]) => {
    const seen = new Set<string>();
    const validComments = all.filter((c) => {
      if (c.mentionedUsers.length < rules.minMentions) return false;
      if (rules.ignoreDuplicates && seen.has(c.text)) return false;
      seen.add(c.text);
      return true;
    });
    const exclusionReason = !username
      ? "Usuário indisponível"
      : blocked.has(username)
        ? "Na blacklist"
        : rules.ignoreOwner && username === "sempreumrock"
          ? "Conta organizadora"
          : !validComments.length
            ? "Sem comentário válido"
            : undefined;
    return {
      username,
      comments: all,
      validComments,
      eligible: !exclusionReason,
      exclusionReason,
      entries: exclusionReason
        ? 0
        : rules.entryMode === "user"
          ? 1
          : validComments.length,
    };
  });
}
