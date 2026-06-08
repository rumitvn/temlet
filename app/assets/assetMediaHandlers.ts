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
import type { AssetActionsCtx } from "./useAssetActions.deps";

export function createMediaHandlers(ctx: AssetActionsCtx) {
  /* eslint-disable @typescript-eslint/no-unused-vars */
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
    imageGeneratingStates,
    setImageGeneratingStates,
  } = ctx;
  /* eslint-enable @typescript-eslint/no-unused-vars */

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

  return {
    handleGenerateVoice,
    handleGenerateReward,
    handleImageGenerated,
    handleGenerateTopicImage,
    showProviderSelectionForMainImage,
    handleGenerateMainImage,
    showProviderSelectionForMissingImages,
  };
}
