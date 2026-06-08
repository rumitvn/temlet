import type { Dispatch, SetStateAction } from "react";
import type { Asset, AssetGroup, SK3QLRContent, Toast } from "./types";

type ProviderSelectionConfig = {
  title: string;
  description?: string;
  onSelect: (provider: "openai" | "grok" | "comfyui") => void;
} | null;

type BatchProgress = {
  current: number;
  total: number;
  subject: string;
} | null;

type BoolMap = { [key: string]: boolean };

export interface AssetActionsDeps {
  // State values (owned by the page)
  assets: Asset[];
  assetGroups: AssetGroup[];
  filteredAssets: Asset[];
  selectedChannel: string;
  selectedTopic: string;
  selectedAssets: string[];
  editingImage: { asset: Asset; type: "main" | "quiz3" } | null;
  aiPrompt: string;
  aiDescription: string;
  aiLanguage: string;
  aiProvider: string;
  existingOrders: number[];
  previewItems: SK3QLRContent[];
  batchSize: number;
  subjectsList: string;
  batchGenerating: boolean;
  isBatchMode: boolean;
  // Data fetch
  fetchAssets: (searchTerm?: string, isSearch?: boolean) => Promise<void>;
  // Setters
  setAssets: Dispatch<SetStateAction<Asset[]>>;
  setAssetGroups: Dispatch<SetStateAction<AssetGroup[]>>;
  setSelectedAssets: Dispatch<SetStateAction<string[]>>;
  setEditingImage: Dispatch<
    SetStateAction<{ asset: Asset; type: "main" | "quiz3" } | null>
  >;
  setAiPrompt: Dispatch<SetStateAction<string>>;
  setAiGenerating: Dispatch<SetStateAction<boolean>>;
  setBatchGenerating: Dispatch<SetStateAction<boolean>>;
  setBatchProgress: Dispatch<SetStateAction<BatchProgress>>;
  setExistingOrders: Dispatch<SetStateAction<number[]>>;
  setPreviewItems: Dispatch<SetStateAction<SK3QLRContent[]>>;
  setPreviewAsset: Dispatch<SetStateAction<Asset | null>>;
  setPreviewVideoMode: Dispatch<SetStateAction<boolean>>;
  setProviderSelectionConfig: Dispatch<SetStateAction<ProviderSelectionConfig>>;
  setShowAIGenerator: Dispatch<SetStateAction<boolean>>;
  setShowImageEditor: Dispatch<SetStateAction<boolean>>;
  setShowImageGenerationDialog: Dispatch<SetStateAction<boolean>>;
  setShowPreview: Dispatch<SetStateAction<boolean>>;
  setShowProviderSelectionDialog: Dispatch<SetStateAction<boolean>>;
  setShowSuccessDialog: Dispatch<SetStateAction<boolean>>;
  setSuccessMessage: Dispatch<SetStateAction<string>>;
  setToast: Dispatch<SetStateAction<Toast | null>>;
  setUploadingStates: Dispatch<SetStateAction<BoolMap>>;
  setVoiceGeneratingStates: Dispatch<SetStateAction<BoolMap>>;
}

/**
 * Context passed to the per-domain handler factories. Extends the page-owned
 * deps with the hook-owned state the factories need.
 */
export interface AssetActionsCtx extends AssetActionsDeps {
  imageGeneratingStates: BoolMap;
  setImageGeneratingStates: Dispatch<SetStateAction<BoolMap>>;
}
