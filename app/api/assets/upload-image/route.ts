import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { config } from "../../../../lib/config";
import { logger } from "@/app/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const channel = formData.get('channel') as string;
    const topic = formData.get('topic') as string;
    const type = formData.get('type') as string; // 'main' or 'quiz3'
    const key = formData.get('key') as string;
    const order = formData.get('order') as string;
    const imageName = formData.get('imageName') as string;

    if (!imageFile || !channel || !topic) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get asset paths
    const assetPaths = config.getAssetPaths(channel, topic);
    let targetPath: string;
    let fileName: string;

    if (type === 'main') {
      // For main images, save to the main image directory with order number
      targetPath = assetPaths.image;
      fileName = `${key}_${order}.jpg`;
    } else if (type === 'quiz3') {
      // For quiz 3 images, save to the options subdirectory
      targetPath = path.join(assetPaths.image, 'options');
      fileName = `${imageName}.jpg`;
    } else {
      return NextResponse.json(
        { error: 'Invalid image type' },
        { status: 400 }
      );
    }

    // Ensure the target directory exists
    await fs.mkdir(targetPath, { recursive: true });

    // Convert the image file to buffer
    const imageBuffer = await imageFile.arrayBuffer();
    const filePath = path.join(targetPath, fileName);

    // Write the file
    await fs.writeFile(filePath, Buffer.from(imageBuffer));

    // Get file stats
    const stats = await fs.stat(filePath);

    const savedAsset = {
      id: `edited_${Date.now()}`,
      name: fileName,
      type: 'image' as const,
      category: type === 'main' ? 'image' : 'quiz3-image',
      path: filePath,
      size: stats.size,
      lastModified: stats.mtime,
      status: 'available' as const,
      key: type === 'main' ? key : imageName,
      order: type === 'main' ? parseInt(order) : undefined
    };

    return NextResponse.json({
      success: true,
      savedAsset,
      message: 'Image saved successfully'
    });

  } catch (error) {
    logger.error('Error uploading edited image:', error);
    return NextResponse.json(
      { error: 'Failed to upload edited image' },
      { status: 500 }
    );
  }
} 