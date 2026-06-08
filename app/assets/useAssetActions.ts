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
import type { AssetActionsDeps } from "./useAssetActions.deps";

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

  return {
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
