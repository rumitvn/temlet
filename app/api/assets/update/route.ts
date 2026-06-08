import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { config } from "../../../../lib/config";
import { logger } from "@/app/lib/logger";

// POST /api/assets/update - Update JSON file content
export async function POST(req: NextRequest) {
  try {
    const { path: filePath, channel, topic, content } = await req.json();
    
    if (!filePath || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: path and content' },
        { status: 400 }
      );
    }

    // Validate that the file path is within the allowed directory structure
    const assetPaths = config.getAssetPaths(channel || 'minimate', topic || 'animals');
    const jsonPath = assetPaths.json;
    
    // Ensure the file path is within the allowed directory
    const normalizedFilePath = path.resolve(filePath);
    const normalizedJsonPath = path.resolve(jsonPath);
    
    if (!normalizedFilePath.startsWith(normalizedJsonPath)) {
      return NextResponse.json(
        { error: 'Access denied: File path is outside allowed directory' },
        { status: 403 }
      );
    }

    // Validate JSON content
    let parsedContent;
    try {
      parsedContent = JSON.parse(JSON.stringify(content));
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON content' },
        { status: 400 }
      );
    }

    // Write the updated content to the file
    const formattedContent = JSON.stringify(parsedContent, null, 2);
    await fs.writeFile(filePath, formattedContent, 'utf8');

    // Get updated file stats
    const stats = await fs.stat(filePath);

    return NextResponse.json({
      success: true,
      message: 'JSON file updated successfully',
      fileName: path.basename(filePath),
      size: stats.size,
      lastModified: stats.mtime
    });

  } catch (error) {
    logger.error('Error updating JSON file:', error);
    return NextResponse.json(
      { error: 'Failed to update JSON file' },
      { status: 500 }
    );
  }
} 