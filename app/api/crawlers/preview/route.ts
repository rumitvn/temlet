import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    // The path should already be absolute from the config utility
    const fullPath = filePath;

    // Security check: ensure the path is within a valid directory
    const { config } = await import('@/lib/config');
    const normalizedPath = path.normalize(fullPath).toLowerCase();
    const normalizedWorkingDir = path.normalize(config.workingDirectory).toLowerCase();
    
    // Allow paths that start with the working directory
    if (!normalizedPath.startsWith(normalizedWorkingDir)) {
      console.log('Path security check failed:', {
        path: normalizedPath,
        workingDir: normalizedWorkingDir
      });
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read file
    const fileBuffer = fs.readFileSync(fullPath);
    
    // Determine content type based on file extension
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext.match(/\.(jpg|jpeg)$/i)) contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.webm') contentType = 'video/webm';
    else if (ext === '.mov') contentType = 'video/quicktime';

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error serving preview file:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
} 