import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { config } from "../../../../lib/config";

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

// Helper function to get file stats
async function getFileStats(filePath: string) {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      lastModified: stats.mtime,
      exists: true
    };
  } catch (error) {
    return {
      size: 0,
      lastModified: new Date(),
      exists: false
    };
  }
}

// Helper function to extract key and order from filename
function extractKeyAndOrder(filename: string, type: string): { key: string; order?: number } {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
  if (type === 'json') {
    // For JSON files: key_order.json (e.g., bear_1.json)
    const match = nameWithoutExt.match(/^(.+?)_(\d+)$/);
    if (match) {
      return { key: match[1], order: parseInt(match[2]) };
    }
  } else if (type === 'voice') {
    // For voice files: key_voicetype_order.mp3 (e.g., bear_intro_1.mp3)
    const match = nameWithoutExt.match(/^(.+?)_(.+?)_(\d+)$/);
    if (match) {
      return { key: match[1], order: parseInt(match[3]) };
    }
  } else if (type === 'image') {
    // For image files: key_order.jpg (e.g., bear_1.jpg)
    const match = nameWithoutExt.match(/^(.+?)_(\d+)$/);
    if (match) {
      return { key: match[1], order: parseInt(match[2]) };
    }
  } else if (type === 'video') {
    // For video files: key_order.mp4 (e.g., bear_1.mp4)
    const match = nameWithoutExt.match(/^(.+?)_(\d+)$/);
    if (match) {
      return { key: match[1], order: parseInt(match[2]) };
    }
  }
  
  return { key: nameWithoutExt };
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
        const ext = path.extname(entry.name).toLowerCase();
        let type: 'voice' | 'image' | 'video' | 'json' = 'json';
        
        if (['.mp3', '.wav', '.aac'].includes(ext)) {
          type = 'voice';
        } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) {
          type = 'image';
        } else if (['.mp4', '.avi', '.mov', '.wmv'].includes(ext)) {
          type = 'video';
        } else if (ext === '.json') {
          type = 'json';
        } else {
          continue; // Skip non-asset files
        }
        
        const stats = await getFileStats(fullPath);
        const { key, order } = extractKeyAndOrder(entry.name, type);
        
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
    console.error(`Error scanning directory ${dirPath}:`, error);
  }
  
  return assets;
}

// GET /api/assets/renderable - Get renderable assets for a channel and topic
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get('channel');
    const topic = searchParams.get('topic');
    
    if (!channel || !topic) {
      return NextResponse.json(
        { error: 'Channel and topic are required' },
        { status: 400 }
      );
    }

    // Get asset paths for the specified channel and topic
    const assetPaths = config.getAssetPaths(channel, topic);
    
    // Scan all asset directories
    const [jsonAssets, voiceAssets, imageAssets, videoAssets, rewardAssets] = await Promise.all([
      scanDirectory(assetPaths.json, 'json'),
      scanDirectory(assetPaths.voice, 'voice'),
      scanDirectory(assetPaths.image, 'image'),
      scanDirectory(assetPaths.video, 'video'),
      scanDirectory(assetPaths.reward, 'reward')
    ]);

    // Group assets by key
    const groupedAssets: { [key: string]: AssetGroup } = {};
    
    // Process JSON assets first to establish groups
    jsonAssets.forEach(jsonAsset => {
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
        groupedAssets[key].assets.jsons.push(jsonAsset);
        groupedAssets[key].renderStatus.jsonOrders.push(jsonAsset.order);
      }
    });

    // Process other asset types
    voiceAssets.forEach(voiceAsset => {
      if (voiceAsset.key && groupedAssets[voiceAsset.key]) {
        groupedAssets[voiceAsset.key].assets.voices.push(voiceAsset);
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

    rewardAssets.forEach(rewardAsset => {
      if (rewardAsset.key && groupedAssets[rewardAsset.key]) {
        groupedAssets[rewardAsset.key].assets.rewards.push(rewardAsset);
      }
    });

    // Calculate render status for each group
    Object.values(groupedAssets).forEach(group => {
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
      group.renderStatus.requiredQuiz3Images = group.assets.jsons.length * 4; // 4 images per JSON
      group.renderStatus.availableQuiz3Images = 0; // Will be calculated based on quiz 3 options
      
      // Check if complete (has all required assets)
      const hasRequiredAssets = group.renderStatus.hasJson && 
                               group.renderStatus.hasImage && 
                               group.renderStatus.hasVideos && 
                               group.renderStatus.availableVoices >= group.renderStatus.requiredVoices &&
                               group.renderStatus.availableRewards >= group.renderStatus.requiredRewards &&
                               group.renderStatus.availableQuiz3Images >= group.renderStatus.requiredQuiz3Images;
      group.renderStatus.isComplete = hasRequiredAssets;
    });

    // Filter to only include complete groups
    const renderableGroups = Object.values(groupedAssets).filter(group => group.renderStatus.isComplete);

    return NextResponse.json({
      groups: renderableGroups,
      totalGroups: renderableGroups.length,
      channel,
      topic
    });

  } catch (error) {
    console.error('Error fetching renderable assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch renderable assets' },
      { status: 500 }
    );
  }
} 