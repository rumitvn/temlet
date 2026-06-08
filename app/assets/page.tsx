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
import AssetOverviewBar from "./components/AssetOverviewBar";
import AssetSearchFilters from "./components/AssetSearchFilters";
import AssetPreviewModal from "./components/AssetPreviewModal";
import { useAssetActions } from "./useAssetActions";
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
  // State for tracking voice generation progress per JSON asset
  const [voiceGeneratingStates, setVoiceGeneratingStates] = useState<{ [key: string]: boolean }>({});
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




  const {
    handleAssetSelect,
    handleSelectAll,
    handleDeselectAll,
    handleDeleteSelected,
    handleUploadAssets,
    handleUploadSpecificAsset,
    updateGroupAfterUpload,
    checkDuplicateSubject,
    checkExistingOrders,
    handleSubjectChange,
    parseSubjectsList,
    getExistingOrdersForSubjects,
    generateAIContent,
    generateBatchAIContent,
    removePreviewItem,
    clearAllPreviews,
    approveGeneratedContent,
    handlePreviewAsset,
    handleClosePreview,
    handleGenerateVoice,
    handleGenerateReward,
    handleImageGenerated,
    handleGenerateTopicImage,
    showProviderSelectionForMainImage,
    handleGenerateMainImage,
    showProviderSelectionForMissingImages,
    handleEditImage,
    handleImageEditorSave,
    handleImageEditorClose,
    handleFetchCrawlerResources,
    handleSelectCrawlerResource,
    imageGeneratingStates,
    showCrawlerDialog,
    setShowCrawlerDialog,
    selectedJsonAsset,
    setSelectedJsonAsset,
    crawlerResources,
    crawlerResourcesByOption,
    selectionState,
    fullscreenImage,
    setFullscreenImage,
    showQuizOptionMenu,
    setShowQuizOptionMenu,
    missingQuizOptions,
    updatedAssets,
    setUpdatedAssets,
  } = useAssetActions({
    assets,
    assetGroups,
    filteredAssets,
    selectedChannel,
    selectedTopic,
    selectedAssets,
    editingImage,
    aiPrompt,
    aiDescription,
    aiLanguage,
    aiProvider,
    existingOrders,
    previewItems,
    batchSize,
    subjectsList,
    batchGenerating,
    isBatchMode,
    fetchAssets,
    setAssets,
    setAssetGroups,
    setSelectedAssets,
    setEditingImage,
    setAiPrompt,
    setAiGenerating,
    setBatchGenerating,
    setBatchProgress,
    setExistingOrders,
    setPreviewItems,
    setPreviewAsset,
    setPreviewVideoMode,
    setProviderSelectionConfig,
    setShowAIGenerator,
    setShowImageEditor,
    setShowImageGenerationDialog,
    setShowPreview,
    setShowProviderSelectionDialog,
    setShowSuccessDialog,
    setSuccessMessage,
    setToast,
    setUploadingStates,
    setVoiceGeneratingStates,
  });

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
      <AssetOverviewBar
        calculateOverviewStatus={calculateOverviewStatus}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {/* Search and Filters */}
      <AssetSearchFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        selectedChannel={selectedChannel}
        setSelectedChannel={setSelectedChannel}
        selectedTopic={selectedTopic}
        setSelectedTopic={setSelectedTopic}
        selectedAssets={selectedAssets}
        handleDeleteSelected={handleDeleteSelected}
        handleDeselectAll={handleDeselectAll}
      />

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
          <AssetPreviewModal
            previewAsset={previewAsset}
            handleClosePreview={handleClosePreview}
            getAssetPreviewContent={getAssetPreviewContent}
            fetchAssets={fetchAssets}
          />
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