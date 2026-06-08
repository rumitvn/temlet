"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  ChevronUpIcon
} from "@heroicons/react/24/outline";
import { 
  PhotoIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/solid";
import { config } from "../../lib/config";
import ImageGenerationDialog from "../components/ImageGenerationDialog";
import ProviderSelectionDialog from "../components/ProviderSelectionDialog";
import ImageEditor from "../components/ImageEditor";

interface Asset {
  id: string;
  name: string;
  type: 'voice' | 'image' | 'video' | 'json';
  category: string;
  path: string;
  size?: number;
  lastModified?: Date;
  status: 'available' | 'missing' | 'processing';
  key?: string; // Animal key like 'bear', 'cat', etc.
  order?: number; // Order number for JSON files
  rendered?: boolean; // Whether this asset has been rendered
  renderJson?: string; // JSON file used for rendering
}

interface AssetCategory {
  id: string;
  name: string;
  type: 'voice' | 'image' | 'video' | 'json';
  count: number;
  path: string;
}

// New interface for JSON-Voice pairs
interface JSONVoicePair {
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
interface JSONAssetPair {
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

  interface AssetGroup {
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

interface SK3QLRContent {
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

interface OverviewStatus {
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
interface MissingResource {
  type: 'image' | 'quiz3-image' | 'video' | 'reward';
  label: string;
  icon: string;
  color: string;
  count: number;
  description: string;
  // For quiz3-image and reward, we need specific items
  items?: MissingItem[];
}

// Interface for specific missing items
interface MissingItem {
  name: string;
  key: string;
  jsonOrder?: number; // For rewards
  description: string;
}

// Interface for group upload item
interface GroupUploadItem {
  key: string;
  name: string;
  missingResources: MissingResource[];
  priority: number; // Higher number = higher priority
  jsonOrders: number[];
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("minimate");
  const [selectedTopic, setSelectedTopic] = useState("animals");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showImageGenerationDialog, setShowImageGenerationDialog] = useState(false);
  const [showProviderSelectionDialog, setShowProviderSelectionDialog] = useState(false);
  const [providerSelectionConfig, setProviderSelectionConfig] = useState<{
    title: string;
    description?: string;
    onSelect: (provider: 'openai' | 'grok' | 'comfyui') => void;
  } | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Sync upload dialog state to prevent main search interference
  useEffect(() => {
    setIsUploadDialogOpen(showUploadDialog);
  }, [showUploadDialog]);

  // Optimized upload search handler - use ref to avoid re-renders
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const handleUploadSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Update state without causing re-render of the input
    setUploadSearchQuery(e.target.value);
  }, []);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [uploadingStates, setUploadingStates] = useState<{ [key: string]: boolean }>({});
  const [aiGenerating, setAiGenerating] = useState(false);

  // Image editor state
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingImage, setEditingImage] = useState<{ asset: Asset; type: 'main' | 'quiz3' } | null>(null);

  // Upload dialog search and filter state
  const [uploadSearchQuery, setUploadSearchQuery] = useState("");
  const [debouncedUploadSearchQuery, setDebouncedUploadSearchQuery] = useState("");
  const [uploadResourceFilter, setUploadResourceFilter] = useState<'all' | 'image' | 'video' | 'quiz3-image' | 'reward'>('all');
  const [uploadSortBy, setUploadSortBy] = useState<'priority' | 'name' | 'count'>('priority');
  const [uploadSortOrder, setUploadSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  // Removed groupSearchQuery state - no longer needed

  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewVideoMode, setPreviewVideoMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  // Sorting state
  const [sortBy, setSortBy] = useState<'name' | 'createDate'>('createDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Overview status filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'missing-json' | 'missing-image' | 'missing-videos' | 'missing-voices' | 'missing-rewards' | 'missing-quiz3-images' | 'incomplete'>('all');

  // Calculate missing resources for upload dialog
  const calculateMissingResources = useMemo((): GroupUploadItem[] => {
    console.log('🔄 calculateMissingResources triggered - assetGroups changed');
    const groups: GroupUploadItem[] = [];
    
    assetGroups.forEach(group => {
      const status = group.renderStatus;
      const missingResources: MissingResource[] = [];
      
      // Check for missing images (now per JSON order)
      if (status.requiredImages > status.availableImages) {
        const missingCount = status.requiredImages - status.availableImages;
        
        // Debug logging for frog group
        if (group.key === 'frog') {
          console.log(`🐸 Frog missing images calculation:`);
          console.log(`  Required images: ${status.requiredImages}`);
          console.log(`  Available images: ${status.availableImages}`);
          console.log(`  JSON orders: ${status.jsonOrders}`);
          console.log(`  Image orders: ${status.imageOrders}`);
          console.log(`  Available images:`, group.assets.images.map(img => ({ name: img.name, order: img.order })));
        }
        
        // Get specific missing images by JSON order
        const missingImageItems: MissingItem[] = [];
        group.assets.jsons.forEach(jsonAsset => {
          if (jsonAsset.order) {
            const hasImage = group.assets.images.some(image => image.order === jsonAsset.order);
            if (!hasImage) {
              missingImageItems.push({
                name: `Image ${jsonAsset.order}`,
                key: `image_${jsonAsset.order}`,
                jsonOrder: jsonAsset.order,
                description: `Upload main image for JSON order ${jsonAsset.order}`
              });
            }
          }
        });
        
        missingResources.push({
          type: 'image',
          label: 'Images',
          icon: '🖼️',
          color: 'bg-danger',
          count: missingCount,
          description: `Upload ${missingCount} main images`,
          items: missingImageItems
        });
      }
      
      // Check for missing videos (now per JSON order)
      if (status.requiredVideos > status.availableVideos) {
        const missingCount = status.requiredVideos - status.availableVideos;
        
        // Get specific missing videos by JSON order
        const missingVideoItems: MissingItem[] = [];
        group.assets.jsons.forEach(jsonAsset => {
          if (jsonAsset.order) {
            const hasVideo = group.assets.videos.some(video => video.order === jsonAsset.order);
            if (!hasVideo) {
              missingVideoItems.push({
                name: `Video ${jsonAsset.order}`,
                key: `video_${jsonAsset.order}`,
                jsonOrder: jsonAsset.order,
                description: `Upload video for JSON order ${jsonAsset.order}`
              });
            }
          }
        });
        
        missingResources.push({
          type: 'video',
          label: 'Videos',
          icon: '🎥',
          color: 'bg-danger',
          count: missingCount,
          description: `Upload ${missingCount} videos`,
          items: missingVideoItems
        });
      }
      
      // Check for missing quiz 3 images
      if (status.requiredQuiz3Images > status.availableQuiz3Images) {
        const missingCount = status.requiredQuiz3Images - status.availableQuiz3Images;
        
        // Get specific missing quiz 3 images
        const missingQuiz3Items: MissingItem[] = [];
        group.assets.jsonAssetPairs.forEach(pair => {
          pair.quiz3ImageOptions.missingImages.forEach(missingImage => {
            missingQuiz3Items.push({
              name: missingImage,
              key: missingImage,
              description: `Upload "${missingImage}" image for quiz 3 options`
            });
          });
        });
        
        // Only show quiz 3 images upload if there are actual missing items
        if (missingQuiz3Items.length > 0) {
          missingResources.push({
            type: 'quiz3-image',
            label: 'Quiz 3 Images',
            icon: '🖼️',
            color: 'bg-info',
            count: missingCount,
            description: `Upload ${missingCount} quiz 3 option images`,
            items: missingQuiz3Items
          });
        }
      }
      
      // Check for missing rewards
      if (status.requiredRewards > status.availableRewards) {
        const missingCount = status.requiredRewards - status.availableRewards;
        
        // Get specific missing rewards
        const missingRewardItems: MissingItem[] = [];
        group.assets.jsons.forEach(jsonAsset => {
          if (jsonAsset.order) {
            const hasReward = group.assets.rewards.some(reward => reward.order === jsonAsset.order);
            if (!hasReward) {
              missingRewardItems.push({
                name: `Reward ${jsonAsset.order}`,
                key: `reward_${jsonAsset.order}`,
                jsonOrder: jsonAsset.order,
                description: `Upload reward video for JSON order ${jsonAsset.order}`
              });
            }
          }
        });
        
        missingResources.push({
          type: 'reward',
          label: 'Rewards',
          icon: '🏆',
          color: 'bg-warning',
          count: missingCount,
          description: `Upload ${missingCount} reward videos`,
          items: missingRewardItems
        });
      }
      
      // Debug logging for frog group
      if (group.key === 'frog') {
        console.log(`🐸 Frog calculateMissingResources:`);
        console.log(`  Required images: ${status.requiredImages}`);
        console.log(`  Available images: ${status.availableImages}`);
        console.log(`  Required videos: ${status.requiredVideos}`);
        console.log(`  Available videos: ${status.availableVideos}`);
        console.log(`  Missing resources count: ${missingResources.length}`);
        console.log(`  Missing resources:`, missingResources.map(r => ({ type: r.type, count: r.count })));
      }
      
      // Only add groups that have missing resources
      if (missingResources.length > 0) {
        // Calculate priority based on missing resource types and counts
        let priority = 0;
        missingResources.forEach(resource => {
          switch (resource.type) {
            case 'image':
              priority += 100; // Highest priority
              break;
            case 'video':
              priority += 80;
              break;
            case 'quiz3-image':
              priority += 60;
              break;
            case 'reward':
              priority += 40;
              break;
          }
          priority += resource.count; // Add count to priority
        });
        
        groups.push({
          key: group.key,
          name: group.name,
          missingResources,
          priority,
          jsonOrders: status.jsonOrders
        });
      }
    });
    
    // Sort by priority (highest first)
    return groups.sort((a, b) => b.priority - a.priority);
  }, [assetGroups]);

  // Base missing resources (doesn't change with search) - memoized to prevent recalculation
  const baseMissingResources = useMemo((): GroupUploadItem[] => {
    console.log('🔄 Recalculating base missing resources');
    console.log('  - calculateMissingResources dependency changed');
    return calculateMissingResources;
  }, [calculateMissingResources]);

  // Create search index for fast filtering
  const searchIndex = useMemo(() => {
    console.log('🔍 Creating search index');
    const index = new Map<string, Set<string>>();
    
    baseMissingResources.forEach(group => {
      const searchableTexts = [
        group.name.toLowerCase(),
        ...group.missingResources.map(r => r.label.toLowerCase()),
        ...group.missingResources.map(r => r.description.toLowerCase())
      ];
      
      searchableTexts.forEach(text => {
        const words = text.split(/\s+/);
        words.forEach(word => {
          if (!index.has(word)) {
            index.set(word, new Set());
          }
          index.get(word)!.add(group.key);
        });
      });
    });
    
    console.log('🔍 Search index created with', index.size, 'words');
    return index;
  }, [baseMissingResources]);

  // Simple state for filtered results - no complex useMemo
  const [filteredMissingResources, setFilteredMissingResources] = useState<GroupUploadItem[]>([]);

  // Initialize filtered results when base data changes
  useEffect(() => {
    if (baseMissingResources.length > 0) {
      setFilteredMissingResources(baseMissingResources);
    }
  }, [baseMissingResources]);

  // Separate effect for filtering - runs only when needed
  useEffect(() => {
    console.log('🔍 Starting filter operation');
    const startTime = performance.now();
    
    let filtered = baseMissingResources;

    // Apply group filter (simple dropdown selection)
    if (uploadSearchQuery.trim()) {
      filtered = filtered.filter(group => 
        group.name.toLowerCase() === uploadSearchQuery.toLowerCase()
      );
    }

    // Apply resource type filter
    if (uploadResourceFilter !== 'all') {
      filtered = filtered.map(group => ({
        ...group,
        missingResources: group.missingResources.filter(resource => resource.type === uploadResourceFilter)
      })).filter(group => group.missingResources.length > 0);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (uploadSortBy) {
        case 'priority':
          aValue = a.priority;
          bValue = b.priority;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'count':
          aValue = a.missingResources.reduce((sum, resource) => sum + resource.count, 0);
          bValue = b.missingResources.reduce((sum, resource) => sum + resource.count, 0);
          break;
        default:
          aValue = a.priority;
          bValue = b.priority;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return uploadSortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return uploadSortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    const endTime = performance.now();
    console.log(`🔍 Filter operation completed in ${endTime - startTime}ms`);
    
    setFilteredMissingResources(filtered);
  }, [baseMissingResources, uploadSearchQuery, uploadResourceFilter, uploadSortBy, uploadSortOrder]);

  // Calculate overview status
  const calculateOverviewStatus = useMemo((): OverviewStatus => {
    const totalGroups = assetGroups.length;
    let completeGroups = 0;
    let incompleteGroups = 0;
    let missingJson = 0;
    let missingImage = 0;
    let missingVideos = 0;
    let missingVoices = 0;
    let missingRewards = 0;
    let missingQuiz3Images = 0;

    assetGroups.forEach(group => {
      const status = group.renderStatus;
      
      // Debug logging for Alligator group
      if (group.name === 'Alligator') {
        // Manual calculation of completion status
        const manualIsComplete = status.hasJson && 
                                status.availableImages >= status.requiredImages &&
                                status.availableVideos >= status.requiredVideos &&
                                status.availableVoices >= status.requiredVoices &&
                                status.availableRewards >= status.requiredRewards &&
                                status.availableQuiz3Images >= status.requiredQuiz3Images;
        
        console.log('🐊 Alligator Group Status:', {
          name: group.name,
          isComplete: status.isComplete,
          manualIsComplete: manualIsComplete,
          hasJson: status.hasJson,
          hasImage: status.availableImages >= status.requiredImages,
          hasVideos: status.availableVideos >= status.requiredVideos,
          hasVoices: status.hasVoices,
          availableVoices: status.availableVoices,
          requiredVoices: status.requiredVoices,
          availableRewards: status.availableRewards,
          requiredRewards: status.requiredRewards,
          hasQuiz3Images: status.hasQuiz3Images,
          availableQuiz3Images: status.availableQuiz3Images,
          requiredQuiz3Images: status.requiredQuiz3Images,
          voiceComplete: status.availableVoices >= status.requiredVoices,
          rewardComplete: status.availableRewards >= status.requiredRewards,
          quiz3Complete: status.availableQuiz3Images >= status.requiredQuiz3Images
        });
      }
      
      // Calculate completion status manually to ensure consistency
      const isActuallyComplete = status.hasJson && 
                                status.availableImages >= status.requiredImages &&
                                status.availableVideos >= status.requiredVideos &&
                                status.availableVoices >= status.requiredVoices &&
                                status.availableRewards >= status.requiredRewards &&
                                status.availableQuiz3Images >= status.requiredQuiz3Images;
      
      if (isActuallyComplete) {
        completeGroups++;
      } else {
        incompleteGroups++;
      }

      if (!status.hasJson) missingJson++;
      if (status.availableImages < status.requiredImages) missingImage++;
      if (status.availableVideos < status.requiredVideos) missingVideos++;
      if (status.availableVoices < status.requiredVoices) missingVoices++;
      if (status.availableRewards < status.requiredRewards) missingRewards++;
      if (status.availableQuiz3Images < status.requiredQuiz3Images) missingQuiz3Images++;
    });

    const completionRate = totalGroups > 0 ? Math.round((completeGroups / totalGroups) * 100) : 0;

    console.log('📊 Overview Status Results:', {
      totalGroups,
      completeGroups,
      incompleteGroups,
      missingJson,
      missingImage,
      missingVideos,
      missingVoices,
      missingRewards,
      missingQuiz3Images,
      completionRate
    });

    return {
      totalGroups,
      completeGroups,
      incompleteGroups,
      missingJson,
      missingImage,
      missingVideos,
      missingVoices,
      missingRewards,
      missingQuiz3Images,
      completionRate
    };
  }, [assetGroups]);

  // Filter options
  const channelOptions = [
    { value: "minimate", label: "MiniMate" },
    { value: "rumitx_studio", label: "RumitX Studio" },
    { value: "rumitx_shorts", label: "RumitX Shorts" },
    { value: "rumitx_nature", label: "RumitX Nature" },
    { value: "rumitx_science", label: "RumitX Science" },
    { value: "rumitx_history", label: "RumitX History" }
  ];

  const topicOptions = [
    { value: "animals", label: "Animals" },
    { value: "plants", label: "Plants" },
    { value: "histories", label: "Histories" },
    { value: "science", label: "Science" },
    { value: "technology", label: "Technology" },
    { value: "nature", label: "Nature" },
    { value: "space", label: "Space" },
    { value: "ocean", label: "Ocean" },
    { value: "weather", label: "Weather" },
    { value: "geography", label: "Geography" }
  ];

  // AI Generator state
  const [aiContent, setAiContent] = useState<SK3QLRContent>({
    id: "",
    key: "",
    order: 1,
    intro: { text: "", voice: "" },
    quiz_1: {
      question: { text: "", voice: "" },
      options: ["", "", "", ""],
      answer: { position: 1, voice: "" }
    },
    quiz_2: {
      question: { text: "", voice: "" },
      options: ["", ""],
      answer: { position: 1, voice: "" }
    },
    quiz_3: {
      question: { text: "", voice: "" },
      options: ["", "", "", ""],
      answer: { position: 1, voice: "" }
    },
    lesson: { voice: "" },
    reward: { voice: "" }
  });

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [aiLanguage, setAiLanguage] = useState("vietnamese");
  const [aiProvider, setAiProvider] = useState("grok");
  const [existingOrders, setExistingOrders] = useState<number[]>([]);
  const [previewItems, setPreviewItems] = useState<SK3QLRContent[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // New batch generation state
  const [batchSize, setBatchSize] = useState(1);
  const [subjectsList, setSubjectsList] = useState("");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; subject: string } | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Helper function to extract key and order from filename
  const extractKeyAndOrder = (filename: string, type: string, path?: string): { key: string; order?: number } => {
    if (type === 'json') {
      // Extract from format like "bear_1.json" or "blue_tang_1.json"
      // Use a more robust regex that handles multi-word names
      const match = filename.match(/^(.+?)_(\d+)\.json$/);
      if (match) {
        const key = match[1];
        const order = parseInt(match[2]);
        console.log(`Extracted from ${filename}: key="${key}", order=${order}`); // Debug log
        return { key, order };
      }
    } else if (type === 'voice') {
      // For voice files, extract the key from the directory path
      // Voice files are in directories like "voice/buoyancy_1/voice_lesson.mp3"
      if (path) {
        // Extract the directory name from the path - handle both Windows and Unix separators
        const pathParts = path.split(/[\/\\]/); // Split by both forward and backward slashes
        const voiceDirIndex = pathParts.findIndex(part => part === 'voice');
        if (voiceDirIndex !== -1 && voiceDirIndex + 1 < pathParts.length) {
          const dirName = pathParts[voiceDirIndex + 1]; // This should be "buoyancy_1"
          const dirMatch = dirName.match(/^(.+?)_(\d+)$/);
          if (dirMatch) {
            const key = dirMatch[1];
            const order = parseInt(dirMatch[2]);
            console.log(`Extracted from voice path ${path}: key="${key}", order=${order}`); // Debug log
            return { key, order };
          }
        }
      }
      
      // Fallback: extract from filename if path method fails
      const match = filename.match(/voice_(.+?)\.mp3/);
      if (match) {
        return { key: 'voice_' + match[1] };
      }
    } else if (type === 'video' && path && path.includes('reward')) {
      // For reward videos, extract key from the filename and order from the path
      // Path format: reward/output/reward_1/hamster.mp4
      const pathMatch = path.match(/reward[\/\\]output[\/\\]reward_(\d+)[\/\\]([^\/\\]+)\.mp4$/);
      if (pathMatch) {
        const order = parseInt(pathMatch[1]);
        const key = pathMatch[2]; // The filename without extension is the key
        console.log(`Extracted from reward video path ${path}: key="${key}", order=${order}`); // Debug log
        return { key, order };
      }
      
      // Fallback for reward videos without proper path structure
      const filenameMatch = filename.match(/^(.+?)\.mp4$/);
      if (filenameMatch) {
        const key = filenameMatch[1];
        console.log(`Extracted from reward video filename ${filename}: key="${key}"`); // Debug log
        return { key };
      }
    } else if (type === 'image' || type === 'video') {
      // Extract from format like "alligator_1.jpg", "alligator_2.mp4", "bear_1.png"
      // This matches the new structure where images and videos include order numbers
      const match = filename.match(/^(.+?)_(\d+)\.(jpg|mp4|png|gif)$/);
      if (match) {
        const key = match[1];
        const order = parseInt(match[2]);
        console.log(`Extracted from ${type} ${filename}: key="${key}", order=${order}`); // Debug log
        return { key, order };
      }
      
      // Files without order numbers should be ignored for images and videos
      console.log(`Ignoring ${type} file without order number: ${filename}`);
      return { key: 'ignored', order: undefined };
    }
    return { key: filename.split('.')[0] };
  };



  // Helper function to organize JSON files with their corresponding voices and rewards
  const organizeJSONAssetPairs = (jsons: Asset[], voices: Asset[], rewards: Asset[], allImages: Asset[], jsonOptionsMap: Map<string, string[]> = new Map()): JSONAssetPair[] => {
    console.log('🔧 organizeJSONAssetPairs called with:', jsons.length, 'JSONs');
    console.log('🎁 Rewards array:', rewards.map(r => ({ name: r.name, path: r.path, key: r.key, order: r.order })));
    return jsons.map(json => {
      const jsonOrder = json.order;
      const jsonKey = json.key;
      
      // Find voices that belong to this JSON file
      const matchingVoices = voices.filter(voice => {
        // Check if voice belongs to this JSON by matching key and order
        if (voice.key === jsonKey && voice.order === jsonOrder) {
          console.log(`Voice ${voice.name} matched by key/order: ${voice.key}_${voice.order}`); // Debug log
          return true;
        }
        
        // Check by path structure: voice/key_order/voice_type.mp3
        if (voice.path) {
          const pathMatch = voice.path.match(/voice[\/\\]([^\/\\]+)_(\d+)[\/\\]/);
          if (pathMatch && pathMatch[1] === jsonKey && parseInt(pathMatch[2]) === jsonOrder) {
            console.log(`Voice ${voice.name} matched by path: ${voice.path}`); // Debug log
            return true;
          }
        }
        
        // Additional check for voice filename pattern: key_order_voice_type.mp3
        const voiceNameMatch = voice.name.match(/^(.+?)_(\d+)_voice_/);
        if (voiceNameMatch && voiceNameMatch[1] === jsonKey && parseInt(voiceNameMatch[2]) === jsonOrder) {
          console.log(`Voice ${voice.name} matched by filename pattern`); // Debug log
          return true;
        }
        
        return false;
      });

      // Find reward that belongs to this JSON file
      console.log(`🔍 Looking for reward for JSON ${json.name} (key: ${jsonKey}, order: ${jsonOrder})`);
      const matchingReward = rewards.find(reward => {
        console.log(`  Checking reward: ${reward.name} (path: ${reward.path}, key: ${reward.key}, order: ${reward.order})`);
        
        // Check by path structure: reward/output/reward_order/name.mp4
        if (reward.path) {
          const pathMatch = reward.path.match(/reward[\/\\]output[\/\\]reward_(\d+)[\/\\]([^\/\\]+)\.mp4$/);
          if (pathMatch) {
            console.log(`    Path match: order=${pathMatch[1]}, filename=${pathMatch[2]}`);
            if (parseInt(pathMatch[1]) === jsonOrder) {
              console.log(`    ✅ Reward ${reward.name} matched by path: ${reward.path} (order ${pathMatch[1]})`);
              return true;
            }
          }
        }
        
        // Check by filename pattern: key.mp4 (for reward videos)
        if (reward.name && reward.name.toLowerCase() === `${jsonKey}.mp4`) {
          console.log(`    ✅ Reward ${reward.name} matched by filename: ${reward.name}`);
          return true;
        }
        
        // Check by key and order if reward has order
        if (reward.key === jsonKey && reward.order === jsonOrder) {
          console.log(`    ✅ Reward ${reward.name} matched by key/order: ${reward.key}_${reward.order}`);
          return true;
        }
        
        console.log(`    ❌ No match for reward: ${reward.name}`);
        return false;
      });

      // Determine which voice types are present based on the actual file naming pattern
      const voiceTypes = {
        intro: false,
        quiz1_question: false,
        quiz1_answer: false,
        quiz2_question: false,
        quiz2_answer: false,
        quiz3_question: false,
        quiz3_answer: false,
        lesson: false,
        reward: false
      };

      const missingVoices: string[] = [];

      console.log(`🔍 Checking voices for ${json.name} (${jsonKey}_${jsonOrder}):`, matchingVoices.map(v => v.name));
      
      matchingVoices.forEach(voice => {
        const voiceName = voice.name.toLowerCase();
        console.log(`🎵 Processing voice: ${voice.name} (${voiceName})`);
        
        // EXACT filename matching - no partial matches allowed
        if (voiceName === 'voice_title.mp3') {
          voiceTypes.intro = true;
          console.log(`  ✅ Matched intro (exact match)`);
        } else if (voiceName === 'voice_q1_title.mp3') {
          voiceTypes.quiz1_question = true;
          console.log(`  ✅ Matched quiz1_question (exact match)`);
        } else if (voiceName === 'voice_q1_ans.mp3') {
          voiceTypes.quiz1_answer = true;
          console.log(`  ✅ Matched quiz1_answer (exact match)`);
        } else if (voiceName === 'voice_q2_title.mp3') {
          voiceTypes.quiz2_question = true;
          console.log(`  ✅ Matched quiz2_question (exact match)`);
        } else if (voiceName === 'voice_q2_ans.mp3') {
          voiceTypes.quiz2_answer = true;
          console.log(`  ✅ Matched quiz2_answer (exact match)`);
        } else if (voiceName === 'voice_q3_title.mp3') {
          voiceTypes.quiz3_question = true;
          console.log(`  ✅ Matched quiz3_question (exact match)`);
        } else if (voiceName === 'voice_q3_ans.mp3') {
          voiceTypes.quiz3_answer = true;
          console.log(`  ✅ Matched quiz3_answer (exact match)`);
        } else if (voiceName === 'voice_lesson.mp3') {
          voiceTypes.lesson = true;
          console.log(`  ✅ Matched lesson (exact match)`);
        } else if (voiceName === 'voice_reward.mp3') {
          voiceTypes.reward = true;
          console.log(`  ✅ Matched reward (exact match)`);
        } else {
          console.log(`  ❌ No exact match for voice: ${voice.name} (expected exact filename)`);
        }
      });

      // Check for missing voice types
      if (!voiceTypes.intro) missingVoices.push('intro');
      if (!voiceTypes.quiz1_question) missingVoices.push('quiz1_question');
      if (!voiceTypes.quiz1_answer) missingVoices.push('quiz1_answer');
      if (!voiceTypes.quiz2_question) missingVoices.push('quiz2_question');
      if (!voiceTypes.quiz2_answer) missingVoices.push('quiz2_answer');
      if (!voiceTypes.quiz3_question) missingVoices.push('quiz3_question');
      if (!voiceTypes.quiz3_answer) missingVoices.push('quiz3_answer');
      if (!voiceTypes.lesson) missingVoices.push('lesson');
      if (!voiceTypes.reward) missingVoices.push('reward');

      console.log(`📊 Voice types status for ${json.name}:`, voiceTypes);
      console.log(`❌ Missing voices for ${json.name}:`, missingVoices);

      const hasAllVoices = missingVoices.length === 0;
      const hasReward = !!matchingReward;

      // Check quiz 3 image options using pre-loaded JSON content
      const normalizedPath = json.path.replace(/\\/g, '/');
      const jsonOptions = jsonOptionsMap.get(normalizedPath) || [];
      console.log(`🔍 Looking for options for ${json.name} at path: ${normalizedPath}`);
      console.log(`📋 Found options:`, jsonOptions);
      console.log(`🔑 JSON key: ${json.key}, order: ${json.order}`);
      const quiz3ImageOptions = checkQuiz3ImageOptions(json, allImages, jsonOptions);

      return {
        json,
        voices: matchingVoices,
        reward: matchingReward,
        hasAllVoices,
        hasReward,
        missingVoices,
        voiceTypes,
        quiz3ImageOptions
      };
    });
  };

  // Function to pre-load JSON content for quiz 3 options
  const loadJSONContentBatch = async (jsonAssets: Asset[]) => {
    console.log('🔧 loadJSONContentBatch called for:', jsonAssets.length, 'files');
    try {
      if (jsonAssets.length === 0) {
        return new Map<string, string[]>();
      }

      const paths = jsonAssets.map(asset => asset.path);
      console.log(`📄 Loading JSON content for ${jsonAssets.length} files`);
      
      const response = await fetch('/api/assets/json-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paths,
          channel: selectedChannel,
          topic: selectedTopic
        })
      });
      
      console.log(`📡 Response status: ${response.status}, ok: ${response.ok}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Batch loaded JSON content for ${Object.keys(result).length} files`);
        
        // Convert the result to a Map for easier lookup
        const jsonOptionsMap = new Map<string, string[]>();
        for (const [path, data] of Object.entries(result)) {
          const normalizedPath = path.replace(/\\/g, '/');
          const typedData = data as { options?: string[]; error?: string };
          if ('options' in typedData && Array.isArray(typedData.options)) {
            // Find the corresponding JSON asset
            const jsonAsset = jsonAssets.find(asset => 
              asset.path.replace(/\\/g, '/') === normalizedPath
            );
            
            if (jsonAsset) {
              // Get valid options without modifying the JSON file
              const optionsInfo = getValidOptionsForAvailableImages(jsonAsset, assets, typedData.options);
              jsonOptionsMap.set(normalizedPath, optionsInfo.originalOptions);
              console.log(`🎯 Quiz 3 options for ${path}:`, optionsInfo.originalOptions);
              if (optionsInfo.hasMismatch) {
                console.log(`⚠️ Warning: JSON has ${optionsInfo.originalOptions.length - optionsInfo.validOptions.length} invalid options`);
              }
            } else {
              jsonOptionsMap.set(normalizedPath, typedData.options);
              console.log(`🎯 Quiz 3 options for ${path}:`, typedData.options);
            }
          } else if ('error' in typedData) {
            console.error(`❌ Error loading ${path}:`, typedData.error);
            jsonOptionsMap.set(normalizedPath, []);
          }
        }
        
        console.log('📊 Final JSON options map size:', jsonOptionsMap.size);
        console.log('📊 JSON options map keys:', Array.from(jsonOptionsMap.keys()));
        
        return jsonOptionsMap;
      } else {
        console.error(`❌ Failed to load JSON content batch:`, response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error loading JSON content batch:', error);
    }
    return new Map<string, string[]>();
  };

  // Function to check quiz 3 image options availability (synchronous version)
  const checkQuiz3ImageOptions = (jsonAsset: Asset, allImages: Asset[], jsonOptions: string[] = []) => {
    console.log('🔧 checkQuiz3ImageOptions called for:', jsonAsset.name, 'with options:', jsonOptions);
    console.log('🔍 Available images in options folder:', allImages.filter(img => img.path.includes('options')).map(img => img.name));
    try {
      const options = jsonOptions.length > 0 ? jsonOptions : [];
      
      // Check which images are available in the options folder
      const availableImages: string[] = [];
      const missingImages: string[] = [];

      options.forEach((option: string) => {
        // Look for images in the options folder with exact name matching
        const optionImage = allImages.find(img => {
          if (img.type !== 'image' || !img.path.includes('options')) {
            return false;
          }
          
          // Get the filename without extension
          const fileNameWithoutExt = img.name.replace(/\.(jpg|jpeg|png|gif|bmp)$/i, '');
          
          // Check for exact match (case-insensitive)
          return fileNameWithoutExt.toLowerCase() === option.toLowerCase();
        });
        
        if (optionImage) {
          availableImages.push(option);
          console.log(`✅ Found image for option "${option}": ${optionImage.name}`);
        } else {
          missingImages.push(option);
          console.log(`❌ Missing image for option "${option}"`);
        }
      });

      const hasAllImages = missingImages.length === 0;
      const completionRate = options.length > 0 ? (availableImages.length / options.length) * 100 : 0;

      console.log(`📊 Quiz 3 image options summary for ${jsonAsset.name}:`);
      console.log(`  Available: ${availableImages.length}/${options.length}`);
      console.log(`  Missing: ${missingImages.length}`);
      console.log(`  Available images:`, availableImages);
      console.log(`  Missing images:`, missingImages);

      return {
        options,
        availableImages,
        missingImages,
        hasAllImages,
        completionRate
      };
    } catch (error) {
      console.error('Error checking quiz 3 image options:', error);
      return {
        options: [],
        availableImages: [],
        missingImages: [],
        hasAllImages: false,
        completionRate: 0
      };
    }
  };

  const getValidOptionsForAvailableImages = (jsonAsset: Asset, allImages: Asset[], jsonOptions: string[]) => {
    console.log('🔧 getValidOptionsForAvailableImages called for:', jsonAsset.name);
    
    // Get available images in options folder
    const availableOptionImages = allImages.filter(img => 
      img.type === 'image' && img.path.includes('options')
    );
    
    console.log('📸 Available option images:', availableOptionImages.map(img => img.name));
    
    // Get the base names of available images (without extension)
    const availableOptions = availableOptionImages.map(img => 
      img.name.replace(/\.(jpg|jpeg|png|gif|bmp)$/i, '').toLowerCase()
    );
    
    console.log('📋 Available options (base names):', availableOptions);
    
    // Filter JSON options to only include those that have corresponding images
    const validOptions = jsonOptions.filter(option => 
      availableOptions.includes(option.toLowerCase())
    );
    
    console.log('✅ Valid options (with images):', validOptions);
    console.log('❌ Invalid options (no images):', jsonOptions.filter(option => 
      !availableOptions.includes(option.toLowerCase())
    ));
    
    // Return the original options but mark which ones are valid
    return {
      originalOptions: jsonOptions,
      validOptions: validOptions,
      hasMismatch: validOptions.length !== jsonOptions.length
    };
  };

  const fetchAssets = useCallback(async (searchTerm?: string, isSearch = false) => {
    console.log('🚀 fetchAssets called with:', { searchTerm, isSearch, selectedChannel, selectedTopic });
    try {
      if (isSearch) {
        setSearching(true);
      } else {
        setLoading(true);
      }
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedChannel) params.append('channel', selectedChannel);
      if (selectedTopic) params.append('topic', selectedTopic);
      
      const response = await fetch(`/api/assets?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch assets');
      
      const data = await response.json();
      
      // Process assets to add key and order information
      const processedAssets = data.assets.map((asset: Asset) => {
        const { key, order } = extractKeyAndOrder(asset.name, asset.type, asset.path);
        console.log(`Processing asset: ${asset.name} -> key: "${key}", order: ${order}, path: ${asset.path}`); // Debug log
        return { ...asset, key, order };
      });
      
      console.log('=== ASSET PROCESSING DEBUG ===');
      console.log('Total assets:', processedAssets.length);
      console.log('JSON files:', processedAssets.filter((a: Asset) => a.type === 'json').map((a: Asset) => a.name));
      console.log('Voice files:', processedAssets.filter((a: Asset) => a.type === 'voice').map((a: Asset) => a.name));
      console.log('Image files:', processedAssets.filter((a: Asset) => a.type === 'image').map((a: Asset) => a.name));
      console.log('Video files:', processedAssets.filter((a: Asset) => a.type === 'video').map((a: Asset) => a.name));
      console.log('Video files with categories:', processedAssets.filter((a: Asset) => a.type === 'video').map((a: Asset) => ({ name: a.name, category: a.category, path: a.path })));
      
      setAssets(processedAssets);
      
      // Group assets by key - prioritize animal keys over voice type keys
      const groupedAssets = processedAssets.reduce((groups: { [key: string]: AssetGroup }, asset: Asset) => {
        let key = asset.key || 'unknown';
        
        // Special handling for voice files - they should be grouped with their corresponding JSON files
        if (asset.type === 'voice') {
          // Voice files are in directories like "voice/buoyancy_1/voice_lesson.mp3"
          // We need to match them with the corresponding JSON file "buoyancy_1.json"
          if (asset.path) {
            const pathParts = asset.path.split(/[\/\\]/); // Split by both forward and backward slashes
            const voiceDirIndex = pathParts.findIndex(part => part === 'voice');
            if (voiceDirIndex !== -1 && voiceDirIndex + 1 < pathParts.length) {
              const dirName = pathParts[voiceDirIndex + 1]; // This should be "buoyancy_1"
              const dirMatch = dirName.match(/^(.+?)_(\d+)$/);
              if (dirMatch) {
                const voiceKey = dirMatch[1];
                const voiceOrder = parseInt(dirMatch[2]);
                
                // Find the JSON file that matches this key and order
                const matchingJson = processedAssets.find((a: Asset) => 
                  a.type === 'json' && 
                  a.key === voiceKey && 
                  a.order === voiceOrder
                );
                
                if (matchingJson) {
                  key = voiceKey;
                  console.log(`Grouping voice file ${asset.name} with JSON key: "${key}" (matched by directory: ${dirName})`);
                } else {
                  // If no matching JSON found, use the voice key
                  key = voiceKey;
                  console.log(`No matching JSON found for voice file ${asset.name}, using key: "${key}"`);
                }
              } else {
                // Fallback: use the first available JSON file
                const firstJson = processedAssets.find((a: Asset) => 
                  a.type === 'json' && 
                  a.key && 
                  a.key !== 'unknown' &&
                  !a.key.startsWith('voice_')
                );
                
                if (firstJson) {
                  key = firstJson.key;
                  console.log(`Grouping voice file ${asset.name} with JSON key: "${key}" (fallback)`);
                } else {
                  key = 'voice_files';
                  console.log(`No JSON files found, grouping voice file ${asset.name} as: "${key}"`);
                }
              }
            } else {
              // Fallback: use the first available JSON file
              const firstJson = processedAssets.find((a: Asset) => 
                a.type === 'json' && 
                a.key && 
                a.key !== 'unknown' &&
                !a.key.startsWith('voice_')
              );
              
              if (firstJson) {
                key = firstJson.key;
                console.log(`Grouping voice file ${asset.name} with JSON key: "${key}" (fallback)`);
              } else {
                key = 'voice_files';
                console.log(`No JSON files found, grouping voice file ${asset.name} as: "${key}"`);
              }
            }
          } else {
            // Fallback: use the first available JSON file
            const firstJson = processedAssets.find((a: Asset) => 
              a.type === 'json' && 
              a.key && 
              a.key !== 'unknown' &&
              !a.key.startsWith('voice_')
            );
            
            if (firstJson) {
              key = firstJson.key;
              console.log(`Grouping voice file ${asset.name} with JSON key: "${key}" (fallback)`);
            } else {
              key = 'voice_files';
              console.log(`No JSON files found, grouping voice file ${asset.name} as: "${key}"`);
            }
          }
        }
        
        // Skip .DS_Store files
        if (asset.name === '.DS_Store') {
          return groups;
        }
        
        console.log(`Grouping asset ${asset.name} (${asset.type}) with key: "${key}"`); // Debug log
        
        if (!groups[key]) {
          groups[key] = {
            key: key,
            name: key.charAt(0).toUpperCase() + key.slice(1),
            assets: {
              images: [], // Initialize images array
              videos: [],
              voices: [],
              jsons: [],
              rewards: [],
              jsonAssetPairs: [] // Initialize new field
            },
            renderStatus: {
              hasJson: false,
              hasImage: false,
              hasVideos: false,
              hasVoices: false,
              isComplete: false,
              requiredVoices: 0,
              availableVoices: 0,
              requiredRewards: 0,
              availableRewards: 0,
              requiredImages: 0,
              availableImages: 0,
              requiredVideos: 0,
              availableVideos: 0,
              jsonOrders: [],
              imageOrders: [],
              videoOrders: [],
              // Quiz 3 image options status
              hasQuiz3Images: false,
              requiredQuiz3Images: 0,
              availableQuiz3Images: 0
            }
          };
        }
        
        // Categorize assets
        if (asset.type === 'image') {
          // Only use images from the image directory, ignore images from reward directories
          if (asset.category === 'image' && asset.key !== 'ignored') {
            // With new structure, images have order numbers (e.g., alligator_1.jpg)
            // Add image to the images array
            groups[key].assets.images.push(asset);
            
            // Track image orders
            if (asset.order && !groups[key].renderStatus.imageOrders.includes(asset.order)) {
              groups[key].renderStatus.imageOrders.push(asset.order);
              console.log(`📸 Added image order ${asset.order} for group ${key} (${asset.name})`);
            }
            
            // Debug logging for frog group
            if (key === 'frog') {
              console.log(`🐸 Frog image processing: ${asset.name}, order: ${asset.order}, category: ${asset.category}, key: ${asset.key}`);
              console.log(`🐸 Current frog image orders:`, groups[key].renderStatus.imageOrders);
            }
          }
        } else if (asset.type === 'video') {
          console.log(`🎬 Processing video asset: ${asset.name} (category: ${asset.category}, path: ${asset.path})`);
          if (asset.category === 'reward') {
            console.log(`🎁 Adding reward video: ${asset.name} (path: ${asset.path}) to group ${key}`);
            groups[key].assets.rewards.push(asset);
          } else if (asset.key !== 'ignored') {
            console.log(`📹 Adding regular video: ${asset.name} to group ${key}`);
            groups[key].assets.videos.push(asset);
          } else {
            console.log(`❌ Ignoring video: ${asset.name} (category: ${asset.category}, key: ${asset.key})`);
          }
        } else if (asset.type === 'voice') {
          groups[key].assets.voices.push(asset);
        } else if (asset.type === 'json') {
          groups[key].assets.jsons.push(asset);
        }
        
        // Update basic render status (JSON orders, basic asset presence)
        if (asset.type === 'image' && asset.category === 'image' && asset.key !== 'ignored') {
          // Track image orders
          if (asset.order && !groups[key].renderStatus.imageOrders.includes(asset.order)) {
            groups[key].renderStatus.imageOrders.push(asset.order);
          }
        } else if (asset.type === 'video' && asset.category === 'video' && asset.key !== 'ignored') {
          // Track video orders
          if (asset.order && !groups[key].renderStatus.videoOrders.includes(asset.order)) {
            groups[key].renderStatus.videoOrders.push(asset.order);
          }
        } else if (asset.type === 'json') {
          groups[key].renderStatus.hasJson = true;
          // Extract order from JSON filename (e.g., "alligator_1.json" -> 1)
          const orderMatch = asset.name.match(/_(\d+)\.json$/);
          if (orderMatch) {
            const order = parseInt(orderMatch[1]);
            if (!groups[key].renderStatus.jsonOrders.includes(order)) {
              groups[key].renderStatus.jsonOrders.push(order);
            }
          }
        } else if (asset.type === 'video' && asset.category === 'reward') {
          groups[key].renderStatus.availableRewards++;
        }
        
        return groups;
      }, {});
      
      // Final calculations after all assets are processed
      (Object.values(groupedAssets) as AssetGroup[]).forEach((group) => {
        // Calculate requirements based on JSON files
        const jsonCount = group.renderStatus.jsonOrders.length;
        group.renderStatus.requiredVoices = jsonCount * 9; // 9 voices per JSON
        group.renderStatus.requiredRewards = jsonCount; // 1 reward per JSON
        group.renderStatus.requiredImages = jsonCount; // 1 image per JSON (with order numbers)
        group.renderStatus.requiredVideos = jsonCount; // 1 video per JSON (with order numbers)
        
        // Update available counts to only count matching orders
        const matchingImageOrders = group.renderStatus.imageOrders.filter((order: number) => 
          group.renderStatus.jsonOrders.includes(order)
        );
        group.renderStatus.availableImages = matchingImageOrders.length;
        
        const matchingVideoOrders = group.renderStatus.videoOrders.filter((order: number) => 
          group.renderStatus.jsonOrders.includes(order)
        );
        group.renderStatus.availableVideos = matchingVideoOrders.length;
        
        // Set hasImage and hasVideos flags based on completion
        group.renderStatus.hasImage = group.renderStatus.availableImages >= group.renderStatus.requiredImages;
        group.renderStatus.hasVideos = group.renderStatus.availableVideos >= group.renderStatus.requiredVideos;
        
                // Debug logging for frog group
        if (group.key === 'frog') {
          console.log(`🐸 Frog hasImage/hasVideos flags:`);
          console.log(`  hasImage: ${group.renderStatus.hasImage} (${group.renderStatus.availableImages}/${group.renderStatus.requiredImages})`);
          console.log(`  hasVideos: ${group.renderStatus.hasVideos} (${group.renderStatus.availableVideos}/${group.renderStatus.requiredVideos})`);
          console.log(`🐸 Frog final calculation:`);
          console.log(`  JSON orders: ${group.renderStatus.jsonOrders}`);
          console.log(`  Image orders: ${group.renderStatus.imageOrders}`);
          console.log(`  Video orders: ${group.renderStatus.videoOrders}`);
          console.log(`  Matching image orders: ${matchingImageOrders}`);
          console.log(`  Available images: ${group.renderStatus.availableImages}/${group.renderStatus.requiredImages}`);
          console.log(`  Available videos: ${group.renderStatus.availableVideos}/${group.renderStatus.requiredVideos}`);
        }
      });
      
      // Pre-load JSON content for quiz 3 options
      const jsonAssets = processedAssets.filter((asset: Asset) => asset.type === 'json');
      
      console.log('=== JSON LOADING DEBUG ===');
      console.log('Search term:', searchTerm);
      console.log('Total JSON assets found:', jsonAssets.length);
      console.log('JSON assets:', jsonAssets.map((a: Asset) => ({ name: a.name, path: a.path, key: a.key })));
      
      // Load JSON content for all JSON files in a single batch request
      const jsonOptionsMap = await loadJSONContentBatch(jsonAssets);

      console.log('=== JSON OPTIONS MAP ===');
      console.log('Map size:', jsonOptionsMap.size);
      for (const [path, options] of jsonOptionsMap.entries()) {
        console.log(`Path: ${path} -> Options:`, options);
      }
      
      // Debug: Show what paths we're looking for
      console.log('=== PATH DEBUG ===');
      jsonAssets.forEach((asset: Asset) => {
        const normalizedPath = asset.path.replace(/\\/g, '/');
        console.log(`Asset: ${asset.name}`);
        console.log(`  Original path: ${asset.path}`);
        console.log(`  Normalized path: ${normalizedPath}`);
        console.log(`  In map: ${jsonOptionsMap.has(normalizedPath)}`);
      });

      // For quiz 3 image checking and voice checking, we need ALL available assets, not just search results
      // So we'll load all assets separately for this purpose
      let allImagesForChecking: Asset[] = [];
      let allVoicesForChecking: Asset[] = [];
      
      if (searchTerm) {
        // If searching, we need to get all assets for checking
        try {
          const allAssetsResponse = await fetch(`/api/assets?channel=${selectedChannel}&topic=${selectedTopic}`);
          if (allAssetsResponse.ok) {
            const allAssetsData = await allAssetsResponse.json();
            const allAssets = allAssetsData.assets.map((asset: Asset) => {
              const { key, order } = extractKeyAndOrder(asset.name, asset.type, asset.path);
              return { ...asset, key, order };
            });
            
            allImagesForChecking = allAssets.filter((asset: Asset) => asset.type === 'image');
            allVoicesForChecking = allAssets.filter((asset: Asset) => asset.type === 'voice');
          }
        } catch (error) {
          console.error('Error loading all assets for checking:', error);
          allImagesForChecking = processedAssets.filter((asset: Asset) => asset.type === 'image');
          allVoicesForChecking = processedAssets.filter((asset: Asset) => asset.type === 'voice');
        }
      } else {
        // If not searching, use the current processed assets
        allImagesForChecking = processedAssets.filter((asset: Asset) => asset.type === 'image');
        allVoicesForChecking = processedAssets.filter((asset: Asset) => asset.type === 'voice');
      }
      
      console.log('🔍 Images available for quiz 3 checking:', allImagesForChecking.length);
      console.log('🎵 Voices available for checking:', allVoicesForChecking.length);
      
      // Now calculate the complete render status using the complete asset lists
      Object.values(groupedAssets).forEach((group) => {
        const groupKey = (group as AssetGroup).key;
        
        // Calculate voice availability from complete voice list with EXACT filename matching
        const groupVoices = allVoicesForChecking.filter(voice => voice.key === groupKey);
        (group as AssetGroup).renderStatus.hasVoices = groupVoices.length > 0;
        
        // Count only voices with exact correct filenames
        let validVoiceCount = 0;
        groupVoices.forEach(voice => {
          const voiceName = voice.name.toLowerCase();
          // Check for exact filename matches only
          if (voiceName === 'voice_title.mp3' ||
              voiceName === 'voice_q1_title.mp3' ||
              voiceName === 'voice_q1_ans.mp3' ||
              voiceName === 'voice_q2_title.mp3' ||
              voiceName === 'voice_q2_ans.mp3' ||
              voiceName === 'voice_q3_title.mp3' ||
              voiceName === 'voice_q3_ans.mp3' ||
              voiceName === 'voice_lesson.mp3' ||
              voiceName === 'voice_reward.mp3') {
            validVoiceCount++;
          }
        });
        
        (group as AssetGroup).renderStatus.availableVoices = validVoiceCount;
        
        // Calculate quiz 3 image availability from complete image list
        const groupQuiz3Images = allImagesForChecking.filter(img => 
          img.category === 'options' && img.key === groupKey
        );
        (group as AssetGroup).renderStatus.hasQuiz3Images = groupQuiz3Images.length > 0;
        (group as AssetGroup).renderStatus.availableQuiz3Images = groupQuiz3Images.length;
        
        // Check if complete (has all required assets)
        const hasRequiredAssets = (group as AssetGroup).renderStatus.hasJson && 
                                 (group as AssetGroup).renderStatus.availableImages >= (group as AssetGroup).renderStatus.requiredImages &&
                                 (group as AssetGroup).renderStatus.availableVideos >= (group as AssetGroup).renderStatus.requiredVideos &&
                                 (group as AssetGroup).renderStatus.availableVoices >= (group as AssetGroup).renderStatus.requiredVoices &&
                                 (group as AssetGroup).renderStatus.availableRewards >= (group as AssetGroup).renderStatus.requiredRewards &&
                                 (group as AssetGroup).renderStatus.availableQuiz3Images >= (group as AssetGroup).renderStatus.requiredQuiz3Images;
        (group as AssetGroup).renderStatus.isComplete = hasRequiredAssets;
        
        console.log(`📊 Render status for ${groupKey}:`, {
          totalVoices: groupVoices.length,
          validVoices: validVoiceCount,
          requiredVoices: (group as AssetGroup).renderStatus.requiredVoices,
          availableQuiz3Images: (group as AssetGroup).renderStatus.availableQuiz3Images,
          requiredQuiz3Images: (group as AssetGroup).renderStatus.requiredQuiz3Images
        });
      });
      
      // Organize JSON-Asset pairs for each group
      Object.values(groupedAssets).forEach((group) => {
        const groupAsAssetGroup = group as AssetGroup;
        console.log(`🔧 Organizing pairs for group ${groupAsAssetGroup.key}:`);
        console.log(`  JSONs: ${groupAsAssetGroup.assets.jsons.length}`);
        console.log(`  Voices: ${groupAsAssetGroup.assets.voices.length}`);
        console.log(`  Rewards: ${groupAsAssetGroup.assets.rewards.length}`);
        console.log(`  Rewards details:`, groupAsAssetGroup.assets.rewards.map(r => ({ name: r.name, path: r.path, category: r.category })));
        
        groupAsAssetGroup.assets.jsonAssetPairs = organizeJSONAssetPairs(
          groupAsAssetGroup.assets.jsons, 
          allVoicesForChecking, // Always use complete voice list for checking
          groupAsAssetGroup.assets.rewards,
          allImagesForChecking, // Always use complete image list for quiz 3 checking
          jsonOptionsMap
        );
        
        // Calculate quiz 3 image options status
        let totalAvailableQuiz3Images = 0;
        let hasQuiz3Images = false;
        
        groupAsAssetGroup.assets.jsonAssetPairs.forEach(pair => {
          if (pair.quiz3ImageOptions.hasAllImages) {
            totalAvailableQuiz3Images += pair.quiz3ImageOptions.options.length; // Use actual options length
            hasQuiz3Images = true;
          } else {
            totalAvailableQuiz3Images += pair.quiz3ImageOptions.availableImages.length;
            if (pair.quiz3ImageOptions.availableImages.length > 0) {
              hasQuiz3Images = true;
            }
          }
        });
        
        // Calculate required quiz 3 images based on actual options in JSON files
        let totalRequiredQuiz3Images = 0;
        groupAsAssetGroup.assets.jsonAssetPairs.forEach(pair => {
          totalRequiredQuiz3Images += pair.quiz3ImageOptions.options.length;
        });
        
        groupAsAssetGroup.renderStatus.requiredQuiz3Images = totalRequiredQuiz3Images;
        groupAsAssetGroup.renderStatus.availableQuiz3Images = totalAvailableQuiz3Images;
        groupAsAssetGroup.renderStatus.hasQuiz3Images = hasQuiz3Images;
      });
      
      setAssetGroups(Object.values(groupedAssets));
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      if (isSearch) {
        setSearching(false);
      } else {
        setLoading(false);
      }
    }
  }, [selectedChannel, selectedTopic]);

  // Debounced search effect - only when upload dialog is not open
  useEffect(() => {
    if (isUploadDialogOpen) {
      console.log('🚫 Skipping main search - upload dialog is open');
      return;
    }
    
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        console.log('🔍 Triggering server-side search for:', searchQuery);
        fetchAssets(searchQuery, true); // isSearch = true
      } else {
        console.log('🔄 Resetting to all assets');
        fetchAssets('', true); // Reset to all assets, but still use search state
      }
    }, 500); // Increased delay to 500ms for better typing experience

    return () => clearTimeout(timer);
  }, [searchQuery, fetchAssets, isUploadDialogOpen]);

  // Remove debounced search - no longer needed with dropdown

  // Filter change effect
  useEffect(() => {
    fetchAssets();
  }, [selectedChannel, selectedTopic, fetchAssets]);

  // Initial load effect
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedChannel, selectedTopic, sortBy, sortOrder]);

  // Client-side filtered assets for immediate search feedback
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [assets, searchQuery]);

  // Client-side filtered asset groups for immediate search feedback
  const filteredAssetGroups = useMemo(() => {
    let filtered = assetGroups;

    // Apply status filter first
    if (statusFilter !== 'all') {
      console.log('🔍 Applying status filter:', statusFilter);
      filtered = filtered.filter(group => {
        const status = group.renderStatus;
        
        switch (statusFilter) {
          case 'complete':
            return status.hasJson && 
                   status.availableImages >= status.requiredImages &&
                   status.availableVideos >= status.requiredVideos &&
                   status.availableVoices >= status.requiredVoices &&
                   status.availableRewards >= status.requiredRewards &&
                   status.availableQuiz3Images >= status.requiredQuiz3Images;
          case 'missing-json':
            return !status.hasJson;
          case 'missing-image':
            return status.availableImages < status.requiredImages;
          case 'missing-videos':
            return status.availableVideos < status.requiredVideos;
          case 'missing-voices':
            return status.availableVoices < status.requiredVoices;
          case 'missing-rewards':
            return status.availableRewards < status.requiredRewards;
          case 'missing-quiz3-images':
            return status.availableQuiz3Images < status.requiredQuiz3Images;
          case 'incomplete':
            return !status.isComplete;
          default:
            return true;
        }
      });
      console.log('📊 Status filter applied, filtered groups:', filtered.length);
    }

    // Apply search filter if there's a search query
    if (searchQuery.trim()) {
      console.log('🔍 Applying search filter for query:', searchQuery);
      filtered = filtered.filter(group => 
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.assets.jsons.some(json => json.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        group.assets.videos.some(video => video.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        group.assets.voices.some(voice => voice.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      console.log('📊 Search filter applied, filtered groups:', filtered.length);
    }

    // Sort the filtered groups
    console.log(`Sorting filtered groups by: ${sortBy}, Order: ${sortOrder}, Groups: ${filtered.length}`);
    filtered.sort((a, b) => {
      if (sortBy === 'createDate') {
        // Get the earliest JSON file creation date for each group
        const getEarliestJsonDate = (group: AssetGroup): Date => {
          if (group.assets.jsons.length === 0) {
            // If no JSON files, use a very old date to push to the end
            return new Date(0);
          }
          
          // Find the JSON with the earliest lastModified date
          const earliestJson = group.assets.jsons.reduce((earliest, current) => {
            const earliestDate = earliest.lastModified ? new Date(earliest.lastModified) : new Date(0);
            const currentDate = current.lastModified ? new Date(current.lastModified) : new Date(0);
            return earliestDate < currentDate ? earliest : current;
          });
          
          return earliestJson.lastModified ? new Date(earliestJson.lastModified) : new Date(0);
        };

        const dateA = getEarliestJsonDate(a);
        const dateB = getEarliestJsonDate(b);
        
        if (sortOrder === 'asc') {
          return dateA.getTime() - dateB.getTime();
        } else {
          return dateB.getTime() - dateA.getTime();
        }
      } else {
        // Sort by name
        console.log(`Comparing names: "${a.name}" vs "${b.name}"`);
        if (sortOrder === 'asc') {
          return a.name.localeCompare(b.name);
        } else {
          return b.name.localeCompare(a.name);
        }
      }
    });

    return filtered;
  }, [assetGroups, searchQuery, sortBy, sortOrder, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAssetGroups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssetGroups = filteredAssetGroups.slice(startIndex, endIndex);

  const getAssetIcon = (type: string) => {
    // Return a simple text representation for now
    return () => <span className="text-2xl">{type === 'voice' ? '🎵' : type === 'image' ? '🖼️' : type === 'video' ? '🎥' : '📄'}</span>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return CheckCircleIcon;
      case 'missing': return XCircleIcon;
      case 'processing': return ExclamationTriangleIcon;
      default: return ExclamationTriangleIcon;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-success';
      case 'missing': return 'text-danger';
      case 'processing': return 'text-warning';
      default: return 'text-text-muted';
    }
  };

  const getRenderStatusDisplay = (renderStatus: AssetGroup['renderStatus']) => {
    const statuses = [];
    if (renderStatus.hasJson) statuses.push(`📄 JSON (${renderStatus.jsonOrders.length})`);
    if (renderStatus.availableImages > 0) statuses.push(`🖼️ Images (${renderStatus.availableImages}/${renderStatus.requiredImages})`);
    if (renderStatus.availableVideos > 0) statuses.push(`🎥 Videos (${renderStatus.availableVideos}/${renderStatus.requiredVideos})`);
    if (renderStatus.hasVoices) statuses.push(`🎵 Voices (${renderStatus.availableVoices}/${renderStatus.requiredVoices})`);
    if (renderStatus.availableRewards > 0) statuses.push(`🏆 Rewards (${renderStatus.availableRewards}/${renderStatus.requiredRewards})`);
    if (renderStatus.hasQuiz3Images) statuses.push(`🖼️ Quiz 3 Images (${renderStatus.availableQuiz3Images}/${renderStatus.requiredQuiz3Images})`);
    
    // Calculate completion rate based on all requirements
    const totalRequirements = 5; // JSON, Images, Videos, Voices+Rewards, Quiz 3 Images
    const metRequirements = [
      renderStatus.hasJson,
      renderStatus.availableImages >= renderStatus.requiredImages,
      renderStatus.availableVideos >= renderStatus.requiredVideos,
      renderStatus.availableVoices >= renderStatus.requiredVoices && renderStatus.availableRewards >= renderStatus.requiredRewards,
      renderStatus.availableQuiz3Images >= renderStatus.requiredQuiz3Images
    ].filter(Boolean).length;
    
    const completionRate = Math.round((metRequirements / totalRequirements) * 100);
    let statusColor = 'text-danger';
    if (completionRate >= 75) statusColor = 'text-success';
    else if (completionRate >= 50) statusColor = 'text-warning';
    
    // Check for missing orders
    const missingImageOrders = renderStatus.jsonOrders.filter(order => 
      !renderStatus.imageOrders.includes(order)
    );
    const missingVideoOrders = renderStatus.jsonOrders.filter(order => 
      !renderStatus.videoOrders.includes(order)
    );
    
    return {
      statuses,
      completionRate,
      statusColor,
      isComplete: renderStatus.isComplete,
      jsonCount: renderStatus.jsonOrders.length,
      voiceProgress: `${renderStatus.availableVoices}/${renderStatus.requiredVoices}`,
      rewardProgress: `${renderStatus.availableRewards}/${renderStatus.requiredRewards}`,
      missingVoices: Math.max(0, renderStatus.requiredVoices - renderStatus.availableVoices),
      missingRewards: Math.max(0, renderStatus.requiredRewards - renderStatus.availableRewards),
      // Add image and video status
      hasImage: renderStatus.availableImages >= renderStatus.requiredImages,
      hasVideos: renderStatus.availableVideos >= renderStatus.requiredVideos,
      imageStatus: renderStatus.availableImages >= renderStatus.requiredImages ? 'Available' : 'Missing',
      videoStatus: renderStatus.availableVideos >= renderStatus.requiredVideos ? 'Available' : 'Missing',
      imageProgress: `${renderStatus.availableImages}/${renderStatus.requiredImages}`,
      videoProgress: `${renderStatus.availableVideos}/${renderStatus.requiredVideos}`,
      missingImageOrders,
      missingVideoOrders,
      // Add quiz 3 image options status
      quiz3ImageProgress: `${renderStatus.availableQuiz3Images}/${renderStatus.requiredQuiz3Images}`,
      missingQuiz3Images: Math.max(0, renderStatus.requiredQuiz3Images - renderStatus.availableQuiz3Images)
    };
  };

  // Helper function to get the earliest JSON creation date for a group
  const getEarliestJsonDate = (group: AssetGroup): Date | null => {
    if (group.assets.jsons.length === 0) {
      return null;
    }
    
    // Find the JSON with the earliest lastModified date
    const earliestJson = group.assets.jsons.reduce((earliest, current) => {
      const earliestDate = earliest.lastModified ? new Date(earliest.lastModified) : new Date(0);
      const currentDate = current.lastModified ? new Date(current.lastModified) : new Date(0);
      return earliestDate < currentDate ? earliest : current;
    });
    
    return earliestJson.lastModified ? new Date(earliestJson.lastModified) : null;
  };

  // Helper function to format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return 'No date';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAssetSelect = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleSelectAll = () => {
    setSelectedAssets(filteredAssets.map(asset => asset.id));
  };

  const handleDeselectAll = () => {
    setSelectedAssets([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedAssets.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedAssets.length} asset(s)?`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/assets', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assetIds: selectedAssets }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete assets');
      }

      const data = await response.json();
      
      // Refresh assets list
      fetchAssets();
      
      setSelectedAssets([]);
      alert(`Successfully deleted ${data.deleted.length} asset(s)`);
    } catch (error) {
      console.error('Error deleting assets:', error);
      alert('Failed to delete assets. Please try again.');
    }
  };

  const handleUploadAssets = async (files: FileList) => {
    alert('Upload functionality requires category selection. Please implement category selection first.');
  };

  // Helper function to get upload key for state management
  const getUploadKey = (groupKey: string, resourceType: MissingResource['type'], jsonOrder?: number, imageName?: string) => {
    return `${groupKey}-${resourceType}${jsonOrder ? `-${jsonOrder}` : ''}${imageName ? `-${imageName}` : ''}`;
  };

  // Upload specific asset types
  const handleUploadSpecificAsset = async (
    groupKey: string, 
    resourceType: MissingResource['type'], 
    files: FileList,
    jsonOrder?: number,
    imageName?: string
  ) => {
    // Create unique key for this upload
    const uploadKey = getUploadKey(groupKey, resourceType, jsonOrder, imageName);
    
    // Set loading state for this specific upload
    setUploadingStates(prev => ({ ...prev, [uploadKey]: true }));
    
    try {
      const formData = new FormData();
      
      // Add files to form data
      Array.from(files).forEach((file, index) => {
        formData.append(`files`, file);
      });
      
      // Add metadata
      formData.append('groupKey', groupKey);
      formData.append('resourceType', resourceType);
      formData.append('channel', selectedChannel);
      formData.append('topic', selectedTopic);
      if (jsonOrder) {
        formData.append('jsonOrder', jsonOrder.toString());
      }
      if (imageName) {
        formData.append('imageName', imageName);
      }
      
      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const result = await response.json();
      
      // Show success message
      setToast({
        type: 'success',
        message: `Successfully uploaded ${files.length} file(s) for ${groupKey}`
      });
      
      // Update local state instead of refetching everything
      updateGroupAfterUpload(groupKey, resourceType, files, jsonOrder, imageName);
      
    } catch (error) {
      console.error('Upload error:', error);
      setToast({
        type: 'error',
        message: `Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      // Clear loading state for this specific upload
      setUploadingStates(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  // Update group data after successful upload
  const updateGroupAfterUpload = (
    groupKey: string, 
    resourceType: MissingResource['type'], 
    files: FileList,
    jsonOrder?: number,
    imageName?: string
  ) => {
    setAssetGroups(prevGroups => {
      return prevGroups.map(group => {
        if (group.key !== groupKey) return group;
        
        const updatedGroup = { ...group };
        const fileArray = Array.from(files);
        
        // Helper function to get file extension
        const getFileExtension = (filename: string) => {
          return filename.substring(filename.lastIndexOf('.'));
        };
        
        // Helper function to join paths (browser-safe)
        const joinPaths = (...parts: string[]) => {
          return parts.join('/').replace(/\/+/g, '/');
        };
        
        switch (resourceType) {
          case 'image':
            // Update image asset with order number
            const imageFile = fileArray[0];
            if (imageFile && jsonOrder) {
              const imageAsset: Asset = {
                id: `image_${groupKey}_${jsonOrder}_${Date.now()}`,
                name: `${groupKey}_${jsonOrder}${getFileExtension(imageFile.name)}`,
                type: 'image',
                category: 'image',
                path: joinPaths(config.getAssetPaths(selectedChannel, selectedTopic).image, `${groupKey}_${jsonOrder}${getFileExtension(imageFile.name)}`),
                size: imageFile.size,
                lastModified: new Date(),
                status: 'available',
                key: groupKey,
                order: jsonOrder
              };
              updatedGroup.assets.images.push(imageAsset);
              if (!updatedGroup.renderStatus.imageOrders.includes(jsonOrder)) {
                updatedGroup.renderStatus.imageOrders.push(jsonOrder);
              }
              
              // Recalculate available images count based on matching orders
              const matchingImageOrders = updatedGroup.renderStatus.imageOrders.filter(order => 
                updatedGroup.renderStatus.jsonOrders.includes(order)
              );
              updatedGroup.renderStatus.availableImages = matchingImageOrders.length;
            }
            break;
            
          case 'video':
            // Update video assets with order number
            if (jsonOrder) {
              const videoFile = fileArray[0];
              if (videoFile) {
                const videoAsset: Asset = {
                  id: `video_${groupKey}_${jsonOrder}_${Date.now()}`,
                  name: `${groupKey}_${jsonOrder}${getFileExtension(videoFile.name)}`,
                  type: 'video',
                  category: 'video',
                  path: joinPaths(config.getAssetPaths(selectedChannel, selectedTopic).video, `${groupKey}_${jsonOrder}${getFileExtension(videoFile.name)}`),
                  size: videoFile.size,
                  lastModified: new Date(),
                  status: 'available',
                  key: groupKey,
                  order: jsonOrder
                };
                updatedGroup.assets.videos.push(videoAsset);
                if (!updatedGroup.renderStatus.videoOrders.includes(jsonOrder)) {
                  updatedGroup.renderStatus.videoOrders.push(jsonOrder);
                }
                
                // Recalculate available videos count based on matching orders
                const matchingVideoOrders = updatedGroup.renderStatus.videoOrders.filter(order => 
                  updatedGroup.renderStatus.jsonOrders.includes(order)
                );
                updatedGroup.renderStatus.availableVideos = matchingVideoOrders.length;
              }
            }
            break;
            
          case 'quiz3-image':
            // Update quiz 3 image assets
            const quiz3ImageAssets: Asset[] = fileArray.map((file, index) => ({
              id: `quiz3_image_${groupKey}_${index}_${Date.now()}`,
              name: file.name,
              type: 'image',
              category: 'image',
              path: joinPaths(config.getAssetPaths(selectedChannel, selectedTopic).image, 'options', file.name),
              size: file.size,
              lastModified: new Date(),
              status: 'available',
              key: file.name.replace(getFileExtension(file.name), '') // Use filename without extension as key
            }));
            // Add to existing images or create new array
            const existingImages = assets.filter(a => a.type === 'image' && a.category === 'image');
            setAssets(prev => [...prev, ...quiz3ImageAssets]);
            
            // Update quiz 3 images count
            const newQuiz3Count = updatedGroup.renderStatus.availableQuiz3Images + fileArray.length;
            updatedGroup.renderStatus.availableQuiz3Images = newQuiz3Count;
            updatedGroup.renderStatus.hasQuiz3Images = newQuiz3Count >= updatedGroup.renderStatus.requiredQuiz3Images;
            break;
            
          case 'reward':
            // Update reward assets
            if (jsonOrder) {
              const rewardFile = fileArray[0];
              if (rewardFile) {
                const rewardAsset: Asset = {
                  id: `reward_${groupKey}_${jsonOrder}_${Date.now()}`,
                  name: rewardFile.name,
                  type: 'video',
                  category: 'reward',
                  path: joinPaths(config.getAssetPaths(selectedChannel, selectedTopic).reward, 'output', `reward_${jsonOrder}`, `${groupKey}${getFileExtension(rewardFile.name)}`),
                  size: rewardFile.size,
                  lastModified: new Date(),
                  status: 'available',
                  key: groupKey,
                  order: jsonOrder
                };
                updatedGroup.assets.rewards = [...updatedGroup.assets.rewards, rewardAsset];
                updatedGroup.renderStatus.availableRewards = updatedGroup.assets.rewards.length;
              }
            }
            break;
        }
        
        // Final recalculation to ensure all counts are correct
        const jsonCount = updatedGroup.renderStatus.jsonOrders.length;
        updatedGroup.renderStatus.requiredVoices = jsonCount * 9;
        updatedGroup.renderStatus.requiredRewards = jsonCount;
        updatedGroup.renderStatus.requiredImages = jsonCount;
        updatedGroup.renderStatus.requiredVideos = jsonCount;
        
        // Recalculate available counts based on matching orders
        const matchingImageOrders = updatedGroup.renderStatus.imageOrders.filter(order => 
          updatedGroup.renderStatus.jsonOrders.includes(order)
        );
        updatedGroup.renderStatus.availableImages = matchingImageOrders.length;
        
        const matchingVideoOrders = updatedGroup.renderStatus.videoOrders.filter(order => 
          updatedGroup.renderStatus.jsonOrders.includes(order)
        );
        updatedGroup.renderStatus.availableVideos = matchingVideoOrders.length;
        
        // Recalculate completion status
        const status = updatedGroup.renderStatus;
        updatedGroup.renderStatus.isComplete = 
          status.hasJson && 
          status.availableImages >= status.requiredImages &&
          status.availableVideos >= status.requiredVideos &&
          status.availableVoices >= status.requiredVoices &&
          status.availableRewards >= status.requiredRewards &&
          status.availableQuiz3Images >= status.requiredQuiz3Images;
        
        // Debug logging for frog group
        if (groupKey === 'frog') {
          console.log(`🐸 Frog after upload update:`);
          console.log(`  JSON orders: ${updatedGroup.renderStatus.jsonOrders}`);
          console.log(`  Image orders: ${updatedGroup.renderStatus.imageOrders}`);
          console.log(`  Available images: ${updatedGroup.renderStatus.availableImages}/${updatedGroup.renderStatus.requiredImages}`);
          console.log(`  Available videos: ${updatedGroup.renderStatus.availableVideos}/${updatedGroup.renderStatus.requiredVideos}`);
        }
        
        return updatedGroup;
      });
    });
  };

  // Check for duplicate subjects
  const checkDuplicateSubject = (subject: string) => {
    if (!subject.trim()) {
      return false;
    }
    
    const normalizedSubject = subject.toLowerCase().trim();
    const existingSubjects = assetGroups.map(group => group.key.toLowerCase());
    
    if (existingSubjects.includes(normalizedSubject)) {
      return true;
    } else {
      return false;
    }
  };

  // Check for existing orders for a subject
  const checkExistingOrders = (subject: string) => {
    if (!subject.trim()) {
      setExistingOrders([]);
      return;
    }
    
    const normalizedSubject = subject.toLowerCase().trim();
    const existingJsons = assetGroups
      .filter(group => group.key.toLowerCase() === normalizedSubject)
      .flatMap(group => group.assets.jsons);
    
    const orders = existingJsons
      .map(json => json.order)
      .filter((order): order is number => order !== undefined)
      .sort((a, b) => a - b);
    
    setExistingOrders(orders);
  };

  // Handle subject input change
  const handleSubjectChange = (value: string) => {
    setAiPrompt(value);
    checkExistingOrders(value);
  };

  // Parse subjects list from text input
  const parseSubjectsList = (text: string): string[] => {
    return text
      .split(/[\n,;]/)
      .map(subject => subject.trim())
      .filter(subject => subject.length > 0);
  };

  // Get existing orders for multiple subjects
  const getExistingOrdersForSubjects = (subjects: string[]): { [key: string]: number[] } => {
    const result: { [key: string]: number[] } = {};
    
    subjects.forEach(subject => {
      const normalizedSubject = subject.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const existingJsons = assetGroups
        .filter(group => group.key.toLowerCase() === normalizedSubject)
        .flatMap(group => group.assets.jsons);
      
      const orders = existingJsons
        .map(json => json.order)
        .filter((order): order is number => order !== undefined)
        .sort((a, b) => a - b);
      
      result[normalizedSubject] = orders;
    });
    
    return result;
  };

  const generateAIContent = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter a subject for AI generation');
      return;
    }

    setAiGenerating(true);
    
    try {
      // Calculate next order number
      const nextOrder = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 1;
      
      // Get existing content for this subject to avoid repetition
      const existingJsons = assetGroups
        .filter(group => group.key.toLowerCase() === aiPrompt.toLowerCase().trim())
        .flatMap(group => group.assets.jsons);
      
      // Read actual content from existing JSON files
      const existingContentData = [];
      for (const json of existingJsons) {
        try {
          const response = await fetch(`/api/assets/preview?path=${encodeURIComponent(json.path)}&channel=${selectedChannel}&topic=${selectedTopic}`);
          if (response.ok) {
            const content = await response.text();
            const jsonData = JSON.parse(content);
            existingContentData.push({
              filename: json.name,
              order: json.order,
              intro: jsonData.intro?.text || '',
              quiz1: jsonData.quiz_1?.question?.text || '',
              quiz2: jsonData.quiz_2?.question?.text || '',
              quiz3: jsonData.quiz_3?.question?.text || '',
              lesson: jsonData.lesson?.voice || '',
              reward: jsonData.reward?.voice || ''
            });
          }
        } catch (error) {
          console.error(`Error reading JSON file ${json.name}:`, error);
        }
      }
      
      // Get available inputs for quiz_3 (images from the current topic)
      const availableInputs = assets
        .filter(asset => asset.type === 'image' && asset.category === 'image')
        .map(asset => asset.key)
        .filter((key, index, arr) => arr.indexOf(key) === index); // Remove duplicates
      
      const response = await fetch('/api/assets/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          description: aiDescription,
          language: aiLanguage,
          topic: selectedTopic,
          provider: aiProvider,
          order: nextOrder,
          existingContent: existingContentData,
          previewItems: previewItems.map(item => ({
            order: item.order,
            intro: item.intro.text,
            quiz1: item.quiz_1.question.text,
            quiz2: item.quiz_2.question.text,
            quiz3: item.quiz_3.question.text,
            lesson: item.lesson.voice,
            reward: item.reward.voice
          })),
          availableInputs: availableInputs
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      const newContent = { ...data.content, order: nextOrder, id: `${data.content.key}_${nextOrder}_${Date.now()}` };
      
      // Add to preview items
      setPreviewItems(prev => [...prev, newContent]);
      
      // Update existing orders
      setExistingOrders(prev => [...prev, nextOrder].sort((a, b) => a - b));
      
    } catch (error) {
      console.error('Error generating AI content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const generateBatchAIContent = async () => {
    console.log('🔥 BATCH GENERATION FUNCTION CALLED 🔥');
    
    // Prevent multiple simultaneous batch generations
    if (batchGenerating) {
      console.log('Batch generation already in progress, ignoring duplicate call');
      return;
    }

    const subjects = parseSubjectsList(subjectsList);
    if (subjects.length === 0) {
      alert('Please enter at least one subject for batch generation');
      return;
    }

    if (batchSize < 1) {
      alert('Please enter a valid batch size (minimum 1)');
      return;
    }

    console.log('=== STARTING BATCH GENERATION ===');
    console.log('Subjects:', subjects);
    console.log('Batch size:', batchSize);
    console.log('Current preview items count:', previewItems.length);

    setBatchGenerating(true);
    setBatchProgress({ current: 0, total: subjects.length * batchSize, subject: '' });
    
    try {
      const allNewContent: SK3QLRContent[] = [];
      const existingOrdersMap = getExistingOrdersForSubjects(subjects);
      
      // Maintain a local array of preview items that gets updated synchronously
      let currentPreviewItems = [...previewItems];
      
      // Get available inputs for quiz_3 (images from the current topic)
      const availableInputs = assets
        .filter(asset => asset.type === 'image' && asset.category === 'image')
        .map(asset => asset.key)
        .filter((key, index, arr) => arr.indexOf(key) === index); // Remove duplicates
      
      for (let subjectIndex = 0; subjectIndex < subjects.length; subjectIndex++) {
        const subject = subjects[subjectIndex];
        // Normalize subject the same way the API does
        const normalizedSubject = subject.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const existingOrders = existingOrdersMap[normalizedSubject] || [];
        
        // Get existing preview items for this subject to calculate next order
        // Normalize subject the same way the API does
        const existingPreviewItems = currentPreviewItems.filter(item => item.key.toLowerCase() === normalizedSubject);
        const existingPreviewOrders = existingPreviewItems.map(item => item.order);
        
        console.log(`🔍 KEY MATCHING DEBUG for ${subject}:`);
        console.log('Subject (original):', subject);
        console.log('Subject (normalized):', normalizedSubject);
        console.log('All preview items keys:', previewItems.map(item => item.key));
        console.log('Matching preview items:', existingPreviewItems);
        console.log('Found orders:', existingPreviewOrders);
        
        // Combine existing orders from both sources
        const allExistingOrders = [...existingOrders, ...existingPreviewOrders];
        const maxExistingOrder = allExistingOrders.length > 0 ? Math.max(...allExistingOrders) : 0;
        
        // Track the current highest order for this subject within this batch
        let currentBatchMaxOrder = maxExistingOrder;
        
        console.log(`=== BATCH GENERATION DEBUG for ${subject} ===`);
        console.log('Existing orders from disk:', existingOrders);
        console.log('Existing preview orders:', existingPreviewOrders);
        console.log('All existing orders:', allExistingOrders);
        console.log('Max existing order:', maxExistingOrder);
        console.log('Starting currentBatchMaxOrder:', currentBatchMaxOrder);
        
        for (let batchIndex = 0; batchIndex < batchSize; batchIndex++) {
          const currentProgress = subjectIndex * batchSize + batchIndex + 1;
          setBatchProgress({ 
            current: currentProgress, 
            total: subjects.length * batchSize, 
            subject: subject 
          });
          
          // Calculate next order number for this subject
          const nextOrder = currentBatchMaxOrder + 1;
          
          console.log(`--- Generating item ${batchIndex + 1} for ${subject} ---`);
          console.log('Current batch max order:', currentBatchMaxOrder);
          console.log('Calculated next order:', nextOrder);
          
          // Get existing content for this subject to avoid repetition
          const existingJsons = assetGroups
            .filter(group => group.key.toLowerCase() === normalizedSubject)
            .flatMap(group => group.assets.jsons);
          
          // Read actual content from existing JSON files
          const existingContentData = [];
          for (const json of existingJsons) {
            try {
              const response = await fetch(`/api/assets/preview?path=${encodeURIComponent(json.path)}&channel=${selectedChannel}&topic=${selectedTopic}`);
              if (response.ok) {
                const content = await response.text();
                const jsonData = JSON.parse(content);
                existingContentData.push({
                  filename: json.name,
                  order: json.order,
                  intro: jsonData.intro?.text || '',
                  quiz1: jsonData.quiz_1?.question?.text || '',
                  quiz2: jsonData.quiz_2?.question?.text || '',
                  quiz3: jsonData.quiz_3?.question?.text || '',
                  lesson: jsonData.lesson?.voice || '',
                  reward: jsonData.reward?.voice || ''
                });
              }
            } catch (error) {
              console.error(`Error reading JSON file ${json.name}:`, error);
            }
          }
          
          // Get existing preview items for this specific subject only
          const existingPreviewItemsForSubject = currentPreviewItems.filter(item => 
            item.key.toLowerCase() === normalizedSubject
          );
          
          // Convert preview items to the format expected by the API
          const existingPreviewContent = existingPreviewItemsForSubject.map(item => ({
            order: item.order,
            intro: item.intro.text,
            quiz1: item.quiz_1.question.text,
            quiz2: item.quiz_2.question.text,
            quiz3: item.quiz_3.question.text,
            lesson: item.lesson.voice,
            reward: item.reward.voice
          }));
          
          try {
            const response = await fetch('/api/assets/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                prompt: subject,
                description: aiDescription,
                language: aiLanguage,
                topic: selectedTopic,
                provider: aiProvider,
                order: nextOrder,
                existingContent: existingContentData,
                previewItems: existingPreviewContent, // Only send content for this specific subject
                availableInputs: availableInputs
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to generate content for ${subject}_${nextOrder}`);
            }

            const data = await response.json();
            const newContent = { 
              ...data.content, 
              order: nextOrder, 
              id: `${data.content.key}_${nextOrder}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            allNewContent.push(newContent);
            
            // Update both the React state and local array immediately so subsequent generations can see this content
            setPreviewItems(prev => {
              const newPreviewItems = [...prev, newContent];
              console.log(`✓ Updated previewItems for ${subject} order ${nextOrder}`);
              console.log('Current previewItems count:', newPreviewItems.length);
              return newPreviewItems;
            });
            
            // Update local array synchronously for next iteration
            currentPreviewItems.push(newContent);
            console.log(`✓ Updated local currentPreviewItems for ${subject} order ${nextOrder}`);
            console.log('Local currentPreviewItems count:', currentPreviewItems.length);
            
            console.log(`✓ Successfully generated ${subject} order ${nextOrder}`);
            console.log('New content added:', newContent);
            
            // Update the current batch max order for the next iteration
            currentBatchMaxOrder = nextOrder;
            console.log('Updated currentBatchMaxOrder to:', currentBatchMaxOrder);
          } catch (error) {
            console.error(`Error generating content for ${subject}_${nextOrder}:`, error);
            // Continue with other items even if one fails
          }
        }
      }
      
      // Show success message
      setToast({ 
        message: `Successfully generated ${allNewContent.length} content items for ${subjects.length} subjects`, 
        type: 'success' 
      });
      setTimeout(() => setToast(null), 5000);
      
    } catch (error) {
      console.error('Error in batch generation:', error);
      setToast({ 
        message: `Batch generation failed: ${(error as Error).message}`, 
        type: 'error' 
      });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setBatchGenerating(false);
      setBatchProgress(null);
    }
  };

  const removePreviewItem = (index: number) => {
    setPreviewItems(prev => {
      const newItems = prev.filter((_, i) => i !== index);
      return newItems;
    });
  };

  const clearAllPreviews = () => {
    setPreviewItems([]);
    // Reset existing orders to original state
    if (isBatchMode) {
      // For batch mode, reset all subjects' orders
      const subjects = parseSubjectsList(subjectsList);
      subjects.forEach(subject => {
        checkExistingOrders(subject);
      });
    } else {
      checkExistingOrders(aiPrompt);
    }
  };

  const approveGeneratedContent = async () => {
    if (previewItems.length === 0) {
      alert('No content to approve');
      return;
    }

    try {
      // Create all render files
      const results = [];
      for (const content of previewItems) {
        const response = await fetch('/api/assets/render', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: content,
            channel: selectedChannel,
            topic: selectedTopic
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create render file for ${content.key}_${content.order}.json`);
        }

        const data = await response.json();
        results.push(data.fileName);
      }
      
      // Refresh assets list to show the new files
      fetchAssets();
      
      // Show success dialog
      setSuccessMessage(`Successfully created ${results.length} render file(s): ${results.join(', ')}`);
      setShowSuccessDialog(true);
      
      // Clear previews and close dialog
      setPreviewItems([]);
      setShowAIGenerator(false);
      
    } catch (error) {
      console.error('Error creating render files:', error);
      alert('Failed to create render files. Please try again.');
    }
  };

  const handlePreviewAsset = (asset: Asset, videoMode = false) => {
    setPreviewAsset(asset);
    setPreviewVideoMode(videoMode);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    // Stop any playing media when closing
    const videos = document.querySelectorAll('video');
    const audios = document.querySelectorAll('audio');
    
    videos.forEach(video => {
      video.pause();
      video.currentTime = 0;
    });
    
    audios.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    setShowPreview(false);
    setPreviewVideoMode(false);
  };

  const getAssetPreviewContent = (asset: Asset) => {
    const previewUrl = `/api/assets/preview?path=${encodeURIComponent(asset.path)}&channel=${selectedChannel}&topic=${selectedTopic}`;
    
    switch (asset.type) {
      case 'image':
        return (
          <div className="text-center">
            <img 
              src={previewUrl}
              alt={asset.name}
              className="max-w-full max-h-96 object-contain rounded-lg"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2Ij5JbWFnZSBQcmV2aWV3PC90ZXh0Pgo8L3N2Zz4K';
              }}
            />
          </div>
        );
      case 'video':
        return (
          <video 
            controls 
            autoPlay
            className="max-w-full max-h-96 rounded-lg"
            src={previewUrl}
          >
            Your browser does not support the video tag.
          </video>
        );
      case 'voice':
        return (
          <div className="text-center space-y-4">
            <div className="text-6xl">🎵</div>
            <audio controls autoPlay className="w-full">
              <source src={previewUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
            <p className="text-text-muted">{asset.name}</p>
          </div>
        );
      case 'json':
        return (
          <JSONPreview asset={asset} initialViewMode={previewVideoMode ? 'video' : 'json'} />
        );
      default:
        return <div className="text-center text-text-muted">Preview not available</div>;
    }
  };

  // JSON Preview Component
  const JSONPreview = ({ asset, initialViewMode = 'json' }: { asset: Asset; initialViewMode?: 'json' | 'video' }) => {
    const [jsonContent, setJsonContent] = useState<string>('Loading...');
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'json' | 'video'>(initialViewMode);
    const [parsedJson, setParsedJson] = useState<any>(null);

    useEffect(() => {
      const loadJSON = async () => {
        try {
          // Add cache-busting parameter to ensure fresh content
          const timestamp = Date.now();
          const response = await fetch(`/api/assets/preview?path=${encodeURIComponent(asset.path)}&channel=${selectedChannel}&topic=${selectedTopic}&t=${timestamp}`);
          if (response.ok) {
            const content = await response.text();
            const parsed = JSON.parse(content);
            const formattedContent = JSON.stringify(parsed, null, 2);
            setJsonContent(formattedContent);
            setEditContent(formattedContent);
            setParsedJson(parsed);
          } else {
            setJsonContent('Failed to load JSON content');
          }
        } catch (error) {
          setJsonContent('Error loading JSON content');
        } finally {
          setLoading(false);
        }
      };

      loadJSON();
    }, [asset.path, selectedChannel, selectedTopic]);

    const handleEdit = () => {
      setIsEditing(true);
    };

    const handleCancel = () => {
      setIsEditing(false);
      setEditContent(jsonContent); // Reset to original content
    };

    const reloadJsonContent = async () => {
      try {
        // Add cache-busting parameter to ensure fresh content
        const timestamp = Date.now();
        const response = await fetch(`/api/assets/preview?path=${encodeURIComponent(asset.path)}&channel=${selectedChannel}&topic=${selectedTopic}&t=${timestamp}`);
        if (response.ok) {
          const content = await response.text();
          const parsed = JSON.parse(content);
          const formattedContent = JSON.stringify(parsed, null, 2);
          setJsonContent(formattedContent);
          setEditContent(formattedContent);
          setParsedJson(parsed);
        }
      } catch (error) {
        console.error('Error reloading JSON content:', error);
      }
    };

    const handleSave = async () => {
      try {
        setSaving(true);
        
        // Validate JSON
        let parsedJson;
        try {
          parsedJson = JSON.parse(editContent);
        } catch (error) {
          alert('Invalid JSON format. Please check your syntax.');
          return;
        }

        const response = await fetch('/api/assets/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: asset.path,
            channel: selectedChannel,
            topic: selectedTopic,
            content: parsedJson
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save JSON content');
        }

        // Reload the content from server to ensure we have the latest data
        await reloadJsonContent();
        setIsEditing(false);
        
        // Show success message without blocking UI
        setToast({ message: 'JSON content saved successfully!', type: 'success' });
        setTimeout(() => setToast(null), 3000);
        
        // Update the specific asset in the state instead of refreshing all assets
        setAssetGroups(prevGroups => {
          return prevGroups.map(group => {
            if (group.key === asset.key) {
              return {
                ...group,
                assets: {
                  ...group.assets,
                  jsons: group.assets.jsons.map(json => {
                    if (json.id === asset.id) {
                      return {
                        ...json,
                        lastModified: new Date()
                      };
                    }
                    return json;
                  })
                }
              };
            }
            return group;
          });
        });
        
      } catch (error) {
        console.error('Error saving JSON content:', error);
        alert('Failed to save JSON content. Please try again.');
      } finally {
        setSaving(false);
      }
    };

    // Video Preview Component
    const VideoPreview = ({ jsonData, asset }: { jsonData: any; asset: Asset }) => {
      const [currentSection, setCurrentSection] = useState(0);
      const [isPlaying, setIsPlaying] = useState(false);
      const [currentTime, setCurrentTime] = useState(0);
      const [totalDuration, setTotalDuration] = useState(0);
      const videoRef = useRef<HTMLVideoElement>(null);

      const sections = [
        { name: 'Intro', icon: '🎬', duration: 5 },
        { name: 'Quiz 1', icon: '❓', duration: 8 },
        { name: 'Quiz 2', icon: '❓', duration: 8 },
        { name: 'Quiz 3', icon: '❓', duration: 8 },
        { name: 'Lesson', icon: '📚', duration: 6 },
        { name: 'Reward', icon: '🏆', duration: 4 }
      ];

      useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
          interval = setInterval(() => {
            setCurrentTime(prev => {
              const newTime = prev + 0.1;
              if (newTime >= totalDuration) {
                setIsPlaying(false);
                return 0;
              }
              
              // Update current section based on time
              let accumulatedTime = 0;
              for (let i = 0; i < sections.length; i++) {
                if (newTime < accumulatedTime + sections[i].duration) {
                  setCurrentSection(i);
                  break;
                }
                accumulatedTime += sections[i].duration;
              }
              
              return newTime;
            });
          }, 100);
        }
        return () => clearInterval(interval);
      }, [isPlaying, totalDuration]);

      useEffect(() => {
        // Calculate total duration
        const total = sections.reduce((sum, section) => sum + section.duration, 0);
        setTotalDuration(total);
        
        // Initialize current section based on time
        let accumulatedTime = 0;
        for (let i = 0; i < sections.length; i++) {
          if (currentTime < accumulatedTime + sections[i].duration) {
            setCurrentSection(i);
            break;
          }
          accumulatedTime += sections[i].duration;
        }
      }, [currentTime]);

      // Auto-play lesson and reward videos when section changes
      useEffect(() => {
        if ((currentSection === 4 || currentSection === 5) && videoRef.current) {
          videoRef.current.play().catch((e: any) => console.log('Auto-play failed:', e));
        }
      }, [currentSection]);



      const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
      };

      const handleSeek = (time: number) => {
        setCurrentTime(time);
        // Calculate which section we're in
        let accumulatedTime = 0;
        for (let i = 0; i < sections.length; i++) {
          if (time < accumulatedTime + sections[i].duration) {
            setCurrentSection(i);
            break;
          }
          accumulatedTime += sections[i].duration;
        }
      };

      const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      };

      const getCurrentSectionContent = () => {
        if (!jsonData) return null;

        switch (currentSection) {
          case 0: // Intro
            return {
              title: 'Introduction',
              text: jsonData.intro?.text || 'No intro text available',
              voice: jsonData.intro?.voice || 'No voice available'
            };
          case 1: // Quiz 1
            return {
              title: 'Quiz 1',
              question: jsonData.quiz_1?.question?.text || 'No question available',
              options: jsonData.quiz_1?.options || [],
              answer: jsonData.quiz_1?.answer?.position || 0,
              voice: jsonData.quiz_1?.question?.voice || 'No voice available'
            };
          case 2: // Quiz 2
            return {
              title: 'Quiz 2',
              question: jsonData.quiz_2?.question?.text || 'No question available',
              options: jsonData.quiz_2?.options || [],
              answer: jsonData.quiz_2?.answer?.position || 0,
              voice: jsonData.quiz_2?.question?.voice || 'No voice available'
            };
          case 3: // Quiz 3
            return {
              title: 'Quiz 3',
              question: jsonData.quiz_3?.question?.text || 'No question available',
              options: jsonData.quiz_3?.options || [],
              answer: jsonData.quiz_3?.answer?.position || 0,
              voice: jsonData.quiz_3?.question?.voice || 'No voice available'
            };
          case 4: // Lesson
            return {
              title: 'Lesson',
              text: 'Educational content about the topic',
              voice: jsonData.lesson?.voice || 'No voice available'
            };
          case 5: // Reward
            return {
              title: 'Reward',
              text: 'Congratulations! You completed the lesson!',
              voice: jsonData.reward?.voice || 'No voice available'
            };
          default:
            return null;
        }
      };

      const content = getCurrentSectionContent();
      
      // Debug log to see if currentSection is updating
      console.log('VideoPreview - currentSection:', currentSection, 'currentTime:', currentTime, 'content:', content);

      return (
        <div className="bg-surface rounded-lg p-6 space-y-6 min-h-[600px]">
          {/* Video Player Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🎬</div>
              <div>
                <h3 className="text-lg font-semibold text-text">Video Preview</h3>
                <p className="text-sm text-text-muted">{asset.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePlayPause}
                className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-accent-fg font-medium transition-colors"
              >
                {isPlaying ? '⏸️ Pause' : '▶️ Play'}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-text-muted">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="0"
                max={totalDuration}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full h-2 bg-surface-raised rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${(currentTime / totalDuration) * 100}%, var(--color-surface-sunken) ${(currentTime / totalDuration) * 100}%, var(--color-surface-sunken) 100%)`
                }}
              />
            </div>
          </div>

          {/* Section Indicators */}
          <div className="flex space-x-2">
            {sections.map((section, index) => {
              const sectionStart = sections.slice(0, index).reduce((sum, s) => sum + s.duration, 0);
              const sectionEnd = sectionStart + section.duration;
              const isActive = currentTime >= sectionStart && currentTime < sectionEnd;
              const isCompleted = currentTime >= sectionEnd;

              return (
                <button
                  key={section.name}
                  onClick={() => handleSeek(sectionStart)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-accent text-accent-fg' 
                      : isCompleted 
                        ? 'bg-success text-white' 
                        : 'bg-surface-raised text-text-muted hover:bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>{section.icon}</span>
                    <span>{section.name}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Current Section Content */}
          {content && (
            <div className="bg-surface-raised rounded-lg p-6 space-y-4 min-h-[400px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{sections[currentSection].icon}</div>
                  <h4 className="text-xl font-semibold text-text">{content.title}</h4>
                </div>
                <div className="text-sm text-text-muted">
                  Section {currentSection + 1} of {sections.length} • {formatTime(currentTime)} / {formatTime(totalDuration)}
                </div>
              </div>

              {/* Content Display */}
              <div className="space-y-4">
                {currentSection >= 1 && currentSection <= 3 ? (
                  // Quiz Section
                  <div className="space-y-4">
                    <div className="bg-surface-raised rounded-lg p-4">
                      <h5 className="text-lg font-medium text-text mb-2">Question:</h5>
                      <p className="text-text-muted">{content.question}</p>
                    </div>
                    
                                         <div className="grid grid-cols-2 gap-3">
                       {content.options.map((option: string, index: number) => (
                         <div
                           key={index}
                           className={`p-3 rounded-lg text-left transition-all ${
                             index === (content.answer - 1) // Convert 1-based to 0-based
                               ? 'bg-success text-white border-2 border-success'
                               : 'bg-surface-raised text-text-muted'
                           }`}
                         >
                           <div className="flex items-center space-x-2">
                             <span className="text-sm font-medium">
                               {String.fromCharCode(65 + index)}.
                             </span>
                             <span>{option}</span>
                             {index === (content.answer - 1) && (
                               <span className="ml-auto text-success">✓</span>
                             )}
                           </div>
                           
                           {/* Show image for Quiz 3 if available */}
                           {currentSection === 3 && (
                             <div className="mt-2">
                               {(() => {
                                 const imagePath = `${config.workingDirectory}/${selectedChannel}/${selectedTopic}/image/options/${option.toLowerCase()}.png`;
                                 console.log('Quiz 3 Image Path:', imagePath);
                                 return (
                                   <img 
                                     src={`/api/assets/preview?path=${encodeURIComponent(imagePath)}&channel=${selectedChannel}&topic=${selectedTopic}`}
                                     alt={option}
                                     className="w-full aspect-square object-cover rounded"
                                     onError={(e) => {
                                       const img = e.currentTarget as HTMLImageElement;
                                       console.log('Image failed to load:', img.src);
                                       // Try jpg if png fails
                                       if (img.src.includes('.png')) {
                                         img.src = img.src.replace('.png', '.jpg');
                                       } else if (img.src.includes('.jpg')) {
                                         img.src = img.src.replace('.jpg', '.jpeg');
                                       } else {
                                         // Show placeholder if all formats fail
                                         img.src = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPkltYWdlIG5vdCBmb3VuZDwvdGV4dD4KPC9zdmc+`;
                                       }
                                     }}
                                   />
                                 );
                               })()}
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                  </div>
                                 ) : (
                   // Non-Quiz Section
                   <div className="space-y-4">
                     <div className="bg-surface-raised rounded-lg p-4">
                       <h5 className="text-lg font-medium text-text mb-2">Content:</h5>
                       <p className="text-text-muted">{content.text}</p>
                     </div>
                     
                     {/* Show video preview for Lesson and Reward sections */}
                     {(currentSection === 4 || currentSection === 5) && (
                       <div className="bg-surface-raised rounded-lg p-4">
                         <h5 className="text-lg font-medium text-text mb-2">Video Preview:</h5>
                         <video 
                           ref={videoRef}
                           src={`/api/assets/preview?path=${encodeURIComponent(`${config.workingDirectory}/${selectedChannel}/${selectedTopic}/${currentSection === 5 ? `reward/output/reward_${asset.order}/${asset.key}.mp4` : `video/${asset.key}.mp4`}`)}&channel=${selectedChannel}&topic=${selectedTopic}`}
                           className={`w-full ${currentSection === 4 || currentSection === 5 ? 'aspect-square' : 'h-32'} object-cover rounded`}
                           controls
                           autoPlay={currentSection === 4 || currentSection === 5}
                           muted={currentSection === 4 || currentSection === 5}
                           onError={(e) => {
                             const video = e.currentTarget as HTMLVideoElement;
                             const fallback = video.nextElementSibling as HTMLElement;
                             if (video && fallback) {
                               video.style.display = 'none';
                               fallback.style.display = 'flex';
                             }
                           }}
                         />
                         <div className="w-full h-32 bg-surface-raised rounded flex items-center justify-center" style={{ display: 'none' }}>
                           <div className="text-center">
                             <div className="text-3xl mb-2">🎬</div>
                             <span className="text-sm text-text-muted">
                               {currentSection === 4 ? 'Lesson video not found' : `Reward video not found (${asset.key}.mp4)`}
                             </span>
                           </div>
                         </div>
                       </div>
                     )}
                   </div>
                 )}

                {/* Voice Preview */}
                <div className="bg-info rounded-lg p-4">
                  <h5 className="text-lg font-medium text-white mb-2">Voice Narration:</h5>
                  <p className="text-white">{content.voice}</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-sm text-white">🎵</span>
                    <span className="text-sm text-white">Voice file would play here</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="bg-surface-sunken rounded-lg p-4 max-h-[80vh] overflow-auto w-full max-w-4xl">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h4 className="text-lg font-semibold text-accent">JSON Content</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('json')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      viewMode === 'json' 
                        ? 'bg-accent text-accent-fg' 
                        : 'bg-surface-raised text-text-muted hover:bg-surface'
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setViewMode('video')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      viewMode === 'video' 
                        ? 'bg-accent text-accent-fg' 
                        : 'bg-surface-raised text-text-muted hover:bg-surface'
                    }`}
                  >
                    🎬 Video Preview
                  </button>
                </div>
              </div>
              
              {viewMode === 'json' && !isEditing && (
                <button
                  onClick={handleEdit}
                  className="px-3 py-1 bg-info text-white hover:opacity-90 rounded text-sm transition-colors"
                >
                  Edit
                </button>
              )}
              
              {viewMode === 'json' && isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1 bg-success text-white hover:opacity-90 disabled:bg-surface-raised rounded text-sm transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1 bg-surface-raised hover:bg-surface rounded text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            
            {viewMode === 'json' ? (
              isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-80 bg-surface text-text-muted text-sm font-mono p-4 rounded border border-border focus:border-accent focus:outline-none resize-none"
                  placeholder="Edit JSON content here..."
                />
              ) : (
                <pre className="text-sm text-text-muted whitespace-pre-wrap">
                  {jsonContent}
                </pre>
              )
            ) : (
              <VideoPreview jsonData={parsedJson} asset={asset} />
            )}
          </div>
        )}
      </div>
    );
  };

  // State for tracking voice generation progress per JSON asset
  const [voiceGeneratingStates, setVoiceGeneratingStates] = useState<{ [key: string]: boolean }>({});

  const handleGenerateVoice = async (jsonAsset: Asset) => {
    const assetKey = `${jsonAsset.key}_${jsonAsset.order}`;
    
    // Set loading state for this specific asset
    setVoiceGeneratingStates(prev => ({ ...prev, [assetKey]: true }));
    
    try {
      // First, read the JSON content to get the text for voice generation
      const response = await fetch(`/api/assets/preview?path=${encodeURIComponent(jsonAsset.path)}&channel=${selectedChannel}&topic=${selectedTopic}`);
      if (!response.ok) {
        throw new Error('Failed to read JSON content');
      }
      
      const jsonContent = await response.text();
      const jsonData = JSON.parse(jsonContent);
      
      // Extract all voice texts from the JSON
      const voiceTexts = [
        { name: 'voice_title.mp3', text: jsonData.intro?.voice || jsonData.intro?.text || '' },
        { name: 'voice_q1_title.mp3', text: jsonData.quiz_1?.question?.voice || jsonData.quiz_1?.question?.text || '' },
        { name: 'voice_q1_ans.mp3', text: jsonData.quiz_1?.answer?.voice || '' },
        { name: 'voice_q2_title.mp3', text: jsonData.quiz_2?.question?.voice || jsonData.quiz_2?.question?.text || '' },
        { name: 'voice_q2_ans.mp3', text: jsonData.quiz_2?.answer?.voice || '' },
        { name: 'voice_q3_title.mp3', text: jsonData.quiz_3?.question?.voice || jsonData.quiz_3?.question?.text || '' },
        { name: 'voice_q3_ans.mp3', text: jsonData.quiz_3?.answer?.voice || '' },
        { name: 'voice_lesson.mp3', text: jsonData.lesson?.voice || '' },
        { name: 'voice_reward.mp3', text: jsonData.reward?.voice || '' }
      ].filter(item => item.text.trim() !== ''); // Only include non-empty texts
      
      if (voiceTexts.length === 0) {
        throw new Error('No voice text found in the JSON file. Please check the JSON content.');
      }
      
      // Generate each voice file
      const results: Array<{ success: boolean; file: string; path?: string; error?: string }> = [];
      for (let i = 0; i < voiceTexts.length; i++) {
        const voiceItem = voiceTexts[i];
        
        try {
          const voiceResponse = await fetch('/api/assets/generate-voice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: voiceItem.text,
              filename: voiceItem.name,
              jsonKey: jsonAsset.key,
              jsonOrder: jsonAsset.order,
              channel: selectedChannel,
              topic: selectedTopic
            }),
          });
          
          if (!voiceResponse.ok) {
            throw new Error(`Failed to generate ${voiceItem.name}: ${voiceResponse.statusText}`);
          }
          
          const voiceResult = await voiceResponse.json();
          results.push({ success: true, file: voiceItem.name, path: voiceResult.path });
          
        } catch (error) {
          console.error(`Error generating ${voiceItem.name}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ success: false, file: voiceItem.name, error: errorMessage });
        }
      }
      
      // Update the specific asset group with new voice files
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      if (successful > 0) {
        // Update the specific asset group instead of refreshing all assets
        setAssetGroups(prevGroups => {
          return prevGroups.map(group => {
            if (group.key === jsonAsset.key) {
              // Add the new voice files to the group
              const newVoices = results
                .filter(r => r.success)
                .map(result => ({
                  id: `voice_${Date.now()}_${Math.random()}`, // Generate temporary ID
                  name: result.file,
                  type: 'voice' as const,
                  category: 'voice',
                  path: result.path!,
                  key: jsonAsset.key,
                  order: jsonAsset.order,
                  status: 'available' as const
                }));
              
              const updatedGroup = {
                ...group,
                assets: {
                  ...group.assets,
                  voices: [...group.assets.voices, ...newVoices]
                },
                renderStatus: {
                  ...group.renderStatus,
                  availableVoices: group.renderStatus.availableVoices + successful
                }
              };
              
              // Reorganize JSON-Asset pairs to update voice status
              // We need to reload JSON content to maintain Quiz 3 image options information
              // For now, we'll use the existing jsonAssetPairs but update the voice information
              // The Quiz 3 image options will be preserved from the existing pairs
              updatedGroup.assets.jsonAssetPairs = updatedGroup.assets.jsonAssetPairs.map(pair => {
                if (pair.json.key === jsonAsset.key && pair.json.order === jsonAsset.order) {
                  // Update the voices for this specific JSON pair
                  const updatedVoices = [...pair.voices, ...newVoices];
                  
                  // Recalculate voice types and missing voices
                  const voiceTypes = {
                    intro: false,
                    quiz1_question: false,
                    quiz1_answer: false,
                    quiz2_question: false,
                    quiz2_answer: false,
                    quiz3_question: false,
                    quiz3_answer: false,
                    lesson: false,
                    reward: false
                  };
                  
                  const missingVoices: string[] = [];
                  
                  updatedVoices.forEach(voice => {
                    const voiceName = voice.name.toLowerCase();
                    if (voiceName === 'voice_title.mp3') voiceTypes.intro = true;
                    else if (voiceName === 'voice_q1_title.mp3') voiceTypes.quiz1_question = true;
                    else if (voiceName === 'voice_q1_ans.mp3') voiceTypes.quiz1_answer = true;
                    else if (voiceName === 'voice_q2_title.mp3') voiceTypes.quiz2_question = true;
                    else if (voiceName === 'voice_q2_ans.mp3') voiceTypes.quiz2_answer = true;
                    else if (voiceName === 'voice_q3_title.mp3') voiceTypes.quiz3_question = true;
                    else if (voiceName === 'voice_q3_ans.mp3') voiceTypes.quiz3_answer = true;
                    else if (voiceName === 'voice_lesson.mp3') voiceTypes.lesson = true;
                    else if (voiceName === 'voice_reward.mp3') voiceTypes.reward = true;
                  });
                  
                  // Check for missing voice types
                  if (!voiceTypes.intro) missingVoices.push('intro');
                  if (!voiceTypes.quiz1_question) missingVoices.push('quiz1_question');
                  if (!voiceTypes.quiz1_answer) missingVoices.push('quiz1_answer');
                  if (!voiceTypes.quiz2_question) missingVoices.push('quiz2_question');
                  if (!voiceTypes.quiz2_answer) missingVoices.push('quiz2_answer');
                  if (!voiceTypes.quiz3_question) missingVoices.push('quiz3_question');
                  if (!voiceTypes.quiz3_answer) missingVoices.push('quiz3_answer');
                  if (!voiceTypes.lesson) missingVoices.push('lesson');
                  if (!voiceTypes.reward) missingVoices.push('reward');
                  
                  return {
                    ...pair,
                    voices: updatedVoices,
                    hasAllVoices: missingVoices.length === 0,
                    missingVoices,
                    voiceTypes
                    // Keep the existing quiz3ImageOptions unchanged
                  };
                }
                return pair;
              });
              
              return updatedGroup;
            }
            return group;
          });
        });
        
        // Show success notification without blocking UI
        const successMessage = `✅ Generated ${successful} voice files for ${jsonAsset.name}`;
        if (failed > 0) {
          console.warn(`❌ Failed to generate ${failed} files. Check console for details.`);
        }
        
        // Show toast notification
        setToast({ message: successMessage, type: 'success' });
        setTimeout(() => setToast(null), 3000);
        
      } else {
        throw new Error('Failed to generate any voice files. Please check the console for details.');
      }
      
    } catch (error) {
      console.error('Error generating voice files:', error);
      // Show error toast notification
      setToast({ message: `Failed to generate voice files: ${(error as Error).message}`, type: 'error' });
      setTimeout(() => setToast(null), 5000);
    } finally {
      // Clear loading state for this specific asset
      setVoiceGeneratingStates(prev => ({ ...prev, [assetKey]: false }));
    }
  };

  const handleGenerateReward = async (jsonAsset: Asset) => {
    if (!confirm(`Generate reward video for ${jsonAsset.name}?`)) {
      return;
    }
    
    try {
      // This is a placeholder for the reward generation functionality
      // You can implement this later with your reward generation API
      alert(`Reward generation for ${jsonAsset.name} will be implemented soon!`);
      
      // Example API call structure:
      // const response = await fetch('/api/assets/generate-reward', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     jsonPath: jsonAsset.path,
      //     channel: selectedChannel,
      //     topic: selectedTopic,
      //     key: jsonAsset.key,
      //     order: jsonAsset.order
      //   }),
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to generate reward video');
      // }
      
      // Refresh assets to show the new reward video
      // fetchAssets();
      
    } catch (error) {
      console.error('Error generating reward video:', error);
      alert('Failed to generate reward video. Please try again.');
    }
  };

  const handleImageGenerated = (asset: Asset) => {
    // Add the new generated image to the assets list
    setAssets(prev => [...prev, asset]);
    
    // Show success message
    setToast({
      message: `Image "${asset.name}" generated and saved successfully!`,
      type: 'success'
    });
    
    // Auto-dismiss toast after 3 seconds
    setTimeout(() => setToast(null), 3000);
    
    // Close the dialog
    setShowImageGenerationDialog(false);
  };

  // State for topic image generation
  const [imageGeneratingStates, setImageGeneratingStates] = useState<{ [key: string]: boolean }>({});

  const handleGenerateTopicImage = async (group: AssetGroup) => {
    const assetKey = group.key;
    
    // Set loading state for this specific asset group
    setImageGeneratingStates(prev => ({ ...prev, [assetKey]: true }));
    
    try {
      // Determine the topic based on the current selected topic
      const topic = selectedTopic || 'animals';
      
      // Generate the image using the topic-specific API
      const response = await fetch('/api/assets/generate-topic-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: group.name,
          topic: topic, // This will handle 'histories' -> 'history' mapping in the API
          model: 'comfyui', // Use ComfyUI for better quality
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid',
          channel: selectedChannel,
          topicParam: selectedTopic,
          comfyuiUrl: 'http://localhost:8188' // Specify ComfyUI URL
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();

      if (data.success && data.savedAsset) {
        // Update the specific asset group instead of refreshing all assets
        setAssetGroups(prevGroups => {
          return prevGroups.map(g => {
            if (g.key === group.key) {
              // Add the new image to the group
              const updatedGroup = {
                ...g,
                assets: {
                  ...g.assets,
                  image: data.savedAsset
                },
                renderStatus: {
                  ...g.renderStatus,
                  hasImage: true
                }
              };
              
              return updatedGroup;
            }
            return g;
          });
        });
        
        // Show success message
        setToast({
          message: `Image for "${group.name}" generated and saved successfully!`,
          type: 'success'
        });
        
        // Auto-dismiss toast after 3 seconds
        setTimeout(() => setToast(null), 3000);
      } else {
        throw new Error('Image generation failed');
      }
    } catch (error) {
      console.error('Error generating topic image:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to generate image. Please try again.',
        type: 'error'
      });
      
      // Auto-dismiss toast after 5 seconds
      setTimeout(() => setToast(null), 5000);
    } finally {
      // Clear loading state
      setImageGeneratingStates(prev => ({ ...prev, [assetKey]: false }));
    }
  };

  const showProviderSelectionForMainImage = (jsonAsset: Asset) => {
    setProviderSelectionConfig({
      title: `Generate Main Image for ${jsonAsset.key}_${jsonAsset.order}`,
      description: 'Choose an AI provider to generate the main image',
      onSelect: (provider: 'openai' | 'grok' | 'comfyui') => {
        handleGenerateMainImage(jsonAsset, provider);
      }
    });
    setShowProviderSelectionDialog(true);
  };

  const handleGenerateMainImage = async (jsonAsset: Asset, provider: 'openai' | 'grok' | 'comfyui' = 'comfyui') => {
    const assetKey = `${jsonAsset.key}_${jsonAsset.order}`;
    
    // Set loading state for this specific JSON asset
    setImageGeneratingStates(prev => ({ ...prev, [assetKey]: true }));
    
    try {
      // Determine the topic based on the current selected topic
      const topic = selectedTopic || 'animals';
      
      // Generate the image using the topic-specific API
      const response = await fetch('/api/assets/generate-topic-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: jsonAsset.key,
          topic: topic,
          model: provider,
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid',
          channel: selectedChannel,
          topicParam: selectedTopic,
          order: jsonAsset.order, // Pass the order to generate the correct filename
          comfyuiUrl: provider === 'comfyui' ? 'http://localhost:8188' : undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();

      if (data.success && data.savedAsset) {
        console.log('🎨 Generated image data:', data.savedAsset);
        console.log('📄 JSON asset:', jsonAsset);
        
        // Update only the specific asset group instead of refreshing all assets
        setAssetGroups(prevGroups => {
          return prevGroups.map(group => {
            if (group.key === jsonAsset.key) {
              console.log('🔧 Updating group:', group.key);
              console.log('📸 Current images:', group.assets.images.length);
              
              // Create the new image asset with proper structure
              const newImageAsset = {
                ...data.savedAsset,
                key: jsonAsset.key,
                order: jsonAsset.order
              };
              
              console.log('🆕 New image asset:', newImageAsset);
              
              // Add the new image to the group's images array
              const updatedGroup = {
                ...group,
                assets: {
                  ...group.assets,
                  images: [...group.assets.images, newImageAsset]
                },
                renderStatus: {
                  ...group.renderStatus,
                  hasImage: true,
                  availableImages: group.renderStatus.availableImages + 1,
                  imageOrders: [...group.renderStatus.imageOrders, jsonAsset.order!]
                }
              };
              
              console.log('✅ Updated group render status:', updatedGroup.renderStatus);
              
              return updatedGroup;
            }
            return group;
          });
        });
        
        // Show success message
        setToast({
          message: `Image for "${jsonAsset.key}_${jsonAsset.order}" generated with ${provider.toUpperCase()} and saved successfully!`,
          type: 'success'
        });
        
        // Auto-dismiss toast after 3 seconds
        setTimeout(() => setToast(null), 3000);
      } else {
        throw new Error('Image generation failed');
      }
    } catch (error) {
      console.error('Error generating main image:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to generate image. Please try again.',
        type: 'error'
      });
      
      // Auto-dismiss toast after 5 seconds
      setTimeout(() => setToast(null), 5000);
    } finally {
      // Clear loading state
      setImageGeneratingStates(prev => ({ ...prev, [assetKey]: false }));
    }
  };

  const showProviderSelectionForMissingImages = (pair: JSONAssetPair) => {
    if (pair.quiz3ImageOptions.missingImages.length === 0) {
      setToast({
        message: 'No missing images to generate',
        type: 'info'
      });
      return;
    }

    setProviderSelectionConfig({
      title: `Generate Missing Quiz 3 Images for ${pair.json.key}_${pair.json.order}`,
      description: `Choose an AI provider to generate ${pair.quiz3ImageOptions.missingImages.length} missing images`,
      onSelect: (provider: 'openai' | 'grok' | 'comfyui') => {
        handleGenerateMissingQuiz3Images(pair, provider);
      }
    });
    setShowProviderSelectionDialog(true);
  };

  const handleGenerateMissingQuiz3Images = async (pair: JSONAssetPair, provider: 'openai' | 'grok' | 'comfyui' = 'comfyui') => {
    const pairKey = `${pair.json.key}_${pair.json.order}`;
    
    // Set loading state for this specific JSON pair
    setImageGeneratingStates(prev => ({ ...prev, [pairKey]: true }));
    
    try {
      const topic = selectedTopic || 'animals';
      const generatedImages: Asset[] = [];
      
      // Generate each missing image
      for (const missingImage of pair.quiz3ImageOptions.missingImages) {
        try {
          const response = await fetch('/api/assets/generate-topic-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subject: missingImage,
              topic: topic,
              model: provider,
              size: '512x512',
              quality: 'standard',
              style: 'vivid',
              channel: selectedChannel,
              topicParam: selectedTopic,
              comfyuiUrl: provider === 'comfyui' ? 'http://localhost:8188' : undefined,
              // Specify that this is for quiz 3 options
              isQuiz3Option: true
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to generate image for ${missingImage}`);
          }

          const data = await response.json();

          if (data.success && data.savedAsset) {
            generatedImages.push(data.savedAsset);
          } else {
            throw new Error(`Image generation failed for ${missingImage}`);
          }
        } catch (error) {
          console.error(`Error generating image for ${missingImage}:`, error);
          throw error;
        }
      }

      // Update the asset groups to reflect the new images
      setAssetGroups(prevGroups => {
        return prevGroups.map(group => {
          const updatedJsonAssetPairs = group.assets.jsonAssetPairs.map(jsonPair => {
            if (jsonPair.json.id === pair.json.id) {
              // Update the quiz 3 image options status
              const updatedMissingImages = pair.quiz3ImageOptions.missingImages.filter(
                missing => !generatedImages.some(img => img.key === missing.toLowerCase().replace(/[^a-z0-9]/g, '_'))
              );
              
              const updatedAvailableImages = [
                ...pair.quiz3ImageOptions.availableImages,
                ...pair.quiz3ImageOptions.missingImages.filter(
                  missing => generatedImages.some(img => img.key === missing.toLowerCase().replace(/[^a-z0-9]/g, '_'))
                )
              ];

              return {
                ...jsonPair,
                quiz3ImageOptions: {
                  ...jsonPair.quiz3ImageOptions,
                  availableImages: updatedAvailableImages,
                  missingImages: updatedMissingImages,
                  hasAllImages: updatedMissingImages.length === 0,
                  completionRate: updatedAvailableImages.length / pair.quiz3ImageOptions.options.length * 100
                }
              };
            }
            return jsonPair;
          });

          return {
            ...group,
            assets: {
              ...group.assets,
              jsonAssetPairs: updatedJsonAssetPairs
            }
          };
        });
      });

      // Show success message
      setToast({
        message: `Generated ${generatedImages.length} missing quiz 3 images with ${provider.toUpperCase()} successfully!`,
        type: 'success'
      });
      
      // Auto-dismiss toast after 3 seconds
      setTimeout(() => setToast(null), 3000);
      
    } catch (error) {
      console.error('Error generating missing quiz 3 images:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to generate missing images. Please try again.',
        type: 'error'
      });
      
      // Auto-dismiss toast after 5 seconds
      setTimeout(() => setToast(null), 5000);
    } finally {
      // Clear loading state
      setImageGeneratingStates(prev => ({ ...prev, [pairKey]: false }));
    }
  };

  // Image editor functions
  const handleEditImage = (asset: Asset, type: 'main' | 'quiz3') => {
    setEditingImage({ asset, type });
    setShowImageEditor(true);
  };

  const handleImageEditorSave = async (editedImageBlob: Blob, fileName: string) => {
    if (!editingImage) return;

    try {
      const formData = new FormData();
      formData.append('image', editedImageBlob, fileName);
      formData.append('channel', selectedChannel);
      formData.append('topic', selectedTopic);
      formData.append('type', editingImage.type);
      
      if (editingImage.type === 'main') {
        formData.append('key', editingImage.asset.key || '');
        formData.append('order', editingImage.asset.order?.toString() || '');
      } else {
        // For quiz 3 images, we need to specify the image name
        const imageName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
        formData.append('imageName', imageName);
      }

      const response = await fetch('/api/assets/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save edited image');
      }

      const data = await response.json();
      
      if (data.success) {
        setToast({
          message: 'Image edited and saved successfully!',
          type: 'success'
        });
        
        // Refresh assets to show the updated image
        await fetchAssets();
      } else {
        throw new Error(data.error || 'Failed to save image');
      }
    } catch (error) {
      console.error('Error saving edited image:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to save edited image',
        type: 'error'
      });
    } finally {
      setShowImageEditor(false);
      setEditingImage(null);
    }
  };

  const handleImageEditorClose = () => {
    setShowImageEditor(false);
    setEditingImage(null);
  };

  const [showCrawlerDialog, setShowCrawlerDialog] = useState(false);
  const [selectedJsonAsset, setSelectedJsonAsset] = useState<Asset | null>(null);
  interface CrawlerResource {
    name: string;
    path: string;
    url: string;
  }

  interface SelectionState {
    [key: string]: {
      isSelected: boolean;
      isLoading: boolean;
      error?: string;
    };
  }

  const [crawlerResources, setCrawlerResources] = useState<{
    images: CrawlerResource[];
    videos: CrawlerResource[];
  }>({ images: [], videos: [] });

  const [selectionState, setSelectionState] = useState<SelectionState>({});
  
  const [fullscreenImage, setFullscreenImage] = useState<CrawlerResource | null>(null);
  const [showQuizOptionMenu, setShowQuizOptionMenu] = useState(false);
  const [missingQuizOptions, setMissingQuizOptions] = useState<string[]>([]);

  interface CrawlerResourcesByOption {
    [key: string]: {
      images: CrawlerResource[];
      videos: CrawlerResource[];
    }
  }

  const [crawlerResourcesByOption, setCrawlerResourcesByOption] = useState<CrawlerResourcesByOption>({});

  const handleFetchCrawlerResources = async (jsonAsset: Asset | null) => {
    if (!jsonAsset) return;
    setSelectedJsonAsset(jsonAsset);
    try {
      // Get the current quiz3 options and find which ones are missing
      const pair = assetGroups
        .find(group => group.key === jsonAsset?.key)
        ?.assets.jsonAssetPairs
        .find(p => p.json.id === jsonAsset?.id);
        
      if (pair && pair.quiz3ImageOptions) {
        const missingOpts = pair.quiz3ImageOptions.missingImages;
        setMissingQuizOptions(missingOpts);

        // Fetch resources for each missing option and main asset
        const resourcesByOption: CrawlerResourcesByOption = {};

        // Fetch for main asset (hamster)
        const mainImageResponse = await fetch(`/api/crawlers?mode=resources&type=image&channel=${selectedChannel}&topic=${selectedTopic}&key=${jsonAsset.key}`);
        const mainVideoResponse = await fetch(`/api/crawlers?mode=resources&type=video&channel=${selectedChannel}&topic=${selectedTopic}&key=${jsonAsset.key}`);
        
        const mainImages = await mainImageResponse.json();
        const mainVideos = await mainVideoResponse.json();
        
        setCrawlerResources({
          images: mainImages.files || [],
          videos: mainVideos.files || []
        });

        // Fetch for each missing option (rabbit, dog, etc.)
        await Promise.all(missingOpts.map(async (option) => {
          const imageResponse = await fetch(`/api/crawlers?mode=resources&type=image&channel=${selectedChannel}&topic=${selectedTopic}&key=${option}`);
          const images = await imageResponse.json();
          
          resourcesByOption[option] = {
            images: images.files || [],
            videos: [] // Quiz options only need images
          };
        }));

        setCrawlerResourcesByOption(resourcesByOption);
      }
      
      setShowCrawlerDialog(true);
    } catch (error) {
      console.error('Error fetching crawler resources:', error);
      // Show error toast or notification
    }
  };

  interface CopyResponse {
    success: boolean;
    error?: string;
    targetPath: string;
    filename: string;
  }

  type ResourceType = 'image' | 'video' | 'quiz3-image';
  type ApiResourceType = 'image' | 'video';
  type ResourceTarget = 'main' | 'quiz3';
  
  const getSelectionKey = (resource: CrawlerResource, type: ResourceType, target: ResourceTarget, optionName?: string) => {
    return `${resource.path}_${type}_${target}${optionName ? `_${optionName}` : ''}`;
  };

  const SelectionButton = ({ 
    resource, 
    type, 
    target, 
    optionName 
  }: { 
    resource: CrawlerResource; 
    type: ResourceType; 
    target: ResourceTarget; 
    optionName?: string;
  }) => {
    const selectionKey = getSelectionKey(resource, type, target, optionName);
    const state = selectionState[selectionKey];

    return (
      <button
        onClick={() => handleSelectCrawlerResource(resource.path, type, target, optionName)}
        className={`relative px-3 py-1.5 rounded text-sm ${
          state?.isSelected
            ? 'bg-success hover:opacity-90'
            : state?.error
            ? 'bg-danger hover:opacity-90'
            : type === 'quiz3-image'
            ? 'bg-accent hover:bg-accent-hover'
            : 'bg-info hover:opacity-90'
        } text-white flex items-center gap-2`}
        disabled={state?.isLoading}
      >
        {state?.isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Copying...</span>
          </>
        ) : state?.isSelected ? (
          <>
            <CheckCircleIcon className="w-4 h-4" />
            <span>Selected</span>
          </>
        ) : state?.error ? (
          <>
            <XCircleIcon className="w-4 h-4" />
            <span>Try Again</span>
          </>
        ) : (
          <>
            {optionName ? `Select for ${optionName}` : 'Select'}
          </>
        )}
      </button>
    );
  };

  // Track which assets have been updated
  const [updatedAssets, setUpdatedAssets] = useState<Set<string>>(new Set());

  const handleSelectCrawlerResource = async (resourcePath: string, type: ResourceType, target: ResourceTarget, quizOption?: string) => {
    if (!selectedJsonAsset) return;
    
    try {
      // For quiz3 images, we need to determine which option position this is for
      let order = selectedJsonAsset.order;
      let category: ResourceType = type;
      let optionName: string | undefined = quizOption;
      
      if (target === 'quiz3') {
        // Get the current quiz3 options and find which one is missing
        const pair = assetGroups
          .find(group => group.key === selectedJsonAsset?.key)
          ?.assets.jsonAssetPairs
          .find(p => p.json.id === selectedJsonAsset?.id);
          
        if (pair && pair.quiz3ImageOptions) {
          const missingOptions = pair.quiz3ImageOptions.missingImages;
          setMissingQuizOptions(missingOptions);
          
          if (missingOptions.length > 0) {
            category = 'quiz3-image';
            // If no specific option is provided, show the menu
            if (!optionName) {
              setShowQuizOptionMenu(true);
              return;
            }
          }
        }
      }

      // For quiz3 images, we need to use the option name as the target filename
      const payload = {
        sourcePath: resourcePath,
        key: selectedJsonAsset.key,
        order: type === 'quiz3-image' ? undefined : order,
        type: type, // Send the actual type to the API
        target: type === 'quiz3-image' ? 'quiz3' : target,
        optionName: type === 'quiz3-image' ? quizOption : undefined,
        channel: selectedChannel,
        topic: selectedTopic
      };

      console.log('Copying resource:', payload);

      const response = await fetch('/api/crawlers/copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to copy resource');
      
      const result = await response.json() as CopyResponse;
      if (!result.success) throw new Error(result.error || 'Failed to copy resource');

      // Update just the specific asset pair
      // Mark this asset as updated
      setUpdatedAssets(prev => new Set(prev).add(selectedJsonAsset.id));

      // Scroll to the updated item
      const itemElement = document.getElementById(`json-pair-${selectedJsonAsset.id}`);
      if (itemElement) {
        itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (error) {
      console.error('Error copying crawler resource:', error);
      // Show error toast or notification
    }
  };

  // Fullscreen image viewer component
  const FullscreenViewer = () => {
    if (!fullscreenImage) return null;

    return (
      <div 
        className="fixed inset-0 bg-black z-[100] flex flex-col"
        onClick={() => setFullscreenImage(null)}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-surface-sunken">
          <h3 className="text-xl font-semibold text-text">{fullscreenImage.name}</h3>
          <button
            onClick={() => setFullscreenImage(null)}
            className="text-text-muted hover:text-text"
          >
            <XCircleIcon className="w-8 h-8" />
          </button>
        </div>

        {/* Main Image */}
        <div className="flex-1 flex items-center justify-center p-4">
          <img 
            src={fullscreenImage.url} 
            alt={fullscreenImage.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Footer with Actions */}
        <div className="bg-surface-sunken p-4">
          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCrawlerResource(fullscreenImage.path, 'image', 'main');
              }}
              className="w-full bg-info hover:opacity-90 text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              Use as Main Image
            </button>
            
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQuizOptionMenu(!showQuizOptionMenu);
                }}
                className="w-full bg-accent hover:bg-accent-hover text-accent-fg px-6 py-3 rounded-lg text-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                Use for Quiz Option
                <ChevronUpIcon className={`w-5 h-5 transition-transform ${showQuizOptionMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showQuizOptionMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface rounded-lg shadow-xl overflow-hidden">
                  {missingQuizOptions.map((option, index) => (
                    <button
                      key={index}
                                             onClick={(e) => {
                         e.stopPropagation();
                         setShowQuizOptionMenu(false);
                         handleSelectCrawlerResource(fullscreenImage.path, 'image', 'quiz3', option);
                       }}
                      className="w-full px-4 py-3 text-left hover:bg-surface transition-colors flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-accent text-accent-fg flex items-center justify-center font-medium">
                        {index + 1}
                      </div>
                      <span>Use as Quiz Option {index + 1}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text p-8">
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: var(--color-accent);
          cursor: pointer;
          border: 2px solid var(--color-surface);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: var(--color-accent);
          cursor: pointer;
          border: 2px solid var(--color-surface);
        }
        
        .slider::-ms-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: var(--color-accent);
          cursor: pointer;
          border: 2px solid var(--color-surface);
        }
      `}</style>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h1 className="text-4xl font-bold text-accent">
            Assets Management
          </h1>
          <p className="text-text-muted mt-2">Manage your SK3QLR video assets and generate content</p>
        </div>
        
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover px-4 py-2 rounded-lg transition-colors"
            onClick={() => setShowAIGenerator(true)}
          >
            <span className="text-xl">✨</span>
            <span>AI Generator</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-surface-raised text-text border border-border hover:border-border-strong px-4 py-2 rounded-lg transition-colors"
            onClick={() => setShowImageGenerationDialog(true)}
          >
            <PhotoIcon className="w-5 h-5" />
            <span>Generate Image</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-surface-raised text-text border border-border hover:border-border-strong px-4 py-2 rounded-lg transition-colors"
            onClick={() => setShowUploadDialog(true)}
          >
            <PlusIcon className="w-5 h-5" />
            <span>Upload Assets</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Overview Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 bg-surface rounded-lg border border-border"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-accent">📊 Overview Status</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Overall Completion:</span>
            <span className={`text-lg font-bold ${calculateOverviewStatus.completionRate >= 75 ? 'text-success' : calculateOverviewStatus.completionRate >= 50 ? 'text-warning' : 'text-danger'}`}>
              {calculateOverviewStatus.completionRate}%
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
          {/* Total Groups */}
          <button
            onClick={() => setStatusFilter('all')}
            className={`p-3 rounded-lg border transition-all hover:scale-105 ${
              statusFilter === 'all'
                ? 'bg-accent border-accent text-accent-fg'
                : 'bg-surface-raised border-border text-text-muted hover:bg-surface'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">📁</div>
              <div className="text-sm font-medium">Total Groups</div>
              <div className="text-lg font-bold">{calculateOverviewStatus.totalGroups}</div>
            </div>
          </button>

          {/* Complete Groups */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'complete' ? 'all' : 'complete')}
            className={`p-3 rounded-lg border transition-all hover:scale-105 ${
              statusFilter === 'complete'
                ? 'bg-success border-4 ring-2 ring-success text-white shadow-lg'
                : calculateOverviewStatus.completeGroups > 0
                ? 'bg-success-bg border border-success text-success hover:bg-surface'
                : 'bg-surface-raised border border-border text-text-muted'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">✅</div>
              <div className="text-sm font-medium">Complete</div>
              <div className="text-lg font-bold">{calculateOverviewStatus.completeGroups}</div>
            </div>
          </button>

          {/* Missing JSON */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'missing-json' ? 'all' : 'missing-json')}
            className={`p-3 rounded-lg border transition-all hover:scale-105 ${
              statusFilter === 'missing-json' 
                ? 'bg-danger border-4 ring-2 ring-danger text-white shadow-lg'
                : calculateOverviewStatus.missingJson > 0
                ? 'bg-danger-bg border border-danger text-danger hover:bg-surface'
                : 'bg-surface-raised border border-border text-text-muted'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">📄</div>
              <div className="text-sm font-medium">Missing JSON</div>
              <div className="text-lg font-bold">{calculateOverviewStatus.missingJson}</div>
            </div>
          </button>

          {/* Missing Image */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'missing-image' ? 'all' : 'missing-image')}
            className={`p-3 rounded-lg border transition-all hover:scale-105 ${
              statusFilter === 'missing-image' 
                ? 'bg-danger border-4 ring-2 ring-danger text-white shadow-lg'
                : calculateOverviewStatus.missingImage > 0
                ? 'bg-danger-bg border border-danger text-danger hover:bg-surface'
                : 'bg-surface-raised border border-border text-text-muted'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">🖼️</div>
              <div className="text-sm font-medium">Missing Image</div>
              <div className="text-lg font-bold">{calculateOverviewStatus.missingImage}</div>
            </div>
          </button>

          {/* Missing Videos */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'missing-videos' ? 'all' : 'missing-videos')}
            className={`p-3 rounded-lg border transition-all hover:scale-105 ${
              statusFilter === 'missing-videos' 
                ? 'bg-danger border-4 ring-2 ring-danger text-white shadow-lg'
                : calculateOverviewStatus.missingVideos > 0
                ? 'bg-danger-bg border border-danger text-danger hover:bg-surface'
                : 'bg-surface-raised border border-border text-text-muted'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">🎥</div>
              <div className="text-sm font-medium">Missing Videos</div>
              <div className="text-lg font-bold">{calculateOverviewStatus.missingVideos}</div>
            </div>
          </button>

          {/* Missing Voices */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'missing-voices' ? 'all' : 'missing-voices')}
            className={`p-3 rounded-lg border transition-all hover:scale-105 ${
              statusFilter === 'missing-voices'
                ? 'bg-warning border-4 ring-2 ring-warning text-white shadow-lg'
                : calculateOverviewStatus.missingVoices > 0
                ? 'bg-warning-bg border border-warning text-warning hover:bg-surface'
                : 'bg-surface-raised border border-border text-text-muted'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">🎵</div>
              <div className="text-sm font-medium">Missing Voices</div>
              <div className="text-lg font-bold">{calculateOverviewStatus.missingVoices}</div>
            </div>
          </button>

          {/* Missing Rewards */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'missing-rewards' ? 'all' : 'missing-rewards')}
            className={`p-3 rounded-lg border transition-all hover:scale-105 ${
              statusFilter === 'missing-rewards'
                ? 'bg-warning border-4 ring-2 ring-warning text-white shadow-lg'
                : calculateOverviewStatus.missingRewards > 0
                ? 'bg-warning-bg border border-warning text-warning hover:bg-surface'
                : 'bg-surface-raised border border-border text-text-muted'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-sm font-medium">Missing Rewards</div>
              <div className="text-lg font-bold">{calculateOverviewStatus.missingRewards}</div>
            </div>
          </button>

          {/* Missing Quiz 3 Images */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'missing-quiz3-images' ? 'all' : 'missing-quiz3-images')}
            className={`p-3 rounded-lg border transition-all hover:scale-105 ${
              statusFilter === 'missing-quiz3-images'
                ? 'bg-info border-4 ring-2 ring-info text-white shadow-lg'
                : calculateOverviewStatus.missingQuiz3Images > 0
                ? 'bg-info-bg border border-info text-info hover:bg-surface'
                : 'bg-surface-raised border border-border text-text-muted'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">🖼️</div>
              <div className="text-sm font-medium">Missing Quiz 3 Images</div>
              <div className="text-lg font-bold">{calculateOverviewStatus.missingQuiz3Images}</div>
            </div>
          </button>

          {/* Incomplete Groups */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'incomplete' ? 'all' : 'incomplete')}
            className={`p-3 rounded-lg border transition-all hover:scale-105 ${
              statusFilter === 'incomplete'
                ? 'bg-danger border-4 ring-2 ring-danger text-white shadow-lg'
                : calculateOverviewStatus.incompleteGroups > 0
                ? 'bg-danger-bg border border-danger text-danger hover:bg-surface'
                : 'bg-surface-raised border border-border text-text-muted'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">⚠️</div>
              <div className="text-sm font-medium">Incomplete</div>
              <div className="text-lg font-bold">{calculateOverviewStatus.incompleteGroups}</div>
            </div>
          </button>
        </div>


      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 mb-6"
      >
        {/* Search Bar */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface rounded-lg border border-border focus:border-accent focus:outline-none"
            />
          </div>
          
          <div className="flex gap-2">
            {selectedAssets.length > 0 && (
              <>
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-danger text-white hover:opacity-90 rounded-lg transition-colors"
                >
                  Delete ({selectedAssets.length})
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-4 py-2 bg-surface-raised hover:bg-surface rounded-lg transition-colors"
                >
                  Deselect All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-muted">Channel:</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="bg-surface text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none text-sm"
            >
              {channelOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-muted">Topic:</span>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="bg-surface text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none text-sm"
            >
              {topicOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-muted">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'createDate')}
              className="bg-surface text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none text-sm"
            >
              <option value="createDate">Creation Date</option>
              <option value="name">Name</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-muted">Order:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="bg-surface text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none text-sm"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span>📁</span>
            <span>{selectedChannel}/{selectedTopic}</span>
          </div>

          {/* Sort indicator */}
          <div className="flex items-center gap-2 text-sm text-accent bg-accent-muted bg-opacity-20 px-3 py-1 rounded-lg">
            <span>🔄</span>
            <span>
              {sortBy === 'createDate' ? 'Date' : 'Name'} 
              ({sortOrder === 'asc' ? 'A→Z' : 'Z→A'})
            </span>
          </div>
        </div>
      </motion.div>

      {/* Assets Display */}
      <motion.div layout className="space-y-6">
        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-text-muted">
          <div>
            Showing {paginatedAssetGroups.length} of {filteredAssetGroups.length} groups
            {statusFilter !== 'all' && (
              <span className="ml-2 text-accent">
                (filtered by {statusFilter.replace('-', ' ')})
              </span>
            )}
          </div>
          <div>
            Page {currentPage} of {Math.ceil(filteredAssetGroups.length / itemsPerPage)}
          </div>
        </div>

        {searching && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-text-muted">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>
              <span>Searching...</span>
            </div>
          </div>
        )}
          {paginatedAssetGroups.map((group) => {
            const renderStatus = getRenderStatusDisplay(group.renderStatus);
            const originalRenderStatus = group.renderStatus;
            return (
              <motion.div
                key={`${group.key}-${sortBy}-${sortOrder}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-bold text-accent">{group.name}</h3>
                    <div className="flex gap-2 text-sm text-text-muted">
                      <span>📄 {group.assets.jsonAssetPairs.length} JSON-Asset Pairs</span>
                      <span>🏆 {group.assets.rewards.length} Rewards</span>
                      <span className="text-info">
                        📅 {formatDate(getEarliestJsonDate(group))}
                      </span>
                    </div>
                  </div>
                  
                  {/* Render Status Badge */}
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      renderStatus.isComplete 
                        ? 'bg-success-bg text-success border border-success' 
                        : 'bg-surface-raised text-text-muted border border-border'
                    }`}>
                      {renderStatus.isComplete ? '✅ Ready to Render' : `${renderStatus.completionRate}% Complete`}
                    </div>
                  </div>
                </div>
                
                {/* Render Status Details */}
                <div className="mb-4 p-3 bg-surface-raised rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-muted">Render Status:</span>
                    <span className={`text-sm font-bold ${renderStatus.statusColor}`}>
                      {renderStatus.completionRate}% Complete
                    </span>
                  </div>
                  
                  {/* JSON Requirements */}
                  {renderStatus.jsonCount > 0 && (
                    <div className="mb-3 p-2 bg-surface rounded">
                      <div className="text-xs font-medium text-accent mb-1">
                        📄 JSON Files: {renderStatus.jsonCount} found
                      </div>
                      <div className="text-xs text-text-muted">
                        Orders: {originalRenderStatus.jsonOrders.sort((a: number, b: number) => a - b).join(', ')}
                      </div>
                    </div>
                  )}
                  
                  {/* Image Requirements */}
                  <div className="mb-3 p-2 bg-surface rounded">
                    <div className="text-xs font-medium text-info mb-1">
                      🖼️ Images: {renderStatus.imageProgress}
                    </div>
                    <div className="w-full bg-surface-raised rounded-full h-2 mb-1">
                      <div 
                        className={`h-2 rounded-full ${
                          originalRenderStatus.availableImages >= originalRenderStatus.requiredImages 
                            ? 'bg-success' 
                            : 'bg-danger'
                        }`}
                        style={{ 
                          width: `${Math.min(100, (originalRenderStatus.availableImages / originalRenderStatus.requiredImages) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-text-muted">
                      Required: {originalRenderStatus.requiredImages} images (1 per JSON with matching order)
                      {renderStatus.missingImageOrders.length > 0 && (
                        <span className="text-danger ml-2">Missing orders: {renderStatus.missingImageOrders.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Video Requirements */}
                  <div className="mb-3 p-2 bg-surface rounded">
                    <div className="text-xs font-medium text-info mb-1">
                      🎥 Videos: {renderStatus.videoProgress}
                    </div>
                    <div className="w-full bg-surface-raised rounded-full h-2 mb-1">
                      <div 
                        className={`h-2 rounded-full ${
                          originalRenderStatus.availableVideos >= originalRenderStatus.requiredVideos 
                            ? 'bg-success' 
                            : 'bg-danger'
                        }`}
                        style={{ 
                          width: `${Math.min(100, (originalRenderStatus.availableVideos / originalRenderStatus.requiredVideos) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-text-muted">
                      Required: {originalRenderStatus.requiredVideos} videos (1 per JSON with matching order)
                      {renderStatus.missingVideoOrders.length > 0 && (
                        <span className="text-danger ml-2">Missing orders: {renderStatus.missingVideoOrders.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Voice Requirements */}
                  <div className="mb-3 p-2 bg-surface rounded">
                    <div className="text-xs font-medium text-warning mb-1">
                      🎵 Voice Files: {renderStatus.voiceProgress}
                    </div>
                    <div className="w-full bg-surface-raised rounded-full h-2 mb-1">
                      <div 
                        className={`h-2 rounded-full ${
                          originalRenderStatus.availableVoices >= originalRenderStatus.requiredVoices 
                            ? 'bg-success' 
                            : 'bg-warning'
                        }`}
                        style={{ 
                          width: `${Math.min(100, (originalRenderStatus.availableVoices / originalRenderStatus.requiredVoices) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-text-muted">
                      Required: {originalRenderStatus.requiredVoices} voices ({renderStatus.jsonCount} JSONs × 9 voices each)
                      {renderStatus.missingVoices > 0 && (
                        <span className="text-danger ml-2">Missing: {renderStatus.missingVoices}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Reward Requirements */}
                  <div className="mb-3 p-2 bg-surface rounded">
                    <div className="text-xs font-medium text-warning mb-1">
                      🏆 Reward Videos: {renderStatus.rewardProgress}
                    </div>
                    <div className="w-full bg-surface-raised rounded-full h-2 mb-1">
                      <div 
                        className={`h-2 rounded-full ${
                          originalRenderStatus.availableRewards >= originalRenderStatus.requiredRewards 
                            ? 'bg-success' 
                            : 'bg-warning'
                        }`}
                        style={{ 
                          width: `${Math.min(100, (originalRenderStatus.availableRewards / originalRenderStatus.requiredRewards) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-text-muted">
                      Required: {originalRenderStatus.requiredRewards} rewards (1 per JSON)
                      {renderStatus.missingRewards > 0 && (
                        <span className="text-danger ml-2">Missing: {renderStatus.missingRewards}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Quiz 3 Image Options Requirements */}
                  <div className="mb-3 p-2 bg-surface rounded">
                    <div className="text-xs font-medium text-accent mb-1">
                      🖼️ Quiz 3 Image Options: {renderStatus.quiz3ImageProgress}
                    </div>
                    <div className="w-full bg-surface-raised rounded-full h-2 mb-1">
                      <div 
                        className={`h-2 rounded-full ${
                          originalRenderStatus.availableQuiz3Images >= originalRenderStatus.requiredQuiz3Images 
                            ? 'bg-success' 
                            : 'bg-accent'
                        }`}
                        style={{ 
                          width: `${Math.min(100, (originalRenderStatus.availableQuiz3Images / originalRenderStatus.requiredQuiz3Images) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-text-muted">
                      Required: {originalRenderStatus.requiredQuiz3Images} images ({renderStatus.jsonCount} JSONs × 4 images each)
                      {renderStatus.missingQuiz3Images > 0 && (
                        <span className="text-danger ml-2">Missing: {renderStatus.missingQuiz3Images}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Asset Status Tags */}
                  <div className="flex flex-wrap gap-2">
                    {renderStatus.statuses.map((status, index) => (
                      <span key={index} className="text-xs bg-surface-raised text-text-muted px-2 py-1 rounded">
                        {status}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                  
                  {/* JSONs with Voice and Reward Status */}
                  {group.assets.jsonAssetPairs.map((pair, index) => (
                    <div 
                      key={`${pair.json.id}-${index}`}
                      id={`json-pair-${pair.json.id}`}
                      className="bg-surface-raised rounded-lg p-6 border border-border"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-4xl">📄</span>
                        <div className="flex-1">
                          <span className="text-lg font-semibold text-success">JSON {pair.json.order || index + 1}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pair.hasAllVoices 
                                ? 'bg-success-bg text-success border border-success' 
                                : 'bg-warning-bg text-warning border border-warning'
                            }`}>
                              {pair.hasAllVoices ? '✅ All Voices' : `🎵 ${pair.voices.length}/9 Voices`}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pair.hasReward 
                                ? 'bg-success-bg text-success border border-success' 
                                : 'bg-warning-bg text-warning border border-warning'
                            }`}>
                              {pair.hasReward ? '🏆 Has Reward' : '🏆 No Reward'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pair.quiz3ImageOptions.options.length === 0
                                ? 'bg-surface-sunken text-text-muted border border-border'
                                : pair.quiz3ImageOptions.hasAllImages 
                                  ? 'bg-success-bg text-success border border-success' 
                                  : 'bg-danger-bg text-danger border border-danger'
                            }`}>
                              {pair.quiz3ImageOptions.options.length === 0 
                                ? '🖼️ No Options'
                                : pair.quiz3ImageOptions.hasAllImages 
                                  ? '🖼️ All Images' 
                                  : `🖼️ ${pair.quiz3ImageOptions.availableImages.length}/${pair.quiz3ImageOptions.options.length} Images`
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-base text-text-muted truncate mb-3 font-medium">{pair.json.name}</p>
                      <p className="text-base text-text-muted mb-4">{formatFileSize(pair.json.size || 0)}</p>
                      
                      {/* Voice Status Details */}
                      <div className="mb-4 p-3 bg-surface rounded-lg">
                        <div className="text-sm font-medium text-text-muted mb-2">Voice Files:</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.intro ? 'text-success' : 'text-danger'}`}>
                            <span>{pair.voiceTypes.intro ? '✅' : '❌'}</span>
                            <span>Intro</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz1_question ? 'text-success' : 'text-danger'}`}>
                            <span>{pair.voiceTypes.quiz1_question ? '✅' : '❌'}</span>
                            <span>Quiz 1 Q</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz1_answer ? 'text-success' : 'text-danger'}`}>
                            <span>{pair.voiceTypes.quiz1_answer ? '✅' : '❌'}</span>
                            <span>Quiz 1 A</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz2_question ? 'text-success' : 'text-danger'}`}>
                            <span>{pair.voiceTypes.quiz2_question ? '✅' : '❌'}</span>
                            <span>Quiz 2 Q</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz2_answer ? 'text-success' : 'text-danger'}`}>
                            <span>{pair.voiceTypes.quiz2_answer ? '✅' : '❌'}</span>
                            <span>Quiz 2 A</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz3_question ? 'text-success' : 'text-danger'}`}>
                            <span>{pair.voiceTypes.quiz3_question ? '✅' : '❌'}</span>
                            <span>Quiz 3 Q</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz3_answer ? 'text-success' : 'text-danger'}`}>
                            <span>{pair.voiceTypes.quiz3_answer ? '✅' : '❌'}</span>
                            <span>Quiz 3 A</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.lesson ? 'text-success' : 'text-danger'}`}>
                            <span>{pair.voiceTypes.lesson ? '✅' : '❌'}</span>
                            <span>Lesson</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.reward ? 'text-success' : 'text-danger'}`}>
                            <span>{pair.voiceTypes.reward ? '✅' : '❌'}</span>
                            <span>Reward</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Reward Status */}
                      <div className="mb-4 p-3 bg-surface rounded-lg">
                        <div className="text-sm font-medium text-text-muted mb-2">Reward Video:</div>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${pair.hasReward ? 'text-success' : 'text-danger'}`}>
                            {pair.hasReward ? '✅' : '❌'}
                          </span>
                          <span className="text-sm text-text-muted">
                            {pair.hasReward 
                              ? `Reward video available (${pair.reward?.name || 'Unknown'})`
                              : 'No reward video found'
                            }
                          </span>
                        </div>
                      </div>
                      
                      {/* Quiz 3 Image Options Status */}
                      <div className="mb-4 p-3 bg-surface rounded-lg">
                        <div className="text-sm font-medium text-text-muted mb-2">Quiz 3 Image Options:</div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-lg ${pair.quiz3ImageOptions.hasAllImages ? 'text-success' : 'text-danger'}`}>
                            {pair.quiz3ImageOptions.hasAllImages ? '✅' : '❌'}
                          </span>
                          <span className="text-sm text-text-muted">
                            {pair.quiz3ImageOptions.options.length === 0 
                              ? 'No quiz 3 options found'
                              : pair.quiz3ImageOptions.hasAllImages 
                                ? `${pair.quiz3ImageOptions.availableImages.length}/${pair.quiz3ImageOptions.options.length} Images Available`
                                : `${pair.quiz3ImageOptions.availableImages.length}/${pair.quiz3ImageOptions.options.length} Images Available`
                            }
                          </span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="w-full bg-surface-raised rounded-full h-2 mb-2">
                          <div 
                            className={`h-2 rounded-full ${
                              pair.quiz3ImageOptions.hasAllImages 
                                ? 'bg-success' 
                                : 'bg-danger'
                            }`}
                            style={{ 
                              width: `${pair.quiz3ImageOptions.completionRate}%` 
                            }}
                          ></div>
                        </div>
                        
                        {/* Options list */}
                        <div className="text-xs text-text-muted mb-2">
                          {pair.quiz3ImageOptions.options.length === 0 
                            ? 'No quiz 3 options found in JSON'
                            : `Required: ${pair.quiz3ImageOptions.options.length} images for quiz 3 options`
                          }
                          {pair.quiz3ImageOptions.missingImages.length > 0 && (
                            <span className="text-danger ml-2">Missing: {pair.quiz3ImageOptions.missingImages.join(', ')}</span>
                          )}
                        </div>
                        
                        {/* Individual option status */}
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {pair.quiz3ImageOptions.options.map((option, idx) => {
                            const isAvailable = pair.quiz3ImageOptions.availableImages.includes(option);
                            const matchingImage = group.assets.images.find(img => 
                              img.type === 'image' && 
                              img.path.includes('options') && 
                              img.name.replace(/\.(jpg|jpeg|png|gif|bmp)$/i, '').toLowerCase() === option.toLowerCase()
                            );
                            
                            return (
                              <div 
                                key={idx}
                                className={`flex items-center justify-between ${
                                  isAvailable 
                                    ? 'text-success' 
                                    : 'text-danger'
                                }`}
                              >
                                <div className="flex items-center gap-1">
                                  <span>
                                    {isAvailable ? '✅' : '❌'}
                                  </span>
                                  <span className="truncate">{option}</span>
                                </div>
                                {isAvailable && matchingImage && (
                                  <button
                                    onClick={() => handleEditImage(matchingImage, 'quiz3')}
                                    className="flex items-center gap-1 text-xs text-info hover:text-info bg-info-bg/30 hover:bg-surface/50 rounded px-1 py-0.5 transition-colors"
                                  >
                                    <PencilIcon className="w-2 h-2" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Generate missing images button */}
                        {pair.quiz3ImageOptions.missingImages.length > 0 && (
                          <button
                            onClick={() => showProviderSelectionForMissingImages(pair)}
                            disabled={imageGeneratingStates[`${pair.json.key}_${pair.json.order}`]}
                            className="w-full mt-2 text-sm text-white bg-info hover:opacity-90 disabled:bg-surface-raised disabled:text-text-muted rounded-lg px-3 py-2 text-center transition-colors"
                          >
                            {imageGeneratingStates[`${pair.json.key}_${pair.json.order}`] ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                Generating {pair.quiz3ImageOptions.missingImages.length} missing images...
                              </div>
                            ) : (
                              `Generate Missing Images (${pair.quiz3ImageOptions.missingImages.length})`
                            )}
                          </button>
                        )}
                      </div>
                      
                      {/* Image Status */}
                      <div className="mb-4 p-3 bg-surface rounded-lg">
                        <div className="text-sm font-medium text-text-muted mb-2">Main Image:</div>
                        {(() => {
                          const matchingImage = group.assets.images.find(img => img.order === pair.json.order);
                          return matchingImage ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-lg text-success">✅</span>
                                <span className="text-sm text-text-muted">
                                  Image available ({matchingImage.name})
                                </span>
                              </div>
                              <button
                                onClick={() => handleEditImage(matchingImage, 'main')}
                                className="flex items-center gap-1 text-xs text-info hover:text-info bg-info-bg/30 hover:bg-surface/50 rounded px-2 py-1 transition-colors"
                              >
                                <PencilIcon className="w-3 h-3" />
                                Edit
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg text-danger">❌</span>
                                <span className="text-sm text-text-muted">
                                  No image found for order {pair.json.order}
                                </span>
                              </div>
                              <button
                                onClick={() => showProviderSelectionForMainImage(pair.json)}
                                disabled={imageGeneratingStates[`${pair.json.key}_${pair.json.order}`]}
                                className="text-sm text-white bg-info hover:opacity-90 disabled:bg-surface-raised disabled:text-text-muted rounded px-3 py-1 transition-colors"
                              >
                                {imageGeneratingStates[`${pair.json.key}_${pair.json.order}`] ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                    Generating...
                                  </div>
                                ) : (
                                  'Generate Image'
                                )}
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* Video Status */}
                      <div className="mb-4 p-3 bg-surface rounded-lg">
                        <div className="text-sm font-medium text-text-muted mb-2">Main Video:</div>
                        {(() => {
                          const matchingVideo = group.assets.videos.find(vid => vid.order === pair.json.order);
                          return matchingVideo ? (
                            <div className="flex items-center gap-2">
                              <span className="text-lg text-success">✅</span>
                              <span className="text-sm text-text-muted">
                                Video available ({matchingVideo.name})
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-lg text-danger">❌</span>
                              <span className="text-sm text-text-muted">
                                No video found for order {pair.json.order}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePreviewAsset(pair.json)}
                          className="flex-1 text-base text-text-muted bg-surface rounded-lg px-4 py-2 text-center hover:bg-surface transition-colors"
                        >
                          View JSON
                        </button>
                        <button
                          onClick={() => handlePreviewAsset(pair.json, true)}
                          className="flex-1 text-base text-accent bg-accent-muted rounded-lg px-4 py-2 text-center hover:bg-accent-hover transition-colors"
                        >
                          🎬 Preview Video
                        </button>
                        {!pair.hasAllVoices && (
                          <button
                            onClick={() => handleGenerateVoice(pair.json)}
                            disabled={voiceGeneratingStates[`${pair.json.key}_${pair.json.order}`]}
                            className="flex-1 text-base text-white bg-warning hover:opacity-90 disabled:bg-surface-raised disabled:text-text-muted rounded-lg px-4 py-2 text-center transition-colors"
                          >
                            {voiceGeneratingStates[`${pair.json.key}_${pair.json.order}`] ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Generating...
                              </div>
                            ) : (
                              'Generate Voice'
                            )}
                          </button>
                        )}
                                                  <button
                          onClick={() => handleFetchCrawlerResources(pair.json)}
                          className="flex-1 text-base text-white bg-info hover:opacity-90 rounded-lg px-4 py-2 text-center transition-colors"
                        >
                          🖼️ Use Crawled Media
                        </button>
                        {!pair.hasReward && (
                          <button
                            onClick={() => handleGenerateReward(pair.json)}
                            className="flex-1 text-base text-white bg-warning hover:opacity-90 rounded-lg px-4 py-2 text-center transition-colors"
                          >
                            Generate Reward
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Rewards */}
                  {group.assets.rewards.map((reward, index) => (
                    <div 
                      key={`${reward.id}-${index}`} 
                      className="bg-surface-raised rounded-lg p-6 cursor-pointer hover:bg-surface transition-colors border border-border hover:border-accent"
                      onClick={() => handlePreviewAsset(reward)}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-4xl">🏆</span>
                        <span className="text-lg font-semibold text-warning">Reward {index + 1}</span>
                      </div>
                      <p className="text-base text-text-muted truncate mb-3 font-medium">{reward.name}</p>
                      <p className="text-base text-text-muted mb-4">{formatFileSize(reward.size || 0)}</p>
                      <div className="text-base text-text-muted bg-surface rounded-lg px-4 py-2 text-center hover:bg-surface transition-colors">Click to play</div>
                    </div>
                  ))}
                </div>
                
                {/* Orphaned Voice files summary (voices not associated with any JSON) */}
                {(() => {
                  const orphanedVoices = group.assets.voices.filter(voice => {
                    // Check if this voice belongs to any JSON file
                    return !group.assets.jsonAssetPairs.some(pair => 
                      pair.voices.some(v => v.id === voice.id)
                    );
                  });
                  
                  return orphanedVoices.length > 0 ? (
                    <div className="mt-6 bg-surface-raised rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">🎵</span>
                          <span className="text-xl font-semibold text-warning">Orphaned Voice Files ({orphanedVoices.length})</span>
                        </div>
                        <button
                          onClick={() => {
                            setPreviewAsset(orphanedVoices[0]);
                            setShowPreview(true);
                          }}
                          className="text-sm bg-warning text-white hover:opacity-90 px-4 py-2 rounded-lg transition-colors"
                        >
                          Preview Sample
                        </button>
                      </div>
                      <div className="text-base text-text-muted mb-3">
                        {orphanedVoices.length} voice files not associated with any JSON file
                      </div>
                      <div className="text-sm text-text-muted mb-4">
                        These voices may need to be manually organized or deleted
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {orphanedVoices.slice(0, 12).map((voice, index) => (
                          <div 
                            key={`${voice.id}-${index}`} 
                            className="text-sm text-text-muted truncate cursor-pointer hover:text-warning transition-colors p-2 bg-surface rounded hover:bg-surface"
                            onClick={() => handlePreviewAsset(voice)}
                            title={voice.name}
                          >
                            {voice.name}
                          </div>
                        ))}
                        {orphanedVoices.length > 12 && (
                          <div className="text-sm text-text-muted p-2 bg-surface rounded">
                            +{orphanedVoices.length - 12} more...
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null;
                })()}
              </motion.div>
            );
          })}
        </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center items-center gap-2 mt-8"
        >
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-surface-raised hover:bg-surface disabled:bg-surface disabled:text-text-muted rounded-lg transition-colors"
          >
            ← Previous
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-accent text-accent-fg'
                      : 'bg-surface-raised hover:bg-surface text-text-muted'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-surface-raised hover:bg-surface disabled:bg-surface disabled:text-text-muted rounded-lg transition-colors"
          >
            Next →
          </button>
          
          <span className="text-sm text-text-muted ml-4">
            Page {currentPage} of {totalPages} ({filteredAssetGroups.length} total)
          </span>
        </motion.div>
      )}



      {/* AI Generator Dialog */}
      <AnimatePresence>
        {showAIGenerator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">AI Content Generator</h2>
                <button
                  onClick={() => setShowAIGenerator(false)}
                  className="text-text-muted hover:text-text"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="space-y-4">
                  {/* Generation Mode Tabs */}
                  <div className="flex bg-surface-raised rounded-lg p-1">
                    <button
                      onClick={() => {
                        setAiPrompt("");
                        setSubjectsList("");
                        setBatchSize(1);
                        setIsBatchMode(false);
                      }}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        !isBatchMode ? 'bg-accent text-accent-fg' : 'text-text-muted hover:text-text'
                      }`}
                    >
                      Single Subject
                    </button>
                    <button
                      onClick={() => {
                        setAiPrompt("");
                        setSubjectsList("");
                        setBatchSize(1);
                        setIsBatchMode(true);
                      }}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        isBatchMode ? 'bg-accent text-accent-fg' : 'text-text-muted hover:text-text'
                      }`}
                    >
                      Batch Generation
                    </button>
                  </div>

                  {/* Single Subject Mode */}
                  {!isBatchMode && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-2">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={aiPrompt}
                          onChange={(e) => handleSubjectChange(e.target.value)}
                          placeholder="e.g., capybara, lion, tiger"
                          className="w-full bg-surface-raised text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none"
                        />
                        {existingOrders.length > 0 && (
                          <p className="text-sm text-info mt-1">
                            ℹ️ Existing orders: {existingOrders.join(', ')} → Next: {Math.max(...existingOrders) + 1}
                          </p>
                        )}
                      </div>
                      
                      <button
                        onClick={generateAIContent}
                        disabled={aiGenerating || !aiPrompt.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover disabled:bg-surface-raised px-4 py-2 rounded-lg transition-colors"
                      >
                        {aiGenerating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <span className="text-xl">✨</span>
                            Generate Content
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Batch Generation Mode */}
                  {isBatchMode && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-2">
                          Subjects List (one per line, comma, or semicolon)
                        </label>
                        <textarea
                          value={subjectsList}
                          onChange={(e) => setSubjectsList(e.target.value)}
                          placeholder="capybara&#10;lion&#10;tiger&#10;elephant"
                          rows={4}
                          className="w-full bg-surface-raised text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none resize-none"
                        />
                        {(() => {
                          const subjects = parseSubjectsList(subjectsList);
                          const existingOrdersMap = getExistingOrdersForSubjects(subjects);
                          return subjects.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              <p className="text-sm text-info">
                                📋 {subjects.length} subjects detected
                              </p>
                              {subjects.slice(0, 3).map((subject, index) => {
                                const normalizedSubject = subject.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                                const orders = existingOrdersMap[normalizedSubject] || [];
                                return (
                                  <p key={index} className="text-xs text-text-muted">
                                    • {subject}: {orders.length > 0 ? `Orders ${orders.join(', ')}` : 'No existing orders'}
                                  </p>
                                );
                              })}
                              {subjects.length > 3 && (
                                <p className="text-xs text-text-muted">
                                  ... and {subjects.length - 3} more subjects
                                </p>
                              )}
                            </div>
                          ) : null;
                        })()}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-2">
                          Content per Subject
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={batchSize}
                          onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-surface-raised text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none"
                        />
                        <p className="text-xs text-text-muted mt-1">
                          Will generate {batchSize} content item(s) for each subject
                        </p>
                      </div>

                      {batchGenerating && batchProgress && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-text-muted mb-1">
                            <span>Progress: {batchProgress.current}/{batchProgress.total}</span>
                            <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                          </div>
                          <div className="w-full bg-surface-raised rounded-full h-2">
                            <div 
                              className="bg-accent h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-text-muted mt-1">
                            Currently generating: {batchProgress.subject}
                          </p>
                        </div>
                      )}
                      
                      <button
                        onClick={generateBatchAIContent}
                        disabled={batchGenerating || parseSubjectsList(subjectsList).length === 0}
                        className="w-full flex items-center justify-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover disabled:bg-surface-raised px-4 py-2 rounded-lg transition-colors"
                      >
                        {batchGenerating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl">✨</span>
                            Generate {parseSubjectsList(subjectsList).length * batchSize} Items
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Common Settings */}
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">
                      Description
                    </label>
                    <textarea
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      placeholder="Provide more details about the subject for better content generation..."
                      rows={3}
                      className="w-full bg-surface-raised text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none resize-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-2">
                        Language
                      </label>
                      <select
                        value={aiLanguage}
                        onChange={(e) => setAiLanguage(e.target.value)}
                        className="w-full bg-surface-raised text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none"
                      >
                        <option value="vietnamese">Vietnamese</option>
                        <option value="english">English</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-2">
                        AI Provider
                      </label>
                      <select
                        value={aiProvider}
                        onChange={(e) => setAiProvider(e.target.value)}
                        className="w-full bg-surface-raised text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none"
                      >
                        <option value="grok">Grok (xAI)</option>
                        <option value="openai">OpenAI (GPT-4)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="text-sm text-text-muted bg-surface-raised rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-accent">📁</span>
                      <span>Target: {selectedChannel}/{selectedTopic}</span>
                    </div>
                    <div className="text-xs text-text-muted">
                      Content will be generated for the current channel and topic selection.
                    </div>
                  </div>
                </div>
                
                {/* Preview Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Generated Content Preview</h3>
                    {previewItems.length > 0 && (
                      <button
                        onClick={clearAllPreviews}
                        className="text-sm text-danger hover:text-danger"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  
                  {previewItems.length === 0 ? (
                    <div className="bg-surface-raised rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
                      <div className="text-center text-text-muted py-8">
                        <div className="text-4xl mb-2">📝</div>
                        <p>No preview items yet</p>
                        <p className="text-sm">Generate content to see previews here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {/* Group preview items by subject */}
                      {(() => {
                        const groupedItems = previewItems.reduce((groups, item) => {
                          const subject = item.key;
                          if (!groups[subject]) {
                            groups[subject] = [];
                          }
                          groups[subject].push(item);
                          return groups;
                        }, {} as { [key: string]: SK3QLRContent[] });

                        return Object.entries(groupedItems).map(([subject, items]) => (
                          <div key={subject} className="bg-surface-raised rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-accent text-lg">
                                📁 {subject} ({items.length} items)
                              </h4>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    // Remove all items for this subject
                                    setPreviewItems(prev => prev.filter(item => item.key !== subject));
                                  }}
                                  className="text-danger hover:text-danger text-sm"
                                >
                                  Remove All
                                </button>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              {items.sort((a, b) => (a.order || 0) - (b.order || 0)).map((item, index) => (
                                <div key={item.id} className="bg-surface rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium text-info text-sm">
                                      Order {item.order}
                                    </h5>
                                    <button
                                      onClick={() => removePreviewItem(previewItems.findIndex(p => p.id === item.id))}
                                      className="text-danger hover:text-danger text-xs"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  
                                  <div className="space-y-2 text-xs">
                                    <div>
                                      <span className="text-text-muted">Intro:</span>
                                      <p className="text-text-muted truncate">{item.intro.text}</p>
                                    </div>
                                    <div>
                                      <span className="text-text-muted">Quiz 1:</span>
                                      <p className="text-text-muted truncate">{item.quiz_1.question.text}</p>
                                    </div>
                                    <div>
                                      <span className="text-text-muted">Quiz 2:</span>
                                      <p className="text-text-muted truncate">{item.quiz_2.question.text}</p>
                                    </div>
                                    <div>
                                      <span className="text-text-muted">Quiz 3:</span>
                                      <p className="text-text-muted truncate">{item.quiz_3.question.text}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                  
                  <button
                    onClick={approveGeneratedContent}
                    disabled={previewItems.length === 0}
                    className="w-full bg-success text-white hover:opacity-90 disabled:bg-surface-raised px-4 py-2 rounded-lg transition-colors"
                  >
                    Approve & Create {previewItems.length} Render File{previewItems.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asset Preview Modal */}
      <AnimatePresence>
        {showPreview && previewAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={handleClosePreview}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-lg p-6 w-full max-w-6xl max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-bold text-text">{previewAsset.name}</h3>
                  <p className="text-sm text-text-muted">
                    {previewAsset.type.toUpperCase()} • {formatFileSize(previewAsset.size || 0)}
                  </p>
                </div>
                <button
                  onClick={handleClosePreview}
                  className="text-text-muted hover:text-text"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="mb-4">
                {getAssetPreviewContent(previewAsset)}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Download functionality
                    const link = document.createElement('a');
                    link.href = `/api/assets/preview?path=${encodeURIComponent(previewAsset.path)}`;
                    link.download = previewAsset.name;
                    link.click();
                  }}
                  className="px-4 py-2 bg-info text-white hover:opacity-90 rounded transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete "${previewAsset.name}"?`)) {
                      try {
                        const response = await fetch('/api/assets', {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ 
                            assetIds: [previewAsset.id],
                            paths: [previewAsset.path]
                          }),
                        });

                        if (!response.ok) {
                          throw new Error('Failed to delete asset');
                        }

                        // Close the preview and refresh assets
                        handleClosePreview();
                        fetchAssets();
                        alert('Asset deleted successfully!');
                      } catch (error) {
                        console.error('Error deleting asset:', error);
                        alert('Failed to delete asset. Please try again.');
                      }
                    }
                  }}
                  className="px-4 py-2 bg-danger text-white hover:opacity-90 rounded transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={handleClosePreview}
                  className="px-4 py-2 bg-surface-raised hover:bg-surface rounded transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Dialog */}
      <AnimatePresence>
        {showSuccessDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-lg p-6 w-full max-w-md"
            >
              <div className="text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-success mb-2">Success!</h3>
                <p className="text-text-muted mb-6">{successMessage}</p>
                <button
                  onClick={() => setShowSuccessDialog(false)}
                  className="w-full bg-accent text-accent-fg hover:bg-accent-hover px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Assets Dialog */}
      <AnimatePresence>
        {showUploadDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-text">📤 Upload Missing Assets</h2>
                  <p className="text-sm text-text-muted mt-1">
                    {baseMissingResources.length} groups with missing assets • {baseMissingResources.reduce((sum, group) => sum + group.missingResources.reduce((s, r) => s + r.count, 0), 0)} total items to upload
                  </p>
                </div>
                <button
                  onClick={() => setShowUploadDialog(false)}
                  className="text-text-muted hover:text-text transition-colors"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Quick Stats */}
              <div className="mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { type: 'image', icon: '🖼️', label: 'Images', color: 'bg-danger' },
                    { type: 'video', icon: '🎥', label: 'Videos', color: 'bg-danger' },
                    { type: 'quiz3-image', icon: '🖼️', label: 'Quiz 3 Images', color: 'bg-info' },
                    { type: 'reward', icon: '🏆', label: 'Rewards', color: 'bg-warning' }
                  ].map(({ type, icon, label, color }) => {
                    const count = baseMissingResources.reduce((sum, group) => 
                      sum + group.missingResources.filter(r => r.type === type).reduce((s, r) => s + r.count, 0), 0
                    );
                    return (
                      <div key={type} className={`${color} rounded-lg p-3 text-white`}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{icon}</span>
                          <div>
                            <div className="text-sm font-medium">{label}</div>
                            <div className="text-lg font-bold">{count}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filter and Sort Controls */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Simple Group Selection */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-text-muted">Group:</label>
                    <select
                      value={uploadSearchQuery}
                      onChange={(e) => setUploadSearchQuery(e.target.value)}
                      className="px-3 py-1 bg-surface-raised border border-border rounded text-sm text-text focus:outline-none focus:ring-2 focus:ring-info"
                    >
                      <option value="">All Groups</option>
                      {baseMissingResources.map(group => (
                        <option key={group.key} value={group.name.toLowerCase()}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Resource Type Filter */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-text-muted">Filter:</label>
                    <select
                      value={uploadResourceFilter}
                      onChange={(e) => setUploadResourceFilter(e.target.value as any)}
                      className="px-3 py-1 bg-surface-raised border border-border rounded text-sm text-text focus:outline-none focus:ring-2 focus:ring-info"
                    >
                      <option value="all">All Resources</option>
                      <option value="image">🖼️ Images</option>
                      <option value="video">🎥 Videos</option>
                      <option value="quiz3-image">🖼️ Quiz 3 Images</option>
                      <option value="reward">🏆 Rewards</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-text-muted">Sort by:</label>
                    <select
                      value={uploadSortBy}
                      onChange={(e) => setUploadSortBy(e.target.value as any)}
                      className="px-3 py-1 bg-surface-raised border border-border rounded text-sm text-text focus:outline-none focus:ring-2 focus:ring-info"
                    >
                      <option value="priority">Priority</option>
                      <option value="name">Name</option>
                      <option value="count">Count</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-text-muted">Order:</label>
                    <button
                      onClick={() => setUploadSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-1 bg-surface-raised border border-border rounded text-sm text-text hover:bg-surface focus:outline-none focus:ring-2 focus:ring-info"
                    >
                      {uploadSortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                    </button>
                  </div>

                  {/* Reset Filters */}
                  {(uploadSearchQuery || uploadResourceFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setUploadSearchQuery("");
                        setUploadResourceFilter('all');
                      }}
                      className="px-3 py-1 bg-surface-raised border border-border rounded text-sm text-text hover:bg-surface focus:outline-none focus:ring-2 focus:ring-info"
                    >
                      Clear Filters
                    </button>
                  )}

                  {/* Results Count */}
                  <div className="ml-auto text-sm text-text-muted">
                    {filteredMissingResources.length} of {baseMissingResources.length} groups
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {filteredMissingResources.length === 0 ? (
                  <div className="text-center py-12">
                    {baseMissingResources.length === 0 ? (
                      <>
                        <div className="text-6xl mb-4">🎉</div>
                        <h3 className="text-xl font-bold text-success mb-2">All Assets Complete!</h3>
                        <p className="text-text-muted">No missing assets found. All groups are ready for rendering.</p>
                      </>
                    ) : (
                      <>
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-bold text-text-muted mb-2">No Results Found</h3>
                        <p className="text-text-muted">Try adjusting your search or filter criteria.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredMissingResources.map((group) => (
                      <div key={group.key} className="bg-surface-raised rounded-lg p-4 border border-border hover:border-border-strong transition-colors">
                        {/* Group Header */}
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-text capitalize">
                            {group.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-muted">Priority:</span>
                            <span className="px-2 py-1 bg-accent text-accent-fg text-xs rounded font-medium">
                              {group.priority}
                            </span>
                          </div>
                        </div>

                        {/* Missing Resources Count */}
                        <div className="mb-3">
                          <div className="flex items-center gap-2 text-sm text-text-muted">
                            <span>📦</span>
                            <span>{group.missingResources.length} resource{group.missingResources.length !== 1 ? 's' : ''} missing</span>
                            <span className="text-text-muted">•</span>
                            <span>{group.missingResources.reduce((sum, resource) => sum + resource.count, 0)} total items</span>
                          </div>
                        </div>

                        {/* Missing Resources */}
                        <div className="space-y-3">
                          {group.missingResources.map((resource, index) => (
                            <div
                              key={`${group.key}-${resource.type}-${index}`}
                              className="bg-surface-raised rounded-lg p-3 border border-border hover:border-border-strong transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{resource.icon}</span>
                                  <span className="font-medium text-text text-sm">{resource.label}</span>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded text-white font-medium ${resource.color}`}>
                                  {resource.count}
                                </span>
                              </div>
                              
                              <p className="text-xs text-text-muted mb-3 leading-relaxed">
                                {resource.description}
                              </p>

                              {/* Show individual items for all resource types that have specific items */}
                              {resource.items && resource.items.length > 0 ? (
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                  {resource.items.map((item, itemIndex) => (
                                    <div
                                      key={`${group.key}-${resource.type}-${item.key}-${itemIndex}`}
                                      className="bg-surface-raised rounded p-2 border border-border hover:border-border-strong transition-colors"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-text truncate">
                                          {item.name}
                                        </span>
                                        <button
                                          onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.multiple = false;
                                            
                                            // Set file type restrictions
                                            if (resource.type === 'image' || resource.type === 'quiz3-image') {
                                              input.accept = 'image/*';
                                            } else if (resource.type === 'video' || resource.type === 'reward') {
                                              input.accept = 'video/*';
                                            }
                                            
                                            input.onchange = (e) => {
                                              const files = (e.target as HTMLInputElement).files;
                                              if (files && files.length > 0) {
                                                if (resource.type === 'reward' && item.jsonOrder) {
                                                  handleUploadSpecificAsset(group.key, resource.type, files, item.jsonOrder);
                                                } else if (resource.type === 'quiz3-image') {
                                                  // For quiz3-image, we need to handle the specific image name
                                                  handleUploadSpecificAsset(group.key, resource.type, files, undefined, item.name);
                                                } else if (resource.type === 'image' && item.jsonOrder) {
                                                  // For images, we need to handle the JSON order
                                                  handleUploadSpecificAsset(group.key, resource.type, files, item.jsonOrder);
                                                } else if (resource.type === 'video' && item.jsonOrder) {
                                                  // For videos, we need to handle the JSON order
                                                  handleUploadSpecificAsset(group.key, resource.type, files, item.jsonOrder);
                                                }
                                              }
                                            };
                                            
                                            input.click();
                                          }}
                                          disabled={uploadingStates[getUploadKey(group.key, resource.type, item.jsonOrder)]}
                                          className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                                            uploadingStates[getUploadKey(group.key, resource.type, item.jsonOrder)]
                                              ? 'bg-surface-raised cursor-not-allowed text-text-muted' 
                                              : 'bg-info hover:opacity-90 text-white'
                                          }`}
                                        >
                                          {uploadingStates[getUploadKey(group.key, resource.type, item.jsonOrder)] ? (
                                            <>
                                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                              <span>Uploading...</span>
                                            </>
                                          ) : (
                                            <>
                                              <span>📤</span>
                                              <span>Upload</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                      <p className="text-xs text-text-muted leading-tight">
                                        {item.description}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                /* Default upload button for resource types without specific items */
                                <button
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.multiple = resource.type === 'quiz3-image';
                                    
                                    // Set file type restrictions
                                    if (resource.type === 'image' || resource.type === 'quiz3-image') {
                                      input.accept = 'image/*';
                                    } else if (resource.type === 'video') {
                                      input.accept = 'video/*';
                                    } else if (resource.type === 'reward') {
                                      input.accept = 'video/*';
                                    }
                                    
                                    input.onchange = (e) => {
                                      const files = (e.target as HTMLInputElement).files;
                                      if (files && files.length > 0) {
                                        if (resource.type === 'reward') {
                                          // For rewards, ask for JSON order
                                          const order = prompt(`Enter JSON order number for reward (available orders: ${group.jsonOrders.join(', ')})`);
                                          if (order && !isNaN(parseInt(order))) {
                                            handleUploadSpecificAsset(group.key, resource.type, files, parseInt(order));
                                          }
                                        } else {
                                          handleUploadSpecificAsset(group.key, resource.type, files);
                                        }
                                      }
                                    };
                                    
                                    input.click();
                                  }}
                                  disabled={uploadingStates[getUploadKey(group.key, resource.type)]}
                                  className={`w-full px-3 py-2 rounded transition-colors flex items-center justify-center gap-2 text-sm ${
                                    uploadingStates[getUploadKey(group.key, resource.type)]
                                      ? 'bg-surface-raised cursor-not-allowed' 
                                      : 'bg-info hover:opacity-90 text-white'
                                  }`}
                                >
                                  {uploadingStates[getUploadKey(group.key, resource.type)] ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                      <span>Uploading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>📤</span>
                                      <span>Upload {resource.label}</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <button
                  onClick={() => setShowUploadDialog(false)}
                  className="px-4 py-2 bg-surface-raised hover:bg-surface rounded transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Generation Dialog */}
      <ImageGenerationDialog
        isOpen={showImageGenerationDialog}
        onClose={() => setShowImageGenerationDialog(false)}
        onImageGenerated={handleImageGenerated}
        category="image"
        channel={selectedChannel}
        topic={selectedTopic}
      />

      {/* Provider Selection Dialog */}
      {providerSelectionConfig && (
        <ProviderSelectionDialog
          isOpen={showProviderSelectionDialog}
          onClose={() => setShowProviderSelectionDialog(false)}
          onProviderSelect={providerSelectionConfig.onSelect}
          title={providerSelectionConfig.title}
          description={providerSelectionConfig.description}
        />
      )}

      {/* Image Editor */}
      {editingImage && (
        <ImageEditor
          isOpen={showImageEditor}
          onClose={handleImageEditorClose}
          imageUrl={`/api/assets/preview?path=${encodeURIComponent(editingImage.asset.path)}&channel=${selectedChannel}&topic=${selectedTopic}`}
          imageName={editingImage.asset.name}
          onSave={handleImageEditorSave}
          defaultSize={512}
        />
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg max-w-md ${
              toast.type === 'success' 
                ? 'bg-success text-white' 
                : toast.type === 'error' 
                ? 'bg-danger text-white' 
                : 'bg-info text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Image Viewer */}
      <AnimatePresence>
        {fullscreenImage && <FullscreenViewer />}
      </AnimatePresence>

      {/* Crawler Dialog */}
      <AnimatePresence>
        {showCrawlerDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
                            <div className="flex flex-col gap-4 sticky top-0 bg-surface z-10 pb-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Crawler Resources</h2>
                                  <button
                  onClick={async () => {
                    setShowCrawlerDialog(false);
                    if (updatedAssets.size > 0) {
                      await fetchAssets();
                      // Scroll to the first updated item
                      const firstId = Array.from(updatedAssets)[0];
                      setTimeout(() => {
                        const itemElement = document.getElementById(`json-pair-${firstId}`);
                        if (itemElement) {
                          itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 100);
                      // Clear the updated assets set
                      setUpdatedAssets(new Set());
                    }
                  }}
                  className="text-text-muted hover:text-text"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
                </div>

                {/* Navigation Shortcuts */}
                <div className="flex gap-2">
                  <button
                    onClick={() => document.getElementById('crawler-main-image')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex items-center gap-2 px-4 py-2 bg-info text-white hover:opacity-90 rounded-lg text-sm font-medium"
                  >
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-info text-white">1</span>
                    Main Image
                  </button>
                  {missingQuizOptions.length > 0 && (
                    <button
                      onClick={() => document.getElementById('crawler-quiz-options')?.scrollIntoView({ behavior: 'smooth' })}
                      className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-fg hover:bg-accent-hover rounded-lg text-sm font-medium"
                    >
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-accent text-accent-fg">2</span>
                      Quiz Options ({missingQuizOptions.length})
                    </button>
                  )}
                  <button
                    onClick={() => document.getElementById('crawler-main-video')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex items-center gap-2 px-4 py-2 bg-success text-white hover:opacity-90 rounded-lg text-sm font-medium"
                  >
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-success text-white">3</span>
                    Main Video
                  </button>
                </div>
              </div>

              <div className="space-y-8 mt-4">
                {/* Main Image Section */}
                <div id="crawler-main-image">
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-info text-white">1</span>
                    Main Image
                  </h3>
                  {crawlerResources.images.length === 0 ? (
                    <p className="text-text-muted">No images available.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {crawlerResources.images.map((image, index) => (
                        <div key={index} className="relative group cursor-pointer">
                          <div className="aspect-square overflow-hidden rounded-lg relative group">
                            <img 
                              src={image.url}
                              alt={image.name}
                              className={`w-full h-full object-cover transform transition-all duration-200 ${
                                selectionState[getSelectionKey(image, 'image', 'main')]?.isSelected
                                  ? 'scale-95 brightness-75'
                                  : 'group-hover:scale-105'
                              }`}
                              onClick={() => setFullscreenImage(image)}
                            />
                            {/* Loading Overlay */}
                            {selectionState[getSelectionKey(image, 'image', 'main')]?.isLoading && (
                              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-info border-t-transparent"></div>
                              </div>
                            )}
                            {/* Success Overlay */}
                            {selectionState[getSelectionKey(image, 'image', 'main')]?.isSelected && (
                              <div className="absolute inset-0 bg-success bg-opacity-10 flex items-center justify-center z-20">
                                <div className="bg-success bg-opacity-90 rounded-full p-2">
                                  <CheckCircleIcon className="w-10 h-10 text-white" />
                                </div>
                              </div>
                            )}
                            {/* Hover Overlay with Button */}
                            <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center z-10">
                              <SelectionButton
                                resource={image}
                                type="image"
                                target="main"
                              />
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-text-muted truncate">{image.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quiz 3 Image Options Section */}
                {missingQuizOptions.length > 0 && (
                  <div id="crawler-quiz-options">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-accent text-accent-fg">2</span>
                      Quiz 3 Image Options
                    </h3>
                    <div className="space-y-6">
                      {missingQuizOptions.map((option, optionIndex) => (
                        <div key={option} className="bg-surface rounded-lg p-4">
                          <h4 className="text-base font-medium text-accent mb-3">Missing Option: {option}</h4>
                          {crawlerResourcesByOption[option]?.images.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                              {crawlerResourcesByOption[option].images.map((image, index) => (
                                <div key={index} className="relative group cursor-pointer">
                                                                  <div className="aspect-square overflow-hidden rounded-lg relative group">
                                  <img 
                                    src={image.url}
                                    alt={image.name}
                                    className={`w-full h-full object-cover transform transition-all duration-200 ${
                                      selectionState[getSelectionKey(image, 'quiz3-image', 'quiz3', option)]?.isSelected
                                        ? 'scale-95 brightness-75'
                                        : 'group-hover:scale-105'
                                    }`}
                                    onClick={() => setFullscreenImage(image)}
                                  />
                                  {/* Loading Overlay */}
                                  {selectionState[getSelectionKey(image, 'quiz3-image', 'quiz3', option)]?.isLoading && (
                                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-20">
                                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent"></div>
                                    </div>
                                  )}
                                  {/* Success Overlay */}
                                  {selectionState[getSelectionKey(image, 'quiz3-image', 'quiz3', option)]?.isSelected && (
                                    <div className="absolute inset-0 bg-accent bg-opacity-10 flex items-center justify-center z-20">
                                      <div className="bg-accent bg-opacity-90 rounded-full p-2">
                                        <CheckCircleIcon className="w-10 h-10 text-white" />
                                      </div>
                                    </div>
                                  )}
                                  {/* Hover Overlay with Button */}
                                  <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center z-10">
                                    <SelectionButton
                                      resource={image}
                                      type="quiz3-image"
                                      target="quiz3"
                                      optionName={option}
                                    />
                                  </div>
                                </div>
                                  <p className="mt-2 text-sm text-text-muted truncate">{image.name}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-text-muted">No images available for {option}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Videos Section */}
                <div id="crawler-main-video">
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-success text-white">3</span>
                    Main Video
                  </h3>
                  {crawlerResources.videos.length === 0 ? (
                    <p className="text-text-muted">No videos available.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {crawlerResources.videos.map((video, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-video overflow-hidden rounded-lg relative group">
                            <video 
                              src={video.url}
                              className={`w-full h-full object-cover transform transition-all duration-200 ${
                                selectionState[getSelectionKey(video, 'video', 'main')]?.isSelected
                                  ? 'scale-95 brightness-75'
                                  : 'group-hover:scale-105'
                              }`}
                              controls
                            />
                            {/* Loading Overlay */}
                            {selectionState[getSelectionKey(video, 'video', 'main')]?.isLoading && (
                              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-success border-t-transparent"></div>
                              </div>
                            )}
                            {/* Success Overlay */}
                            {selectionState[getSelectionKey(video, 'video', 'main')]?.isSelected && (
                              <div className="absolute inset-0 bg-success bg-opacity-10 flex items-center justify-center z-20">
                                <div className="bg-success bg-opacity-90 rounded-full p-2">
                                  <CheckCircleIcon className="w-10 h-10 text-white" />
                                </div>
                              </div>
                            )}
                            {/* Hover Overlay with Button */}
                            <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center z-10">
                              <SelectionButton
                                resource={video}
                                type="video"
                                target="main"
                              />
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-text-muted truncate">{video.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 