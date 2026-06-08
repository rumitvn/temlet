import type { Asset, AssetGroup } from "./types";

type StatusFilter =
  | "all"
  | "complete"
  | "missing-json"
  | "missing-image"
  | "missing-videos"
  | "missing-voices"
  | "missing-rewards"
  | "missing-quiz3-images"
  | "incomplete";

export interface AssetDerivationsDeps {
  assets: Asset[];
  assetGroups: AssetGroup[];
  searchQuery: string;
  sortBy: "name" | "createDate";
  sortOrder: "asc" | "desc";
  statusFilter: StatusFilter;
  currentPage: number;
  itemsPerPage: number;
  uploadSearchQuery: string;
  uploadResourceFilter: "all" | "image" | "video" | "quiz3-image" | "reward";
  uploadSortBy: "priority" | "name" | "count";
  uploadSortOrder: "asc" | "desc";
}
