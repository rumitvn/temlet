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
import { logger } from "@/app/lib/logger";

import type {
  Asset,
  AssetCategory,
  JSONVoicePair,
  JSONAssetPair,
  AssetGroup,
  SK3QLRContent,
  OverviewStatus,
  MissingResource,
  MissingItem,
  GroupUploadItem,
  CrawlerResource,
  ResourceType,
  ApiResourceType,
  ResourceTarget,
  SelectionState,
} from "./types";
import {
  extractKeyAndOrder,
  organizeJSONAssetPairs,
  getValidOptionsForAvailableImages,
  getEarliestJsonDate,
  formatDate,
  formatFileSize,
  getUploadKey,
  getSelectionKey,
} from "./utils";
import FullscreenViewer from "./components/FullscreenViewer";
import SelectionButton from "./components/SelectionButton";
import JSONPreview from "./components/JSONPreview";
import AssetGroupCard from "./components/AssetGroupCard";
import AIGeneratorDialog from "./components/AIGeneratorDialog";
import UploadAssetsDialog from "./components/UploadAssetsDialog";
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
    logger.debug('🔄 calculateMissingResources triggered - assetGroups changed');
    const groups: GroupUploadItem[] = [];
    
    assetGroups.forEach(group => {
      const status = group.renderStatus;
      const missingResources: MissingResource[] = [];
      
      // Check for missing images (now per JSON order)
      if (status.requiredImages > status.availableImages) {
        const missingCount = status.requiredImages - status.availableImages;
        
        // Debug logging for frog group
        if (group.key === 'frog') {
          logger.debug(`🐸 Frog missing images calculation:`);
          logger.debug(`  Required images: ${status.requiredImages}`);
          logger.debug(`  Available images: ${status.availableImages}`);
          logger.debug(`  JSON orders: ${status.jsonOrders}`);
          logger.debug(`  Image orders: ${status.imageOrders}`);
          logger.debug(`  Available images:`, group.assets.images.map(img => ({ name: img.name, order: img.order })));
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
        logger.debug(`🐸 Frog calculateMissingResources:`);
        logger.debug(`  Required images: ${status.requiredImages}`);
        logger.debug(`  Available images: ${status.availableImages}`);
        logger.debug(`  Required videos: ${status.requiredVideos}`);
        logger.debug(`  Available videos: ${status.availableVideos}`);
        logger.debug(`  Missing resources count: ${missingResources.length}`);
        logger.debug(`  Missing resources:`, missingResources.map(r => ({ type: r.type, count: r.count })));
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
    logger.debug('🔄 Recalculating base missing resources');
    logger.debug('  - calculateMissingResources dependency changed');
    return calculateMissingResources;
  }, [calculateMissingResources]);

  // Create search index for fast filtering
  const searchIndex = useMemo(() => {
    logger.debug('🔍 Creating search index');
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
    
    logger.debug('🔍 Search index created with', index.size, 'words');
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
    logger.debug('🔍 Starting filter operation');
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
    logger.debug(`🔍 Filter operation completed in ${endTime - startTime}ms`);
    
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
        
        logger.debug('🐊 Alligator Group Status:', {
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

    logger.debug('📊 Overview Status Results:', {
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





  // Function to pre-load JSON content for quiz 3 options
  const loadJSONContentBatch = async (jsonAssets: Asset[]) => {
    logger.debug('🔧 loadJSONContentBatch called for:', jsonAssets.length, 'files');
    try {
      if (jsonAssets.length === 0) {
        return new Map<string, string[]>();
      }

      const paths = jsonAssets.map(asset => asset.path);
      logger.debug(`📄 Loading JSON content for ${jsonAssets.length} files`);
      
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
      
      logger.debug(`📡 Response status: ${response.status}, ok: ${response.ok}`);
      
      if (response.ok) {
        const result = await response.json();
        logger.debug(`✅ Batch loaded JSON content for ${Object.keys(result).length} files`);
        
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
              logger.debug(`🎯 Quiz 3 options for ${path}:`, optionsInfo.originalOptions);
              if (optionsInfo.hasMismatch) {
                logger.debug(`⚠️ Warning: JSON has ${optionsInfo.originalOptions.length - optionsInfo.validOptions.length} invalid options`);
              }
            } else {
              jsonOptionsMap.set(normalizedPath, typedData.options);
              logger.debug(`🎯 Quiz 3 options for ${path}:`, typedData.options);
            }
          } else if ('error' in typedData) {
            logger.error(`❌ Error loading ${path}:`, typedData.error);
            jsonOptionsMap.set(normalizedPath, []);
          }
        }
        
        logger.debug('📊 Final JSON options map size:', jsonOptionsMap.size);
        logger.debug('📊 JSON options map keys:', Array.from(jsonOptionsMap.keys()));
        
        return jsonOptionsMap;
      } else {
        logger.error(`❌ Failed to load JSON content batch:`, response.status, response.statusText);
      }
    } catch (error) {
      logger.error('❌ Error loading JSON content batch:', error);
    }
    return new Map<string, string[]>();
  };



  const fetchAssets = useCallback(async (searchTerm?: string, isSearch = false) => {
    logger.debug('🚀 fetchAssets called with:', { searchTerm, isSearch, selectedChannel, selectedTopic });
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
        logger.debug(`Processing asset: ${asset.name} -> key: "${key}", order: ${order}, path: ${asset.path}`); // Debug log
        return { ...asset, key, order };
      });
      
      logger.debug('=== ASSET PROCESSING DEBUG ===');
      logger.debug('Total assets:', processedAssets.length);
      logger.debug('JSON files:', processedAssets.filter((a: Asset) => a.type === 'json').map((a: Asset) => a.name));
      logger.debug('Voice files:', processedAssets.filter((a: Asset) => a.type === 'voice').map((a: Asset) => a.name));
      logger.debug('Image files:', processedAssets.filter((a: Asset) => a.type === 'image').map((a: Asset) => a.name));
      logger.debug('Video files:', processedAssets.filter((a: Asset) => a.type === 'video').map((a: Asset) => a.name));
      logger.debug('Video files with categories:', processedAssets.filter((a: Asset) => a.type === 'video').map((a: Asset) => ({ name: a.name, category: a.category, path: a.path })));
      
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
                  logger.debug(`Grouping voice file ${asset.name} with JSON key: "${key}" (matched by directory: ${dirName})`);
                } else {
                  // If no matching JSON found, use the voice key
                  key = voiceKey;
                  logger.debug(`No matching JSON found for voice file ${asset.name}, using key: "${key}"`);
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
                  logger.debug(`Grouping voice file ${asset.name} with JSON key: "${key}" (fallback)`);
                } else {
                  key = 'voice_files';
                  logger.debug(`No JSON files found, grouping voice file ${asset.name} as: "${key}"`);
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
                logger.debug(`Grouping voice file ${asset.name} with JSON key: "${key}" (fallback)`);
              } else {
                key = 'voice_files';
                logger.debug(`No JSON files found, grouping voice file ${asset.name} as: "${key}"`);
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
              logger.debug(`Grouping voice file ${asset.name} with JSON key: "${key}" (fallback)`);
            } else {
              key = 'voice_files';
              logger.debug(`No JSON files found, grouping voice file ${asset.name} as: "${key}"`);
            }
          }
        }
        
        // Skip .DS_Store files
        if (asset.name === '.DS_Store') {
          return groups;
        }
        
        logger.debug(`Grouping asset ${asset.name} (${asset.type}) with key: "${key}"`); // Debug log
        
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
              logger.debug(`📸 Added image order ${asset.order} for group ${key} (${asset.name})`);
            }
            
            // Debug logging for frog group
            if (key === 'frog') {
              logger.debug(`🐸 Frog image processing: ${asset.name}, order: ${asset.order}, category: ${asset.category}, key: ${asset.key}`);
              logger.debug(`🐸 Current frog image orders:`, groups[key].renderStatus.imageOrders);
            }
          }
        } else if (asset.type === 'video') {
          logger.debug(`🎬 Processing video asset: ${asset.name} (category: ${asset.category}, path: ${asset.path})`);
          if (asset.category === 'reward') {
            logger.debug(`🎁 Adding reward video: ${asset.name} (path: ${asset.path}) to group ${key}`);
            groups[key].assets.rewards.push(asset);
          } else if (asset.key !== 'ignored') {
            logger.debug(`📹 Adding regular video: ${asset.name} to group ${key}`);
            groups[key].assets.videos.push(asset);
          } else {
            logger.debug(`❌ Ignoring video: ${asset.name} (category: ${asset.category}, key: ${asset.key})`);
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
          logger.debug(`🐸 Frog hasImage/hasVideos flags:`);
          logger.debug(`  hasImage: ${group.renderStatus.hasImage} (${group.renderStatus.availableImages}/${group.renderStatus.requiredImages})`);
          logger.debug(`  hasVideos: ${group.renderStatus.hasVideos} (${group.renderStatus.availableVideos}/${group.renderStatus.requiredVideos})`);
          logger.debug(`🐸 Frog final calculation:`);
          logger.debug(`  JSON orders: ${group.renderStatus.jsonOrders}`);
          logger.debug(`  Image orders: ${group.renderStatus.imageOrders}`);
          logger.debug(`  Video orders: ${group.renderStatus.videoOrders}`);
          logger.debug(`  Matching image orders: ${matchingImageOrders}`);
          logger.debug(`  Available images: ${group.renderStatus.availableImages}/${group.renderStatus.requiredImages}`);
          logger.debug(`  Available videos: ${group.renderStatus.availableVideos}/${group.renderStatus.requiredVideos}`);
        }
      });
      
      // Pre-load JSON content for quiz 3 options
      const jsonAssets = processedAssets.filter((asset: Asset) => asset.type === 'json');
      
      logger.debug('=== JSON LOADING DEBUG ===');
      logger.debug('Search term:', searchTerm);
      logger.debug('Total JSON assets found:', jsonAssets.length);
      logger.debug('JSON assets:', jsonAssets.map((a: Asset) => ({ name: a.name, path: a.path, key: a.key })));
      
      // Load JSON content for all JSON files in a single batch request
      const jsonOptionsMap = await loadJSONContentBatch(jsonAssets);

      logger.debug('=== JSON OPTIONS MAP ===');
      logger.debug('Map size:', jsonOptionsMap.size);
      for (const [path, options] of jsonOptionsMap.entries()) {
        logger.debug(`Path: ${path} -> Options:`, options);
      }
      
      // Debug: Show what paths we're looking for
      logger.debug('=== PATH DEBUG ===');
      jsonAssets.forEach((asset: Asset) => {
        const normalizedPath = asset.path.replace(/\\/g, '/');
        logger.debug(`Asset: ${asset.name}`);
        logger.debug(`  Original path: ${asset.path}`);
        logger.debug(`  Normalized path: ${normalizedPath}`);
        logger.debug(`  In map: ${jsonOptionsMap.has(normalizedPath)}`);
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
          logger.error('Error loading all assets for checking:', error);
          allImagesForChecking = processedAssets.filter((asset: Asset) => asset.type === 'image');
          allVoicesForChecking = processedAssets.filter((asset: Asset) => asset.type === 'voice');
        }
      } else {
        // If not searching, use the current processed assets
        allImagesForChecking = processedAssets.filter((asset: Asset) => asset.type === 'image');
        allVoicesForChecking = processedAssets.filter((asset: Asset) => asset.type === 'voice');
      }
      
      logger.debug('🔍 Images available for quiz 3 checking:', allImagesForChecking.length);
      logger.debug('🎵 Voices available for checking:', allVoicesForChecking.length);
      
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
        
        logger.debug(`📊 Render status for ${groupKey}:`, {
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
        logger.debug(`🔧 Organizing pairs for group ${groupAsAssetGroup.key}:`);
        logger.debug(`  JSONs: ${groupAsAssetGroup.assets.jsons.length}`);
        logger.debug(`  Voices: ${groupAsAssetGroup.assets.voices.length}`);
        logger.debug(`  Rewards: ${groupAsAssetGroup.assets.rewards.length}`);
        logger.debug(`  Rewards details:`, groupAsAssetGroup.assets.rewards.map(r => ({ name: r.name, path: r.path, category: r.category })));
        
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
      logger.error('Error fetching assets:', error);
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
      logger.debug('🚫 Skipping main search - upload dialog is open');
      return;
    }
    
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        logger.debug('🔍 Triggering server-side search for:', searchQuery);
        fetchAssets(searchQuery, true); // isSearch = true
      } else {
        logger.debug('🔄 Resetting to all assets');
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
      logger.debug('🔍 Applying status filter:', statusFilter);
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
      logger.debug('📊 Status filter applied, filtered groups:', filtered.length);
    }

    // Apply search filter if there's a search query
    if (searchQuery.trim()) {
      logger.debug('🔍 Applying search filter for query:', searchQuery);
      filtered = filtered.filter(group => 
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.assets.jsons.some(json => json.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        group.assets.videos.some(video => video.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        group.assets.voices.some(voice => voice.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      logger.debug('📊 Search filter applied, filtered groups:', filtered.length);
    }

    // Sort the filtered groups
    logger.debug(`Sorting filtered groups by: ${sortBy}, Order: ${sortOrder}, Groups: ${filtered.length}`);
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
        logger.debug(`Comparing names: "${a.name}" vs "${b.name}"`);
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
      logger.error('Error deleting assets:', error);
      alert('Failed to delete assets. Please try again.');
    }
  };

  const handleUploadAssets = async (files: FileList) => {
    alert('Upload functionality requires category selection. Please implement category selection first.');
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
      logger.error('Upload error:', error);
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
          logger.debug(`🐸 Frog after upload update:`);
          logger.debug(`  JSON orders: ${updatedGroup.renderStatus.jsonOrders}`);
          logger.debug(`  Image orders: ${updatedGroup.renderStatus.imageOrders}`);
          logger.debug(`  Available images: ${updatedGroup.renderStatus.availableImages}/${updatedGroup.renderStatus.requiredImages}`);
          logger.debug(`  Available videos: ${updatedGroup.renderStatus.availableVideos}/${updatedGroup.renderStatus.requiredVideos}`);
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
          logger.error(`Error reading JSON file ${json.name}:`, error);
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
      logger.error('Error generating AI content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const generateBatchAIContent = async () => {
    logger.debug('🔥 BATCH GENERATION FUNCTION CALLED 🔥');
    
    // Prevent multiple simultaneous batch generations
    if (batchGenerating) {
      logger.debug('Batch generation already in progress, ignoring duplicate call');
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

    logger.debug('=== STARTING BATCH GENERATION ===');
    logger.debug('Subjects:', subjects);
    logger.debug('Batch size:', batchSize);
    logger.debug('Current preview items count:', previewItems.length);

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
        
        logger.debug(`🔍 KEY MATCHING DEBUG for ${subject}:`);
        logger.debug('Subject (original):', subject);
        logger.debug('Subject (normalized):', normalizedSubject);
        logger.debug('All preview items keys:', previewItems.map(item => item.key));
        logger.debug('Matching preview items:', existingPreviewItems);
        logger.debug('Found orders:', existingPreviewOrders);
        
        // Combine existing orders from both sources
        const allExistingOrders = [...existingOrders, ...existingPreviewOrders];
        const maxExistingOrder = allExistingOrders.length > 0 ? Math.max(...allExistingOrders) : 0;
        
        // Track the current highest order for this subject within this batch
        let currentBatchMaxOrder = maxExistingOrder;
        
        logger.debug(`=== BATCH GENERATION DEBUG for ${subject} ===`);
        logger.debug('Existing orders from disk:', existingOrders);
        logger.debug('Existing preview orders:', existingPreviewOrders);
        logger.debug('All existing orders:', allExistingOrders);
        logger.debug('Max existing order:', maxExistingOrder);
        logger.debug('Starting currentBatchMaxOrder:', currentBatchMaxOrder);
        
        for (let batchIndex = 0; batchIndex < batchSize; batchIndex++) {
          const currentProgress = subjectIndex * batchSize + batchIndex + 1;
          setBatchProgress({ 
            current: currentProgress, 
            total: subjects.length * batchSize, 
            subject: subject 
          });
          
          // Calculate next order number for this subject
          const nextOrder = currentBatchMaxOrder + 1;
          
          logger.debug(`--- Generating item ${batchIndex + 1} for ${subject} ---`);
          logger.debug('Current batch max order:', currentBatchMaxOrder);
          logger.debug('Calculated next order:', nextOrder);
          
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
              logger.error(`Error reading JSON file ${json.name}:`, error);
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
              logger.debug(`✓ Updated previewItems for ${subject} order ${nextOrder}`);
              logger.debug('Current previewItems count:', newPreviewItems.length);
              return newPreviewItems;
            });
            
            // Update local array synchronously for next iteration
            currentPreviewItems.push(newContent);
            logger.debug(`✓ Updated local currentPreviewItems for ${subject} order ${nextOrder}`);
            logger.debug('Local currentPreviewItems count:', currentPreviewItems.length);
            
            logger.debug(`✓ Successfully generated ${subject} order ${nextOrder}`);
            logger.debug('New content added:', newContent);
            
            // Update the current batch max order for the next iteration
            currentBatchMaxOrder = nextOrder;
            logger.debug('Updated currentBatchMaxOrder to:', currentBatchMaxOrder);
          } catch (error) {
            logger.error(`Error generating content for ${subject}_${nextOrder}:`, error);
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
      logger.error('Error in batch generation:', error);
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
      logger.error('Error creating render files:', error);
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
          <JSONPreview
            asset={asset}
            initialViewMode={previewVideoMode ? 'video' : 'json'}
            selectedChannel={selectedChannel}
            selectedTopic={selectedTopic}
            setToast={setToast}
            setAssetGroups={setAssetGroups}
          />
        );
      default:
        return <div className="text-center text-text-muted">Preview not available</div>;
    }
  };

  // JSON Preview Component
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
          logger.error(`Error generating ${voiceItem.name}:`, error);
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
          logger.warn(`❌ Failed to generate ${failed} files. Check console for details.`);
        }
        
        // Show toast notification
        setToast({ message: successMessage, type: 'success' });
        setTimeout(() => setToast(null), 3000);
        
      } else {
        throw new Error('Failed to generate any voice files. Please check the console for details.');
      }
      
    } catch (error) {
      logger.error('Error generating voice files:', error);
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
      logger.error('Error generating reward video:', error);
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
      logger.error('Error generating topic image:', error);
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
        logger.debug('🎨 Generated image data:', data.savedAsset);
        logger.debug('📄 JSON asset:', jsonAsset);
        
        // Update only the specific asset group instead of refreshing all assets
        setAssetGroups(prevGroups => {
          return prevGroups.map(group => {
            if (group.key === jsonAsset.key) {
              logger.debug('🔧 Updating group:', group.key);
              logger.debug('📸 Current images:', group.assets.images.length);
              
              // Create the new image asset with proper structure
              const newImageAsset = {
                ...data.savedAsset,
                key: jsonAsset.key,
                order: jsonAsset.order
              };
              
              logger.debug('🆕 New image asset:', newImageAsset);
              
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
              
              logger.debug('✅ Updated group render status:', updatedGroup.renderStatus);
              
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
      logger.error('Error generating main image:', error);
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
          logger.error(`Error generating image for ${missingImage}:`, error);
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
      logger.error('Error generating missing quiz 3 images:', error);
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
      logger.error('Error saving edited image:', error);
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
      logger.error('Error fetching crawler resources:', error);
      // Show error toast or notification
    }
  };

  interface CopyResponse {
    success: boolean;
    error?: string;
    targetPath: string;
    filename: string;
  }


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

      logger.debug('Copying resource:', payload);

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
      logger.error('Error copying crawler resource:', error);
      // Show error toast or notification
    }
  };

  // Fullscreen image viewer component
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
          {paginatedAssetGroups.map((group) => (
            <AssetGroupCard
              key={`${group.key}-${sortBy}-${sortOrder}`}
              group={group}
              sortBy={sortBy}
              sortOrder={sortOrder}
              voiceGeneratingStates={voiceGeneratingStates}
              imageGeneratingStates={imageGeneratingStates}
              handlePreviewAsset={handlePreviewAsset}
              handleEditImage={handleEditImage}
              showProviderSelectionForMissingImages={showProviderSelectionForMissingImages}
              showProviderSelectionForMainImage={showProviderSelectionForMainImage}
              handleGenerateVoice={handleGenerateVoice}
              handleGenerateReward={handleGenerateReward}
              handleFetchCrawlerResources={handleFetchCrawlerResources}
              setPreviewAsset={setPreviewAsset}
              setShowPreview={setShowPreview}
            />
          ))}
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
          <AIGeneratorDialog
            selectedChannel={selectedChannel}
            selectedTopic={selectedTopic}
            aiPrompt={aiPrompt}
            aiDescription={aiDescription}
            aiProvider={aiProvider}
            aiLanguage={aiLanguage}
            batchSize={batchSize}
            subjectsList={subjectsList}
            previewItems={previewItems}
            existingOrders={existingOrders}
            isBatchMode={isBatchMode}
            aiGenerating={aiGenerating}
            batchGenerating={batchGenerating}
            batchProgress={batchProgress}
            setAiPrompt={setAiPrompt}
            setAiDescription={setAiDescription}
            setAiLanguage={setAiLanguage}
            setAiProvider={setAiProvider}
            setBatchSize={setBatchSize}
            setIsBatchMode={setIsBatchMode}
            setPreviewItems={setPreviewItems}
            setSubjectsList={setSubjectsList}
            setShowAIGenerator={setShowAIGenerator}
            generateAIContent={generateAIContent}
            generateBatchAIContent={generateBatchAIContent}
            approveGeneratedContent={approveGeneratedContent}
            clearAllPreviews={clearAllPreviews}
            removePreviewItem={removePreviewItem}
            handleSubjectChange={handleSubjectChange}
            parseSubjectsList={parseSubjectsList}
            getExistingOrdersForSubjects={getExistingOrdersForSubjects}
          />
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
                        logger.error('Error deleting asset:', error);
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
          <UploadAssetsDialog
            baseMissingResources={baseMissingResources}
            filteredMissingResources={filteredMissingResources}
            uploadSearchQuery={uploadSearchQuery}
            uploadResourceFilter={uploadResourceFilter}
            uploadSortBy={uploadSortBy}
            uploadSortOrder={uploadSortOrder}
            uploadingStates={uploadingStates}
            setShowUploadDialog={setShowUploadDialog}
            setUploadSearchQuery={setUploadSearchQuery}
            setUploadResourceFilter={setUploadResourceFilter}
            setUploadSortBy={setUploadSortBy}
            setUploadSortOrder={setUploadSortOrder}
            handleUploadSpecificAsset={handleUploadSpecificAsset}
          />
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
        {fullscreenImage && (
          <FullscreenViewer
            image={fullscreenImage}
            onClose={() => setFullscreenImage(null)}
            showQuizMenu={showQuizOptionMenu}
            onToggleQuizMenu={() => setShowQuizOptionMenu(!showQuizOptionMenu)}
            missingQuizOptions={missingQuizOptions}
            onSelectResource={handleSelectCrawlerResource}
          />
        )}
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
                                selectionState={selectionState}
                                onSelect={handleSelectCrawlerResource}
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
                                      selectionState={selectionState}
                                      onSelect={handleSelectCrawlerResource}
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
                                selectionState={selectionState}
                                onSelect={handleSelectCrawlerResource}
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