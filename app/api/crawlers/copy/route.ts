import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sourcePath, 
      key, 
      order, 
      type, 
      target,
      optionName,
      channel,
      topic 
    } = body;

    console.log('Copy request:', {
      sourcePath, 
      key, 
      order, 
      type, 
      target,
      optionName,
      channel,
      topic
    });

    if (!sourcePath || !key || !type || !channel || !topic) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get asset paths using config
    const assetPaths = config.getAssetPaths(channel, topic);
    
    // Determine target directory based on type and target
    let targetDir: string;
    let targetFilename: string;

    if (type === 'image') {
      targetDir = assetPaths.image;
      targetFilename = order ? `${key}_${order}${path.extname(sourcePath)}` : `${key}${path.extname(sourcePath)}`;
    } else if (type === 'video') {
      targetDir = assetPaths.video;
      targetFilename = order ? `${key}_${order}${path.extname(sourcePath)}` : `${key}${path.extname(sourcePath)}`;
    } else if (type === 'quiz3-image') {
      // For quiz3 images, we need to put them in the options subdirectory
      targetDir = path.join(assetPaths.image, 'options');
      
      // The filename should just be the option name
      // For example: rabbit.jpg
      if (!optionName) {
        return NextResponse.json({ error: 'Missing option name for quiz3 image' }, { status: 400 });
      }
      
      targetFilename = `${optionName}${path.extname(sourcePath)}`;
    } else {
      return NextResponse.json({ error: 'Invalid resource type' }, { status: 400 });
    }

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, targetFilename);

    console.log('Copying file:', {
      from: sourcePath,
      to: targetPath,
      directory: targetDir,
      filename: targetFilename
    });

    // Copy the file
    fs.copyFileSync(sourcePath, targetPath);

    return NextResponse.json({ 
      success: true,
      targetPath,
      filename: targetFilename
    });

  } catch (error) {
    console.error('Error copying resource:', error);
    return NextResponse.json({ error: 'Failed to copy resource' }, { status: 500 });
  }
} 