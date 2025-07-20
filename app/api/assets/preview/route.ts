import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Decode the URL-encoded path
    const decodedPath = decodeURIComponent(filePath);
    
    console.log('Original path:', filePath);
    console.log('Decoded path:', decodedPath);

    // Validate the path is within the allowed directories
    const allowedPaths = [
      "C:/Users/youruser/Documents/minimate/animals/voice",
      "C:/Users/youruser/Documents/minimate/animals/image",
      "C:/Users/youruser/Documents/minimate/animals/video",
      "C:/Users/youruser/Documents/minimate/animals/render",
      "C:/Users/youruser/Documents/minimate/animals/reward",
      "C:/Users/youruser/Documents/minimate/animals/reward/output",
      "C:/Users/youruser/Documents/minimate/animals/reward/reward_1",
      "C:/Users/youruser/Documents/minimate/animals/reward/reward_2",
      "C:/Users/youruser/Documents/minimate/animals/reward/reward_3",
      "C:/Users/youruser/Documents/minimate/animals/reward/reward_4",
      "C:/Users/youruser/Documents/minimate/animals/reward/reward_5"
    ];

    // Also create backslash versions for Windows paths
    const allowedPathsBackslash = allowedPaths.map(path => path.replace(/\//g, '\\'));

    // Check if path starts with any allowed directory (including subdirectories)
    const isAllowed = allowedPaths.some(allowedPath => 
      decodedPath.startsWith(allowedPath)
    ) || allowedPathsBackslash.some(allowedPath => 
      decodedPath.startsWith(allowedPath)
    );

    if (!isAllowed) {
      console.log('Access denied for path:', decodedPath);
      console.log('Allowed paths:', allowedPaths);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if file exists
    try {
      await fs.access(decodedPath);
    } catch (error) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read file content
    const fileContent = await fs.readFile(decodedPath);
    const ext = path.extname(decodedPath).toLowerCase();

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
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
} 