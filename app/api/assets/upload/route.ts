import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { config } from "../../../../lib/config";
import { logger } from "@/app/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const groupKey = formData.get('groupKey') as string;
    const resourceType = formData.get('resourceType') as string;
    const channel = formData.get('channel') as string;
    const topic = formData.get('topic') as string;
    const jsonOrder = formData.get('jsonOrder') as string;
    const imageName = formData.get('imageName') as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    if (!groupKey || !resourceType || !channel || !topic) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get asset paths for the specified channel and topic
    const assetPaths = config.getAssetPaths(channel, topic);
    let uploadPath = '';
    let fileName = '';

    // Determine upload path and filename based on resource type
    switch (resourceType) {
      case 'image':
        if (!jsonOrder) {
          return NextResponse.json(
            { error: 'JSON order is required for image uploads' },
            { status: 400 }
          );
        }
        uploadPath = assetPaths.image;
        fileName = `${groupKey}_${jsonOrder}.jpg`; // Include order number in filename
        break;
      
      case 'video':
        if (!jsonOrder) {
          return NextResponse.json(
            { error: 'JSON order is required for video uploads' },
            { status: 400 }
          );
        }
        uploadPath = assetPaths.video;
        fileName = `${groupKey}_${jsonOrder}.mp4`; // Include order number in filename
        break;
      
      case 'quiz3-image':
        uploadPath = path.join(assetPaths.image, 'options');
        // For quiz3 images, use the specific image name if provided, otherwise use original filename
        if (imageName) {
          fileName = `${imageName}.jpg`; // Default to jpg, but will be updated based on actual file
        }
        break;
      
      case 'reward':
        if (!jsonOrder) {
          return NextResponse.json(
            { error: 'JSON order is required for reward uploads' },
            { status: 400 }
          );
        }
        uploadPath = path.join(assetPaths.reward, 'output', `reward_${jsonOrder}`);
        fileName = `${groupKey}.mp4`; // Default to mp4, but will be updated based on actual file
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid resource type' },
          { status: 400 }
        );
    }

    // Ensure upload directory exists
    await fs.mkdir(uploadPath, { recursive: true });

    const uploadedFiles: string[] = [];

    // Process each file
    for (const file of files) {
      // Get file extension
      const fileExtension = path.extname(file.name).toLowerCase();
      
      // Determine final filename
      let finalFileName = fileName;
      if (resourceType === 'quiz3-image') {
        // For quiz3 images, use the specific image name if provided, otherwise use original filename
        if (imageName) {
          finalFileName = `${imageName}${fileExtension}`;
        } else {
          finalFileName = file.name;
        }
      } else if (fileExtension) {
        // For images and videos, use the group key with order number and actual file extension
        if (resourceType === 'image' || resourceType === 'video') {
          finalFileName = `${groupKey}_${jsonOrder}${fileExtension}`;
        } else {
          // For other types, use the group key with the actual file extension
          finalFileName = `${groupKey}${fileExtension}`;
        }
      }

      const filePath = path.join(uploadPath, finalFileName);
      
      // Convert file to buffer and write to disk
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      await fs.writeFile(filePath, buffer);
      uploadedFiles.push(filePath);
      
      logger.debug(`Uploaded ${file.name} to ${filePath}`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      uploadedFiles,
      groupKey,
      resourceType
    });

  } catch (error) {
    logger.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
} 