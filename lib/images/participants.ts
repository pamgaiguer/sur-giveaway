import type { InstagramComment } from "@/lib/instagram/types";
export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export function validateImages(files: Pick<File, "type" | "size">[]) {
  if (!files.length || files.length > MAX_IMAGES)
    throw new Error("Selecione entre 1 e 5 imagens.");
  if (
    files.some(
      (f) => !["image/png", "image/jpeg", "image/webp"].includes(f.type),
    )
  )
    throw new Error("Use apenas imagens PNG, JPG ou WebP.");
  if (files.some((f) => f.size > MAX_IMAGE_BYTES || f.size === 0))
    throw new Error("Cada imagem precisa ter conteúdo e no máximo 10 MB.");
}
export function extractHandles(text: string): string[] {
  // Only explicit @handles: never guess a name from arbitrary OCR prose.
  return [
    ...new Set(
      [...text.matchAll(/(?:^|[^\w.@])@([a-zA-Z0-9_.]+)/g)]
        .map((m) => m[1].replace(/\.+$/, "").toLowerCase())
        .filter(validHandle),
    ),
  ];
}
function validHandle(value: string) {
  return (
    /^[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?$/.test(value) &&
    !value.includes("..")
  );
}
export function reviewHandles(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const line of lines) {
    const name = line.replace(/^@/, "").toLowerCase();
    if (validHandle(name)) valid.push(name);
    else invalid.push(line);
  }
  return {
    usernames: [...new Set(valid)],
    invalid,
    duplicates: valid.length - new Set(valid).size,
  };
}
export interface ImageImport {
  source: "images";
  importedAt: string;
  files: string[];
  usernames: string[];
  comments: InstagramComment[];
}
export function createImageImport(text: string, files: string[]): ImageImport {
  const { usernames, invalid } = reviewHandles(text);
  if (!usernames.length || invalid.length)
    throw new Error("Revise a lista: use um @usuário válido por linha.");
  return {
    source: "images",
    importedAt: new Date().toISOString(),
    files,
    usernames,
    comments: usernames.map((username) => ({
      id: `image:${username}`,
      username,
      text: "",
      mentionedUsers: [],
      source: "images" as const,
    })),
  };
}
