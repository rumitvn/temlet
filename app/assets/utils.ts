import { logger } from "@/app/lib/logger";
import type {
  Asset,
  JSONAssetPair,
  AssetGroup,
  MissingResource,
  CrawlerResource,
  ResourceType,
  ResourceTarget,
} from "./types";

// Helper function to extract key and order from filename
export const extractKeyAndOrder = (filename: string, type: string, path?: string): { key: string; order?: number } => {
  if (type === 'json') {
    // Extract from format like "bear_1.json" or "blue_tang_1.json"
    // Use a more robust regex that handles multi-word names
    const match = filename.match(/^(.+?)_(\d+)\.json$/);
    if (match) {
      const key = match[1];
      const order = parseInt(match[2]);
      logger.debug(`Extracted from ${filename}: key="${key}", order=${order}`); // Debug log
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
          logger.debug(`Extracted from voice path ${path}: key="${key}", order=${order}`); // Debug log
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
      logger.debug(`Extracted from reward video path ${path}: key="${key}", order=${order}`); // Debug log
      return { key, order };
    }
    
    // Fallback for reward videos without proper path structure
    const filenameMatch = filename.match(/^(.+?)\.mp4$/);
    if (filenameMatch) {
      const key = filenameMatch[1];
      logger.debug(`Extracted from reward video filename ${filename}: key="${key}"`); // Debug log
      return { key };
    }
  } else if (type === 'image' || type === 'video') {
    // Extract from format like "alligator_1.jpg", "alligator_2.mp4", "bear_1.png"
    // This matches the new structure where images and videos include order numbers
    const match = filename.match(/^(.+?)_(\d+)\.(jpg|mp4|png|gif)$/);
    if (match) {
      const key = match[1];
      const order = parseInt(match[2]);
      logger.debug(`Extracted from ${type} ${filename}: key="${key}", order=${order}`); // Debug log
      return { key, order };
    }
    
    // Files without order numbers should be ignored for images and videos
    logger.debug(`Ignoring ${type} file without order number: ${filename}`);
    return { key: 'ignored', order: undefined };
  }
  return { key: filename.split('.')[0] };
};

// Helper function to organize JSON files with their corresponding voices and rewards
export const organizeJSONAssetPairs = (jsons: Asset[], voices: Asset[], rewards: Asset[], allImages: Asset[], jsonOptionsMap: Map<string, string[]> = new Map()): JSONAssetPair[] => {
  logger.debug('🔧 organizeJSONAssetPairs called with:', jsons.length, 'JSONs');
  logger.debug('🎁 Rewards array:', rewards.map(r => ({ name: r.name, path: r.path, key: r.key, order: r.order })));
  return jsons.map(json => {
    const jsonOrder = json.order;
    const jsonKey = json.key;
    
    // Find voices that belong to this JSON file
    const matchingVoices = voices.filter(voice => {
      // Check if voice belongs to this JSON by matching key and order
      if (voice.key === jsonKey && voice.order === jsonOrder) {
        logger.debug(`Voice ${voice.name} matched by key/order: ${voice.key}_${voice.order}`); // Debug log
        return true;
      }
      
      // Check by path structure: voice/key_order/voice_type.mp3
      if (voice.path) {
        const pathMatch = voice.path.match(/voice[\/\\]([^\/\\]+)_(\d+)[\/\\]/);
        if (pathMatch && pathMatch[1] === jsonKey && parseInt(pathMatch[2]) === jsonOrder) {
          logger.debug(`Voice ${voice.name} matched by path: ${voice.path}`); // Debug log
          return true;
        }
      }
      
      // Additional check for voice filename pattern: key_order_voice_type.mp3
      const voiceNameMatch = voice.name.match(/^(.+?)_(\d+)_voice_/);
      if (voiceNameMatch && voiceNameMatch[1] === jsonKey && parseInt(voiceNameMatch[2]) === jsonOrder) {
        logger.debug(`Voice ${voice.name} matched by filename pattern`); // Debug log
        return true;
      }
      
      return false;
    });

    // Find reward that belongs to this JSON file
    logger.debug(`🔍 Looking for reward for JSON ${json.name} (key: ${jsonKey}, order: ${jsonOrder})`);
    const matchingReward = rewards.find(reward => {
      logger.debug(`  Checking reward: ${reward.name} (path: ${reward.path}, key: ${reward.key}, order: ${reward.order})`);
      
      // Check by path structure: reward/output/reward_order/name.mp4
      if (reward.path) {
        const pathMatch = reward.path.match(/reward[\/\\]output[\/\\]reward_(\d+)[\/\\]([^\/\\]+)\.mp4$/);
        if (pathMatch) {
          logger.debug(`    Path match: order=${pathMatch[1]}, filename=${pathMatch[2]}`);
          if (parseInt(pathMatch[1]) === jsonOrder) {
            logger.debug(`    ✅ Reward ${reward.name} matched by path: ${reward.path} (order ${pathMatch[1]})`);
            return true;
          }
        }
      }
      
      // Check by filename pattern: key.mp4 (for reward videos)
      if (reward.name && reward.name.toLowerCase() === `${jsonKey}.mp4`) {
        logger.debug(`    ✅ Reward ${reward.name} matched by filename: ${reward.name}`);
        return true;
      }
      
      // Check by key and order if reward has order
      if (reward.key === jsonKey && reward.order === jsonOrder) {
        logger.debug(`    ✅ Reward ${reward.name} matched by key/order: ${reward.key}_${reward.order}`);
        return true;
      }
      
      logger.debug(`    ❌ No match for reward: ${reward.name}`);
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

    logger.debug(`🔍 Checking voices for ${json.name} (${jsonKey}_${jsonOrder}):`, matchingVoices.map(v => v.name));
    
    matchingVoices.forEach(voice => {
      const voiceName = voice.name.toLowerCase();
      logger.debug(`🎵 Processing voice: ${voice.name} (${voiceName})`);
      
      // EXACT filename matching - no partial matches allowed
      if (voiceName === 'voice_title.mp3') {
        voiceTypes.intro = true;
        logger.debug(`  ✅ Matched intro (exact match)`);
      } else if (voiceName === 'voice_q1_title.mp3') {
        voiceTypes.quiz1_question = true;
        logger.debug(`  ✅ Matched quiz1_question (exact match)`);
      } else if (voiceName === 'voice_q1_ans.mp3') {
        voiceTypes.quiz1_answer = true;
        logger.debug(`  ✅ Matched quiz1_answer (exact match)`);
      } else if (voiceName === 'voice_q2_title.mp3') {
        voiceTypes.quiz2_question = true;
        logger.debug(`  ✅ Matched quiz2_question (exact match)`);
      } else if (voiceName === 'voice_q2_ans.mp3') {
        voiceTypes.quiz2_answer = true;
        logger.debug(`  ✅ Matched quiz2_answer (exact match)`);
      } else if (voiceName === 'voice_q3_title.mp3') {
        voiceTypes.quiz3_question = true;
        logger.debug(`  ✅ Matched quiz3_question (exact match)`);
      } else if (voiceName === 'voice_q3_ans.mp3') {
        voiceTypes.quiz3_answer = true;
        logger.debug(`  ✅ Matched quiz3_answer (exact match)`);
      } else if (voiceName === 'voice_lesson.mp3') {
        voiceTypes.lesson = true;
        logger.debug(`  ✅ Matched lesson (exact match)`);
      } else if (voiceName === 'voice_reward.mp3') {
        voiceTypes.reward = true;
        logger.debug(`  ✅ Matched reward (exact match)`);
      } else {
        logger.debug(`  ❌ No exact match for voice: ${voice.name} (expected exact filename)`);
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

    logger.debug(`📊 Voice types status for ${json.name}:`, voiceTypes);
    logger.debug(`❌ Missing voices for ${json.name}:`, missingVoices);

    const hasAllVoices = missingVoices.length === 0;
    const hasReward = !!matchingReward;

    // Check quiz 3 image options using pre-loaded JSON content
    const normalizedPath = json.path.replace(/\\/g, '/');
    const jsonOptions = jsonOptionsMap.get(normalizedPath) || [];
    logger.debug(`🔍 Looking for options for ${json.name} at path: ${normalizedPath}`);
    logger.debug(`📋 Found options:`, jsonOptions);
    logger.debug(`🔑 JSON key: ${json.key}, order: ${json.order}`);
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

export const getValidOptionsForAvailableImages = (jsonAsset: Asset, allImages: Asset[], jsonOptions: string[]) => {
  logger.debug('🔧 getValidOptionsForAvailableImages called for:', jsonAsset.name);
  
  // Get available images in options folder
  const availableOptionImages = allImages.filter(img => 
    img.type === 'image' && img.path.includes('options')
  );
  
  logger.debug('📸 Available option images:', availableOptionImages.map(img => img.name));
  
  // Get the base names of available images (without extension)
  const availableOptions = availableOptionImages.map(img => 
    img.name.replace(/\.(jpg|jpeg|png|gif|bmp)$/i, '').toLowerCase()
  );
  
  logger.debug('📋 Available options (base names):', availableOptions);
  
  // Filter JSON options to only include those that have corresponding images
  const validOptions = jsonOptions.filter(option => 
    availableOptions.includes(option.toLowerCase())
  );
  
  logger.debug('✅ Valid options (with images):', validOptions);
  logger.debug('❌ Invalid options (no images):', jsonOptions.filter(option => 
    !availableOptions.includes(option.toLowerCase())
  ));
  
  // Return the original options but mark which ones are valid
  return {
    originalOptions: jsonOptions,
    validOptions: validOptions,
    hasMismatch: validOptions.length !== jsonOptions.length
  };
};

// Helper function to get the earliest JSON creation date for a group
export const getEarliestJsonDate = (group: AssetGroup): Date | null => {
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
export const formatDate = (date: Date | null): string => {
  if (!date) return 'No date';
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to get upload key for state management
export const getUploadKey = (groupKey: string, resourceType: MissingResource['type'], jsonOrder?: number, imageName?: string) => {
  return `${groupKey}-${resourceType}${jsonOrder ? `-${jsonOrder}` : ''}${imageName ? `-${imageName}` : ''}`;
};

export const getSelectionKey = (resource: CrawlerResource, type: ResourceType, target: ResourceTarget, optionName?: string) => {
  return `${resource.path}_${type}_${target}${optionName ? `_${optionName}` : ''}`;
};

export const checkQuiz3ImageOptions = (jsonAsset: Asset, allImages: Asset[], jsonOptions: string[] = []) => {
  logger.debug('🔧 checkQuiz3ImageOptions called for:', jsonAsset.name, 'with options:', jsonOptions);
  logger.debug('🔍 Available images in options folder:', allImages.filter(img => img.path.includes('options')).map(img => img.name));
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
        logger.debug(`✅ Found image for option "${option}": ${optionImage.name}`);
      } else {
        missingImages.push(option);
        logger.debug(`❌ Missing image for option "${option}"`);
      }
    });

    const hasAllImages = missingImages.length === 0;
    const completionRate = options.length > 0 ? (availableImages.length / options.length) * 100 : 0;

    logger.debug(`📊 Quiz 3 image options summary for ${jsonAsset.name}:`);
    logger.debug(`  Available: ${availableImages.length}/${options.length}`);
    logger.debug(`  Missing: ${missingImages.length}`);
    logger.debug(`  Available images:`, availableImages);
    logger.debug(`  Missing images:`, missingImages);

    return {
      options,
      availableImages,
      missingImages,
      hasAllImages,
      completionRate
    };
  } catch (error) {
    logger.error('Error checking quiz 3 image options:', error);
    return {
      options: [],
      availableImages: [],
      missingImages: [],
      hasAllImages: false,
      completionRate: 0
    };
  }
};

export const getRenderStatusDisplay = (renderStatus: AssetGroup['renderStatus']) => {
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
