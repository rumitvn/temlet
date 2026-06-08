import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { config } from "../../../../lib/config";
import { getFileStats, getFileType } from "@/app/lib/file-utils";
import { logger } from "@/app/lib/logger";

interface Asset {
  id: string;
  name: string;
  type: 'voice' | 'image' | 'video' | 'json';
  category: string;
  path: string;
  size?: number;
  lastModified?: Date;
  status: 'available' | 'missing' | 'processing';
  key?: string;
  order?: number;
  rendered?: boolean; // Whether this asset has been rendered
}

interface AssetGroup {
  key: string;
  name: string;
  assets: {
    image?: Asset;
    videos: Asset[];
    voices: Asset[];
    jsons: Asset[];
    rewards: Asset[];
  };
  renderStatus: {
    hasJson: boolean;
    hasImage: boolean;
    hasVideos: boolean;
    hasVoices: boolean;
    isComplete: boolean;
    requiredVoices: number;
    availableVoices: number;
    requiredRewards: number;
    availableRewards: number;
    jsonOrders: number[];
    hasQuiz3Images: boolean;
    requiredQuiz3Images: number;
    availableQuiz3Images: number;
  };
}

// Helper function to check if a JSON file has been rendered
async function checkIfRendered(jsonAsset: Asset, outputFolderPath: string): Promise<boolean> {
  try {
    // Extract key and order from JSON filename (e.g., "alligator_4.json" -> key="alligator", order=4)
    const { key, order } = extractKeyAndOrder(jsonAsset.name, 'json');
    if (!key || !order) return false;
    
    // Check for rendered output file in the output folder
    // The rendered file would be named like "alligator_4.mp4" in the output folder
    const renderedFileName = `${key}_${order}.mp4`;
    const renderedFilePath = path.join(outputFolderPath, renderedFileName);
    
    const stats = await fs.stat(renderedFilePath);
    return stats.isFile();
  } catch (error) {
    // File doesn't exist or other error
    return false;
  }
}

// Helper function to extract key and order from filename
function extractKeyAndOrder(filename: string, type: string, filePath?: string): { key: string; order?: number } {
  if (type === 'json') {
    // Extract from format like "bear_1.json" or "blue_tang_1.json"
    const match = filename.match(/^(.+?)_(\d+)\.json$/);
    if (match) {
      const key = match[1];
      const order = parseInt(match[2]);
      return { key, order };
    }
  } else if (type === 'voice') {
    // For voice files, extract the key from the directory path
    // Voice files are in directories like "voice/buoyancy_1/voice_lesson.mp3"
    if (filePath) {
      // Extract the directory name from the path - handle both Windows and Unix separators
      const pathParts = filePath.split(/[\/\\]/); // Split by both forward and backward slashes
      const voiceDirIndex = pathParts.findIndex(part => part === 'voice');
      if (voiceDirIndex !== -1 && voiceDirIndex + 1 < pathParts.length) {
        const dirName = pathParts[voiceDirIndex + 1]; // This should be "buoyancy_1"
        const dirMatch = dirName.match(/^(.+?)_(\d+)$/);
        if (dirMatch) {
          const key = dirMatch[1];
          const order = parseInt(dirMatch[2]);
          return { key, order };
        }
      }
    }
    
    // Fallback: extract from filename if path method fails
    const match = filename.match(/voice_(.+?)\.mp3/);
    if (match) {
      return { key: 'voice_' + match[1] };
    }
  } else if (type === 'video' && filePath && filePath.includes('reward')) {
    // For reward videos, extract key from the filename and order from the path
    // Path format: reward/output/reward_1/hamster.mp4
    const pathMatch = filePath.match(/reward[\/\\]output[\/\\]reward_(\d+)[\/\\]([^\/\\]+)\.mp4$/);
    if (pathMatch) {
      const order = parseInt(pathMatch[1]);
      const key = pathMatch[2]; // The filename without extension is the key
      return { key, order };
    }
    
    // Fallback for reward videos without proper path structure
    const filenameMatch = filename.match(/^(.+?)\.mp4$/);
    if (filenameMatch) {
      const key = filenameMatch[1];
      return { key };
    }
  } else if (type === 'image' || type === 'video') {
    // Extract from format like "alligator_1.jpg", "alligator_2.mp4", "bear_1.png"
    // This matches the new structure where images and videos include order numbers
    const match = filename.match(/^(.+?)_(\d+)\.(jpg|mp4|png|gif)$/);
    if (match) {
      const key = match[1];
      const order = parseInt(match[2]);
      return { key, order };
    }
    
    // Fallback for files without order numbers
    const fallbackMatch = filename.match(/^(.+?)\.(jpg|mp4|png|gif)$/);
    if (fallbackMatch) {
      return { key: fallbackMatch[1] };
    }
  }
  return { key: filename.split('.')[0] };
}

// Helper function to load JSON content and extract quiz 3 options
async function loadJSONContent(jsonPath: string): Promise<string[]> {
  try {
    const content = await fs.readFile(jsonPath, 'utf-8');
    const jsonData = JSON.parse(content);
    return jsonData.quiz_3?.options || [];
  } catch (error) {
    logger.error(`Error loading JSON content from ${jsonPath}:`, error);
    return [];
  }
}

// Helper function to check quiz 3 image options
function checkQuiz3ImageOptions(jsonAsset: Asset, allImages: Asset[], jsonOptions: string[] = []) {
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
      } else {
        missingImages.push(option);
      }
    });

    const hasAllImages = missingImages.length === 0;
    const completionRate = options.length > 0 ? (availableImages.length / options.length) * 100 : 0;

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
}

// Helper function to scan directory recursively
async function scanDirectory(dirPath: string, category: string): Promise<Asset[]> {
  const assets: Asset[] = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subAssets = await scanDirectory(fullPath, category);
        assets.push(...subAssets);
      } else if (entry.isFile()) {
        // Determine file type based on extension
        const type = getFileType(entry.name);
        if (type === 'other') {
          continue; // Skip non-asset files
        }

        const stats = await getFileStats(fullPath);
        const { key, order } = extractKeyAndOrder(entry.name, type, fullPath);
        
        assets.push({
          id: `${category}_${entry.name}_${Date.now()}`,
          name: entry.name,
          type,
          category,
          path: fullPath,
          size: stats.size,
          lastModified: stats.lastModified,
          status: stats.exists ? 'available' : 'missing',
          key,
          order
        });
      }
    }
  } catch (error) {
    logger.error(`Error scanning directory ${dirPath}:`, error);
  }
  
  return assets;
}

// GET /api/assets/renderable - Get renderable assets for a channel and topic
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get('channel');
    const topic = searchParams.get('topic');
    const outputFolder = searchParams.get('outputFolder'); // Optional output folder to check render status
    
    if (!channel || !topic) {
      return NextResponse.json(
        { error: 'Channel and topic are required' },
        { status: 400 }
      );
    }

    // Get asset paths for the specified channel and topic
    const assetPaths = config.getAssetPaths(channel, topic);
    
    // Scan all asset directories
    const [jsonAssets, voiceAssets, imageAssets, videoAssets] = await Promise.all([
      scanDirectory(assetPaths.json, 'json'),
      scanDirectory(assetPaths.voice, 'voice'),
      scanDirectory(assetPaths.image, 'image'),
      scanDirectory(assetPaths.video, 'video')
    ]);

    // Group assets by key first
    const groupedAssets: { [key: string]: AssetGroup } = {};
    
    // Process JSON assets first to establish groups
    for (const jsonAsset of jsonAssets) {
      if (jsonAsset.key && jsonAsset.order) {
        const key = jsonAsset.key;
        if (!groupedAssets[key]) {
          groupedAssets[key] = {
            key,
            name: key.charAt(0).toUpperCase() + key.slice(1),
            assets: {
              image: undefined,
              videos: [],
              voices: [],
              jsons: [],
              rewards: []
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
              jsonOrders: [],
              hasQuiz3Images: false,
              requiredQuiz3Images: 0,
              availableQuiz3Images: 0
            }
          };
        }
        
        // Check if this JSON has been rendered
        if (outputFolder) {
          jsonAsset.rendered = await checkIfRendered(jsonAsset, outputFolder);
        } else {
          jsonAsset.rendered = false;
        }
        
        groupedAssets[key].assets.jsons.push(jsonAsset);
        groupedAssets[key].renderStatus.jsonOrders.push(jsonAsset.order);
      }
    }

    // Now scan rewards specifically for each group
    const rewardAssets: Asset[] = [];
    for (const group of Object.values(groupedAssets)) {
      for (const jsonAsset of group.assets.jsons) {
        // Look for reward file: reward/output/reward_order/key.mp4
        const rewardPath = path.join(assetPaths.reward, 'output', `reward_${jsonAsset.order}`, `${group.key}.mp4`);
        try {
          const stats = await fs.stat(rewardPath);
          if (stats.isFile()) {
            rewardAssets.push({
              id: `reward_${group.key}_${jsonAsset.order}_${Date.now()}`,
              name: `${group.key}.mp4`,
              type: 'video',
              category: 'reward',
              path: rewardPath,
              size: stats.size,
              lastModified: stats.mtime,
              status: 'available',
              key: group.key,
              order: jsonAsset.order
            });
          }
        } catch (error) {
          // Reward file doesn't exist, which is fine
        }
      }
    }

    logger.debug(`Found ${rewardAssets.length} reward assets:`);
    rewardAssets.forEach(reward => {
      logger.debug(`  - ${reward.name}: ${reward.path}`);
    });



    // Process other asset types
    voiceAssets.forEach(voiceAsset => {
      // Find the matching JSON group for this voice
      let matchedGroup = null;
      
      // First try matching by key and order
      if (voiceAsset.key && voiceAsset.order && groupedAssets[voiceAsset.key]) {
        const group = groupedAssets[voiceAsset.key];
        // Check if this group has a JSON with the same order
        const hasMatchingJson = group.assets.jsons.some(json => json.order === voiceAsset.order);
        if (hasMatchingJson) {
          matchedGroup = group;
        }
      }
      
      // If no match by key/order, try matching by path structure
      if (!matchedGroup && voiceAsset.path) {
        const pathMatch = voiceAsset.path.match(/voice[\/\\]([^\/\\]+)_(\d+)[\/\\]/);
        if (pathMatch) {
          const key = pathMatch[1];
          const order = parseInt(pathMatch[2]);
          if (groupedAssets[key]) {
            const group = groupedAssets[key];
            const hasMatchingJson = group.assets.jsons.some(json => json.order === order);
            if (hasMatchingJson) {
              matchedGroup = group;
            }
          }
        }
      }
      
      if (matchedGroup) {
        matchedGroup.assets.voices.push(voiceAsset);
      }
    });

    imageAssets.forEach(imageAsset => {
      if (imageAsset.key && groupedAssets[imageAsset.key]) {
        if (imageAsset.category === 'image' && !groupedAssets[imageAsset.key].assets.image) {
          groupedAssets[imageAsset.key].assets.image = imageAsset;
        }
      }
    });

    videoAssets.forEach(videoAsset => {
      if (videoAsset.key && groupedAssets[videoAsset.key]) {
        groupedAssets[videoAsset.key].assets.videos.push(videoAsset);
      }
    });

    // Add rewards to their respective groups
    rewardAssets.forEach(rewardAsset => {
      if (rewardAsset.key && groupedAssets[rewardAsset.key]) {
        logger.debug(`Adding reward ${rewardAsset.name} to group ${rewardAsset.key}`);
        groupedAssets[rewardAsset.key].assets.rewards.push(rewardAsset);
      }
    });

    // Calculate render status for each group
    for (const group of Object.values(groupedAssets)) {
      // Set basic status flags
      group.renderStatus.hasJson = group.assets.jsons.length > 0;
      group.renderStatus.hasImage = !!group.assets.image;
      group.renderStatus.hasVideos = group.assets.videos.length > 0;
      group.renderStatus.hasVoices = group.assets.voices.length > 0;
      
      // Calculate required and available counts
      group.renderStatus.requiredVoices = group.assets.jsons.length * 9; // 9 voices per JSON
      group.renderStatus.availableVoices = group.assets.voices.length;
      group.renderStatus.requiredRewards = group.assets.jsons.length; // 1 reward per JSON
      group.renderStatus.availableRewards = group.assets.rewards.length;
      
      logger.debug(`Group ${group.key}: ${group.assets.rewards.length} rewards for ${group.assets.jsons.length} JSONs`);
      if (group.assets.rewards.length > 0) {
        group.assets.rewards.forEach(reward => {
          logger.debug(`  - Reward: ${reward.name} (${reward.path})`);
        });
      }
      
      // Calculate quiz 3 image options
      let totalQuiz3Images = 0;
      let totalRequiredQuiz3Images = 0;
      
      for (const jsonAsset of group.assets.jsons) {
        try {
          const jsonOptions = await loadJSONContent(jsonAsset.path);
          const quiz3Status = checkQuiz3ImageOptions(jsonAsset, imageAssets, jsonOptions);
          totalQuiz3Images += quiz3Status.availableImages.length;
          totalRequiredQuiz3Images += quiz3Status.options.length;
        } catch (error) {
          logger.error(`Error processing quiz 3 options for ${jsonAsset.name}:`, error);
        }
      }
      
      group.renderStatus.requiredQuiz3Images = totalRequiredQuiz3Images;
      group.renderStatus.availableQuiz3Images = totalQuiz3Images;
      group.renderStatus.hasQuiz3Images = totalQuiz3Images >= totalRequiredQuiz3Images;
      
      // Check if complete (has all required assets)
      const hasRequiredAssets = group.renderStatus.hasJson && 
                               group.renderStatus.hasImage && 
                               group.renderStatus.hasVideos && 
                               group.renderStatus.availableVoices >= group.renderStatus.requiredVoices &&
                               group.renderStatus.availableRewards >= group.renderStatus.requiredRewards &&
                               group.renderStatus.hasQuiz3Images;
      group.renderStatus.isComplete = hasRequiredAssets;
    }

    // Filter to only include complete groups
    const renderableGroups = Object.values(groupedAssets).filter(group => group.renderStatus.isComplete);

    return NextResponse.json({
      groups: renderableGroups,
      totalGroups: renderableGroups.length,
      channel,
      topic
    });

  } catch (error) {
    logger.error('Error fetching renderable assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch renderable assets' },
      { status: 500 }
    );
  }
} 