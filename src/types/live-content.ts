export type SyncedVideo = {
  title: string;
  description: string;
  videoId: string;
  href: string;
  publishedAt: string;
  tag: string;
};

export type SyncedNewsItem = {
  title: string;
  description: string;
  href: string;
  publishedAt: string;
  source: string;
  image?: string;
};

export type FeedSourceStatus = {
  name: string;
  ok: boolean;
  items: number;
};

export type LiveContentFeed = {
  generatedAt: string;
  videos: SyncedVideo[];
  news: SyncedNewsItem[];
  sources: FeedSourceStatus[];
};
