import { useState } from "react";
import { config } from "../../lib/config";
import { logger } from "@/app/lib/logger";
import { YOUTUBE_CATEGORY_ID } from "@/app/lib/constants";
import {
  extractKeyAndOrder,
  organizeJSONAssetPairs,
  getValidOptionsForAvailableImages,
  getUploadKey,
  getSelectionKey,
} from "./utils";
import type {
  Asset,
  AssetGroup,
  JSONAssetPair,
  SK3QLRContent,
  ResourceType,
  ResourceTarget,
  CrawlerResource,
  MissingResource,
  SelectionState,
} from "./types";
import type { AssetActionsDeps, AssetActionsCtx } from "./useAssetActions.deps";
import { createAiHandlers } from "./assetAiHandlers";
import { createMediaHandlers } from "./assetMediaHandlers";

export function useAssetActions(deps: AssetActionsDeps) {
  const {
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
  } = deps;

  // State for topic image generation (shared with the page render + media handlers)
  const [imageGeneratingStates, setImageGeneratingStates] = useState<{
    [key: string]: boolean;
  }>({});

  const ctx: AssetActionsCtx = {
    ...deps,
    imageGeneratingStates,
    setImageGeneratingStates,
  };

  const aiHandlers = createAiHandlers(ctx);
  const mediaHandlers = createMediaHandlers(ctx);

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

  return {
    handleAssetSelect,
    handleSelectAll,
    handleDeselectAll,
    handleDeleteSelected,
    handleUploadAssets,
    handleUploadSpecificAsset,
    updateGroupAfterUpload,
    ...aiHandlers,
    handlePreviewAsset,
    handleClosePreview,
    ...mediaHandlers,
    handleEditImage,
    handleImageEditorSave,
    handleImageEditorClose,
    handleFetchCrawlerResources,
    handleSelectCrawlerResource,
    // Hook-owned UI state consumed by the page render
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
  };
}
