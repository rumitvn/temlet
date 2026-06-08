import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { config } from "../../../../lib/config";
import { logger } from "@/app/lib/logger";

interface SK3QLRContent {
  key: string;
  order: number;
  intro: {
    text: string;
    voice: string;
  };
  quiz_1: {
    question: {
      text: string;
      voice: string;
    };
    options: string[];
    answer: {
      position: number;
      voice: string;
    };
  };
  quiz_2: {
    question: {
      text: string;
      voice: string;
    };
    options: string[];
    answer: {
      position: number;
      voice: string;
    };
  };
  quiz_3: {
    question: {
      text: string;
      voice: string;
    };
    options: string[];
    answer: {
      position: number;
      voice: string;
    };
  };
  lesson: {
    voice: string;
  };
  reward: {
    voice: string;
  };
}

// POST /api/assets/render - Create render file
export async function POST(req: NextRequest) {
  try {
    const { content, channel, topic } = await req.json();
    
    logger.debug('=== RENDER API DEBUG ===');
    logger.debug('Content:', content);
    logger.debug('Channel:', channel);
    logger.debug('Topic:', topic);
    logger.debug('Working Directory:', config.workingDirectory);
    
    if (!content || !channel || !topic) {
      return NextResponse.json(
        { error: 'Missing required fields: content, channel, topic' },
        { status: 400 }
      );
    }

    // Validate content structure
    if (!content.key || !content.order) {
      return NextResponse.json(
        { error: 'Invalid content structure' },
        { status: 400 }
      );
    }

    // Create the render directory path using config
    const renderDir = config.buildAssetPath('render', channel, topic);
    logger.debug('Render Directory:', renderDir);
    
    // Ensure the directory exists
    try {
      await mkdir(renderDir, { recursive: true });
      logger.debug('✅ Directory created/verified:', renderDir);
    } catch (error) {
      logger.error('❌ Error creating directory:', error);
      return NextResponse.json(
        { error: 'Failed to create render directory' },
        { status: 500 }
      );
    }

    // Create the filename
    const fileName = `${content.key}_${content.order}.json`;
    const filePath = path.join(renderDir, fileName);
    logger.debug('File Path:', filePath);

    // Write the content to file
    try {
      await writeFile(filePath, JSON.stringify(content, null, 2), 'utf8');
      logger.debug('✅ File written successfully:', fileName);
    } catch (error) {
      logger.error('❌ Error writing file:', error);
      return NextResponse.json(
        { error: 'Failed to write render file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName: fileName,
      filePath: filePath,
      message: `Render file created successfully: ${fileName}`
    });

  } catch (error) {
    logger.error('❌ Error creating render file:', error);
    return NextResponse.json(
      { error: 'Failed to create render file' },
      { status: 500 }
    );
  }
} 