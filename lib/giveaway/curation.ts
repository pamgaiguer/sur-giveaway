import type { DrawResult, Participant } from "./types";
export function curateParticipant(participant: Participant): DrawResult {
  if (!participant.comments.length)
    throw new Error("Participante sem comentários.");
  return {
    mode: "curation",
    createdAt: new Date().toISOString(),
    winners: [
      { username: participant.username, comment: participant.comments[0] },
    ],
    alternates: [],
  };
}
