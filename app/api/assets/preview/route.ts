import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { config } from "../../../../lib/config";

// Default channel and topic - can be made configurable via API parameters
const DEFAULT_CHANNEL = "minimate";
const DEFAULT_TOPIC = "animals";

// Base paths for different asset types - using centralized config
const getAssetPaths = () => config.getAssetPaths(DEFAULT_CHANNEL, DEFAULT_TOPIC);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');
    const channel = searchParams.get('channel') || DEFAULT_CHANNEL;
    const topic = searchParams.get('topic') || DEFAULT_TOPIC;
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Decode the URL-encoded path
    const decodedPath = decodeURIComponent(filePath);
    
    console.log('Preview API - Original path:', filePath);
    console.log('Preview API - Decoded path:', decodedPath);

    // Validate the path is within the allowed directories using same logic as main API
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

    console.log('Preview API - Allowed paths:', allowedPaths);

    // Also create backslash versions for Windows paths
    const allowedPathsBackslash = allowedPaths.map(path => path.replace(/\//g, '\\'));

    // Check if path starts with any allowed directory (including subdirectories)
    const isAllowed = allowedPaths.some(allowedPath => 
      decodedPath.startsWith(allowedPath)
    ) || allowedPathsBackslash.some(allowedPath => 
      decodedPath.startsWith(allowedPath)
    );

    if (!isAllowed) {
      console.log('Preview API - Access denied for path:', decodedPath);
      console.log('Preview API - Allowed paths:', allowedPaths);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if file exists
    try {
      await fs.access(decodedPath);
    } catch (error) {
      console.log('Preview API - File not found:', decodedPath);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read file content
    const fileContent = await fs.readFile(decodedPath);
    const ext = path.extname(decodedPath).toLowerCase();
    
    console.log('Preview API - File content preview (first 200 chars):', fileContent.toString().substring(0, 200));
    console.log('Preview API - File extension:', ext);
    console.log('Preview API - File size:', fileContent.length);

    // Determine content type
    let contentType = 'application/octet-stream';
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) {
      contentType = `image/${ext.slice(1)}`;
    } else if (['.mp4', '.avi', '.mov'].includes(ext)) {
      contentType = `video/${ext.slice(1)}`;
    } else if (['.mp3', '.wav', '.aac'].includes(ext)) {
      contentType = `audio/${ext.slice(1)}`;
    } else if (ext === '.json') {
      contentType = 'application/json';
    }

    // Return file with appropriate headers
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Preview API - Error serving file:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
} 