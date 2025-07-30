import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { config } from "../../../lib/config";

// Default channel and topic - can be made configurable via API parameters
const DEFAULT_CHANNEL = "minimate";
const DEFAULT_TOPIC = "animals";

// Base paths for different asset types - using centralized config
const getAssetPaths = () => config.getAssetPaths(DEFAULT_CHANNEL, DEFAULT_TOPIC);

interface Asset {
  id: string;
  name: string;
  type: 'voice' | 'image' | 'video' | 'json' | 'other';
  category: string;
  path: string;
  size?: number;
  lastModified?: Date;
  status: 'available' | 'missing' | 'processing';
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
        let type: 'voice' | 'image' | 'video' | 'json' | 'other' = 'other';
        
        if (['.mp3', '.wav', '.aac'].includes(ext)) {
          type = 'voice';
        } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) {
          type = 'image';
        } else if (['.mp4', '.avi', '.mov', '.wmv'].includes(ext)) {
          type = 'video';
        } else if (ext === '.json') {
          type = 'json';
        }
        
        // Only include files that match expected asset types
        if (type !== 'other') {
          const stats = await getFileStats(fullPath);
          
          assets.push({
            id: `${category}_${entry.name}_${Date.now()}`,
            name: entry.name,
            type,
            category,
            path: fullPath,
            size: stats.size,
            lastModified: stats.lastModified,
            status: stats.exists ? 'available' : 'missing'
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
  }
  
  return assets;
}

// GET /api/assets - List all assets
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const channel = searchParams.get('channel') || DEFAULT_CHANNEL;
    const topic = searchParams.get('topic') || DEFAULT_TOPIC;
    
    let allAssets: Asset[] = [];
    
    // Scan all asset directories or specific category
    const assetPaths = config.getAssetPaths(channel, topic);
    const categoriesToScan = category 
      ? [category] 
      : Object.keys(assetPaths);
    
    for (const cat of categoriesToScan) {
      if (assetPaths[cat as keyof typeof assetPaths]) {
        const assets = await scanDirectory(assetPaths[cat as keyof typeof assetPaths], cat);
        allAssets.push(...assets);
      }
    }
    
    // Filter by search term if provided
    if (search) {
      allAssets = allAssets.filter(asset => 
        asset.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    return NextResponse.json({
      assets: allAssets,
      total: allAssets.length
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

// POST /api/assets - Upload new assets
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const category = formData.get('category') as string;
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }
    
    const assetPaths = getAssetPaths();
    if (!category || !assetPaths[category as keyof typeof assetPaths]) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }
    
    const uploadPath = assetPaths[category as keyof typeof assetPaths];
    const uploadedAssets: Asset[] = [];
    
    for (const file of files) {
      try {
        const fileName = file.name;
        const filePath = path.join(uploadPath, fileName);
        
        // Convert File to Buffer and write to disk
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, buffer);
        
        // Get file stats
        const stats = await getFileStats(filePath);
        
        // Determine file type
        const ext = path.extname(fileName).toLowerCase();
        let type: 'voice' | 'image' | 'video' | 'json' | 'other' = 'other';
        
        if (['.mp3', '.wav', '.aac'].includes(ext)) {
          type = 'voice';
        } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) {
          type = 'image';
        } else if (['.mp4', '.avi', '.mov', '.wmv'].includes(ext)) {
          type = 'video';
        } else if (ext === '.json') {
          type = 'json';
        }
        
        // Only process files that match expected asset types
        if (type !== 'other') {
          uploadedAssets.push({
            id: `${category}_${fileName}_${Date.now()}`,
            name: fileName,
            type,
            category,
            path: filePath,
            size: stats.size,
            lastModified: stats.lastModified,
            status: 'available'
          });
        }
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      uploaded: uploadedAssets,
      count: uploadedAssets.length
    });
  } catch (error) {
    console.error('Error uploading assets:', error);
    return NextResponse.json(
      { error: 'Failed to upload assets' },
      { status: 500 }
    );
  }
}

// DELETE /api/assets - Delete assets
export async function DELETE(req: NextRequest) {
  try {
    const { assetIds, paths } = await req.json();
    
    if (!assetIds || !Array.isArray(assetIds)) {
      return NextResponse.json(
        { error: 'Invalid asset IDs' },
        { status: 400 }
      );
    }
    
    const deletedAssets: string[] = [];
    const failedAssets: string[] = [];
    
    for (let i = 0; i < assetIds.length; i++) {
      const assetId = assetIds[i];
      const filePath = paths ? paths[i] : null;
      
      try {
        if (filePath) {
          // Validate the path is within allowed directories
          const assetPaths = getAssetPaths();
          const allowedPaths = [
            assetPaths.voice,
            assetPaths.image,
            assetPaths.video,
            assetPaths.json,
            assetPaths.reward,
            `${assetPaths.reward}/output`,
            `${assetPaths.reward}/reward_1`,
            `${assetPaths.reward}/reward_2`,
            `${assetPaths.reward}/reward_3`,
            `${assetPaths.reward}/reward_4`,
            `${assetPaths.reward}/reward_5`
          ];
          
          // Also create backslash versions for Windows paths
          const allowedPathsBackslash = allowedPaths.map(path => path.replace(/\//g, '\\'));
          
          // Check if path starts with any allowed directory
          const isAllowed = allowedPaths.some(allowedPath => 
            filePath.startsWith(allowedPath)
          ) || allowedPathsBackslash.some(allowedPath => 
            filePath.startsWith(allowedPath)
          );
          
          if (!isAllowed) {
            console.error(`Access denied for path: ${filePath}`);
            failedAssets.push(assetId);
            continue;
          }
          
          // Check if file exists and delete it
          try {
            await fs.access(filePath);
            await fs.unlink(filePath);
            deletedAssets.push(assetId);
            console.log(`Successfully deleted file: ${filePath}`);
          } catch (error) {
            console.error(`Error deleting file ${filePath}:`, error);
            failedAssets.push(assetId);
          }
        } else {
          // Fallback to just tracking the deletion
          deletedAssets.push(assetId);
        }
      } catch (error) {
        console.error(`Error deleting asset ${assetId}:`, error);
        failedAssets.push(assetId);
      }
    }
    
    return NextResponse.json({
      success: true,
      deleted: deletedAssets,
      failed: failedAssets
    });
  } catch (error) {
    console.error('Error deleting assets:', error);
    return NextResponse.json(
      { error: 'Failed to delete assets' },
      { status: 500 }
    );
  }
} 