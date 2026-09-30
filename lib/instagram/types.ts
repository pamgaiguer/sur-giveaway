export interface InstagramComment {
  source?: "images";
  id: string;
  username: string;
  text: string;
  timestamp?: string;
  mentionedUsers: string[];
}
export interface InstagramMedia {
  id: string;
  permalink: string;
  caption?: string;
  timestamp?: string;
  thumbnail_url?: string;
  media_url?: string;
  media_type?: string;
}
export interface ImportedPost {
  media: InstagramMedia;
  comments: InstagramComment[];
  importedAt: string;
}
export interface RawComment {
  id: string;
  username?: string;
  text?: string;
  timestamp?: string;
}
