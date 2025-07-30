import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { config } from "../../../../lib/config";

// Default channel and topic - can be made configurable via API parameters
const DEFAULT_CHANNEL = "minimate";
const DEFAULT_TOPIC = "animals";

// Base paths for different asset types - using centralized config
const getAssetPaths = () => config.getAssetPaths(DEFAULT_CHANNEL, DEFAULT_TOPIC);

interface JSONContentRequest {
  paths: string[];
  channel?: string;
  topic?: string;
}

interface JSONContentResponse {
  [path: string]: {
    options: string[];
    error?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: JSONContentRequest = await req.json();
    const { paths, channel = DEFAULT_CHANNEL, topic = DEFAULT_TOPIC } = body;
    
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'Paths array is required' }, { status: 400 });
    }

    console.log('JSON Content API - Processing paths:', paths.length);
    console.log('JSON Content API - Channel:', channel, 'Topic:', topic);

    // Validate the paths are within the allowed directories
    const assetPaths = config.getAssetPaths(channel, topic);
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

    const result: JSONContentResponse = {};

    // Process each path in parallel
    await Promise.all(paths.map(async (filePath) => {
      try {
        // Decode the URL-encoded path
        const decodedPath = decodeURIComponent(filePath);
        
        console.log('JSON Content API - Processing path:', decodedPath);

        // Check if path starts with any allowed directory (including subdirectories)
        const isAllowed = allowedPaths.some(allowedPath => 
          decodedPath.startsWith(allowedPath)
        ) || allowedPathsBackslash.some(allowedPath => 
          decodedPath.startsWith(allowedPath)
        );

        if (!isAllowed) {
          console.log('JSON Content API - Access denied for path:', decodedPath);
          result[filePath] = { options: [], error: 'Access denied' };
          return;
        }

        // Check if file exists
        try {
          await fs.access(decodedPath);
        } catch (error) {
          console.log('JSON Content API - File not found:', decodedPath);
          result[filePath] = { options: [], error: 'File not found' };
          return;
        }

        // Read file content
        const fileContent = await fs.readFile(decodedPath, 'utf-8');
        
        // Check if content looks like JSON
        if (fileContent.trim().startsWith('{') || fileContent.trim().startsWith('[')) {
          const jsonData = JSON.parse(fileContent);
          const options = jsonData.quiz_3?.options || [];
          console.log(`JSON Content API - Quiz 3 options for ${path.basename(decodedPath)}:`, options);
          result[filePath] = { options };
        } else {
          console.error(`JSON Content API - Content is not valid JSON for ${path.basename(decodedPath)}`);
          result[filePath] = { options: [], error: 'Invalid JSON format' };
        }

      } catch (error) {
        console.error('JSON Content API - Error processing path:', filePath, error);
        result[filePath] = { options: [], error: 'Processing error' };
      }
    }));

    console.log('JSON Content API - Completed processing', Object.keys(result).length, 'files');
    return NextResponse.json(result);

  } catch (error) {
    console.error('JSON Content API - Error processing request:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
} 