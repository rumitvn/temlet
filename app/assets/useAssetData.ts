import { useCallback, useEffect } from "react";
import { logger } from "@/app/lib/logger";
import {
  extractKeyAndOrder,
  organizeJSONAssetPairs,
  checkQuiz3ImageOptions,
  getValidOptionsForAvailableImages,
} from "./utils";
import type { Asset, AssetGroup } from "./types";
import type { AssetDataDeps } from "./useAssetData.deps";

export function useAssetData(deps: AssetDataDeps) {
  const {
    assets,
    searchQuery,
    selectedChannel,
    selectedTopic,
    isUploadDialogOpen,
    setAssets,
    setAssetGroups,
    setLoading,
    setSearching,
  } = deps;

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

  return { fetchAssets };
}
