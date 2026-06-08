import { NextRequest, NextResponse } from "next/server";
import { NEXRENDER_BASE_URL } from "@/app/lib/constants";
import { prisma } from "@/lib/prisma";
import { generateAssets } from "@/app/services/render";
import { logger } from "@/app/lib/logger";

// Helper function to normalize paths to use forward slashes and add file:// prefix for input files only
const normalizePath = (path: string, isOutputPath: boolean = false): string => {
  // Convert backslashes to forward slashes
  const normalized = path.replace(/\\/g, '/');
  // Add file:// prefix if it's a local file path and not an output path
  if (!isOutputPath && (normalized.startsWith('C:/') || normalized.startsWith('D:/'))) {
    return `file:///${normalized}`;
  }
  return normalized;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    logger.debug('Starting render for item:', id);

    // Get the render item
    const renderItem = await prisma.renderItem.findUnique({
      where: { id }
    });

    if (!renderItem) {
      logger.error('Render item not found:', id);
      return NextResponse.json(
        { error: "Render item not found" },
        { status: 404 }
      );
    }

    logger.debug('Found render item:', {
      id: renderItem.id,
      fileName: renderItem.fileName,
      templateAeUrl: renderItem.templateAeUrl,
      templateAeComposition: renderItem.templateAeComposition,
      renderOutputFolder: renderItem.renderOutputFolder
    });

    // Generate assets using the channel and topic from the render item
    const assets = generateAssets(renderItem, renderItem.channelName, renderItem.topic);

    // Create job in Nexrender
    const requestBody = {
      template: {
        src: normalizePath(renderItem.templateAeUrl),
        composition: renderItem.templateAeComposition,
      },
      assets: assets.map(asset => ({
        ...asset,
        src: asset.src ? normalizePath(asset.src) : asset.src
      })),
      actions: {
        postrender: [
          {
            module: "@nexrender/action-copy",
            output: normalizePath(`${renderItem.renderOutputFolder}/${renderItem.fileName}.mp4`, true),
            useJobId: "true"
          },
        ],
      },
    };

    logger.debug('Sending request to Nexrender:', JSON.stringify(requestBody, null, 2));

    // Check if Nexrender server is accessible first
    try {
      const healthCheck = await fetch(`${NEXRENDER_BASE_URL}/api/v1/jobs`, {
        method: "GET",
        headers: {
          "nexrender-secret": "myapisecret",
        },
      });
      
      if (!healthCheck.ok) {
        throw new Error(`Nexrender server health check failed: ${healthCheck.status} ${healthCheck.statusText}`);
      }
    } catch (healthError) {
      logger.error('Nexrender server not accessible:', healthError);
      return NextResponse.json(
        { error: "Nexrender server is not accessible. Please ensure it's running on localhost:3000" },
        { status: 503 }
      );
    }

    const response = await fetch(`${NEXRENDER_BASE_URL}/api/v1/jobs`, {
      method: "POST",
      headers: {
        "nexrender-secret": "myapisecret",
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Nexrender API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to create Nexrender job: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const jobData = await response.json();
    logger.debug('Nexrender job created:', jobData);

    // Update render item with job UID and status
    logger.debug('Updating render item with job UID:', jobData.uid);
    await prisma.renderItem.update({
      where: { id },
      data: {
        nexrenderUid: jobData.uid,
        status: "pending_render",
      },
    });

    logger.debug('Render process completed successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in render process:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start render" },
      { status: 500 }
    );
  }
} 