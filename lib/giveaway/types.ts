import type { InstagramComment } from "@/lib/instagram/types";
export interface Rules {
  entryMode: "user" | "comment";
  minMentions: number;
  ignoreDuplicates: boolean;
  ignoreOwner: boolean;
}
export interface Participant {
  username: string;
  comments: InstagramComment[];
  validComments: InstagramComment[];
  entries: number;
  eligible: boolean;
  exclusionReason?: string;
}
export interface Selection {
  username: string;
  comment: InstagramComment;
}
export interface DrawResult {
  mode: "random" | "curation";
  createdAt: string;
  winners: Selection[];
  alternates: Selection[];
}
export const defaultRules: Rules = {
  entryMode: "user",
  minMentions: 0,
  ignoreDuplicates: true,
  ignoreOwner: true,
};
