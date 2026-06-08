import type { Dispatch, SetStateAction } from "react";
import type { Asset, AssetGroup } from "./types";

export interface AssetDataDeps {
  assets: Asset[];
  searchQuery: string;
  selectedChannel: string;
  selectedTopic: string;
  isUploadDialogOpen: boolean;
  setAssets: Dispatch<SetStateAction<Asset[]>>;
  setAssetGroups: Dispatch<SetStateAction<AssetGroup[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setSearching: Dispatch<SetStateAction<boolean>>;
}
