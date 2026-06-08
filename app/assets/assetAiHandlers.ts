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

export function createAiHandlers(ctx: AssetActionsCtx) {
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

  return {
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
  };
}
