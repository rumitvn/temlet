export interface Asset {
  id: string;
  name: string;
  type: "voice" | "image" | "video" | "json";
  category: string;
  path: string;
  size?: number;
  lastModified?: Date;
  status: "available" | "missing" | "processing";
  key?: string; // Animal key like 'bear', 'cat', etc.
  order?: number; // Order number for JSON files
  rendered?: boolean; // Whether this asset has been rendered
  renderJson?: string; // JSON file used for rendering
}

export interface AssetCategory {
  id: string;
  name: string;
  type: "voice" | "image" | "video" | "json";
  count: number;
  path: string;
}

// New interface for JSON-Voice pairs
export interface JSONVoicePair {
  json: Asset;
  voices: Asset[];
  hasAllVoices: boolean;
  missingVoices: string[];
  voiceTypes: {
    intro: boolean;
    quiz1_question: boolean;
    quiz1_answer: boolean;
    quiz2_question: boolean;
    quiz2_answer: boolean;
    quiz3_question: boolean;
    quiz3_answer: boolean;
    lesson: boolean;
    reward: boolean;
  };
}

// Updated interface for JSON-Asset pairs (JSON, Voices, and Rewards)
export interface JSONAssetPair {
  json: Asset;
  voices: Asset[];
  reward?: Asset;
  hasAllVoices: boolean;
  hasReward: boolean;
  missingVoices: string[];
  voiceTypes: {
    intro: boolean;
    quiz1_question: boolean;
    quiz1_answer: boolean;
    quiz2_question: boolean;
    quiz2_answer: boolean;
    quiz3_question: boolean;
    quiz3_answer: boolean;
    lesson: boolean;
    reward: boolean;
  };
  // Quiz 3 image options status
  quiz3ImageOptions: {
    options: string[];
    availableImages: string[];
    missingImages: string[];
    hasAllImages: boolean;
    completionRate: number;
  };
}

export interface AssetGroup {
  key: string;
  name: string;
  assets: {
    images: Asset[]; // Changed from single image to array to handle multiple orders
    videos: Asset[];
    voices: Asset[];
    jsons: Asset[];
    rewards: Asset[];
    jsonAssetPairs: JSONAssetPair[]; // Updated field for organized JSON-Asset pairs
  };
  renderStatus: {
    hasJson: boolean;
    hasImage: boolean;
    hasVideos: boolean;
    hasVoices: boolean;
    isComplete: boolean;
    requiredVoices: number; // 9 voices per JSON
    availableVoices: number;
    requiredRewards: number; // 1 reward per JSON
    availableRewards: number;
    requiredImages: number; // 1 image per JSON (with order numbers)
    availableImages: number;
    requiredVideos: number; // 1 video per JSON (with order numbers)
    availableVideos: number;
    jsonOrders: number[]; // Which JSON orders exist (1, 2, 3, etc.)
    imageOrders: number[]; // Which image orders exist (1, 2, 3, etc.)
    videoOrders: number[]; // Which video orders exist (1, 2, 3, etc.)
    // Quiz 3 image options status
    hasQuiz3Images: boolean;
    requiredQuiz3Images: number; // 4 images per JSON
    availableQuiz3Images: number;
  };
}

export interface SK3QLRContent {
  id: string; // Add unique ID to prevent duplicate keys
  key: string;
  order: number;
  intro: {
    text: string;
    voice: string;
  };
  quiz_1: {
    question: {
      text: string;
      voice: string;
    };
    options: string[];
    answer: {
      position: number;
      voice: string;
    };
  };
  quiz_2: {
    question: {
      text: string;
      voice: string;
    };
    options: string[];
    answer: {
      position: number;
      voice: string;
    };
  };
  quiz_3: {
    question: {
      text: string;
      voice: string;
    };
    options: string[];
    answer: {
      position: number;
      voice: string;
    };
  };
  lesson: {
    voice: string;
  };
  reward: {
    voice: string;
  };
}

export interface OverviewStatus {
  totalGroups: number;
  completeGroups: number;
  incompleteGroups: number;
  missingJson: number;
  missingImage: number;
  missingVideos: number;
  missingVoices: number;
  missingRewards: number;
  missingQuiz3Images: number;
  completionRate: number;
}

// Interface for missing resource types
export interface MissingResource {
  type: "image" | "quiz3-image" | "video" | "reward";
  label: string;
  icon: string;
  color: string;
  count: number;
  description: string;
  // For quiz3-image and reward, we need specific items
  items?: MissingItem[];
}

// Interface for specific missing items
export interface MissingItem {
  name: string;
  key: string;
  jsonOrder?: number; // For rewards
  description: string;
}

// Interface for group upload item
export interface GroupUploadItem {
  key: string;
  name: string;
  missingResources: MissingResource[];
  priority: number; // Higher number = higher priority
  jsonOrders: number[];
}

export interface CrawlerResource {
  name: string;
  path: string;
  url: string;
}

export type ResourceType = "image" | "video" | "quiz3-image";
export type ApiResourceType = "image" | "video";
export type ResourceTarget = "main" | "quiz3";

export interface SelectionState {
  [key: string]: {
    isSelected: boolean;
    isLoading: boolean;
    error?: string;
  };
}

export interface Toast {
  message: string;
  type: "success" | "error" | "info";
}
