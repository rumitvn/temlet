import { useEffect, useMemo, useState } from "react";
import { logger } from "@/app/lib/logger";
import { getUploadKey } from "./utils";
import type {
  Asset,
  AssetGroup,
  GroupUploadItem,
  OverviewStatus,
  MissingResource,
  MissingItem,
} from "./types";
import type { AssetDerivationsDeps } from "./useAssetDerivations.deps";

export function useAssetDerivations(deps: AssetDerivationsDeps) {
  const {
    assets,
    assetGroups,
    searchQuery,
    sortBy,
    sortOrder,
    statusFilter,
    currentPage,
    itemsPerPage,
    uploadSearchQuery,
    uploadResourceFilter,
    uploadSortBy,
    uploadSortOrder,
  } = deps;

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

  return {
    calculateMissingResources,
    baseMissingResources,
    searchIndex,
    calculateOverviewStatus,
    filteredAssets,
    filteredAssetGroups,
    totalPages,
    paginatedAssetGroups,
    filteredMissingResources,
    setFilteredMissingResources,
  };
}
