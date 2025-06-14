import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { generateAssets } from "@/app/services/render";

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
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    console.log('Starting render for item:', id);

    // Get the render item
    const renderItem = await prisma.renderItem.findUnique({
      where: { id }
    });

    if (!renderItem) {
      console.error('Render item not found:', id);
      return NextResponse.json(
        { error: "Render item not found" },
        { status: 404 }
      );
    }

    console.log('Found render item:', {
      id: renderItem.id,
      fileName: renderItem.fileName,
      templateAeUrl: renderItem.templateAeUrl,
      templateAeComposition: renderItem.templateAeComposition,
      renderOutputFolder: renderItem.renderOutputFolder
    });

    // Generate assets
    const assets = generateAssets(renderItem);

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

    // console.log('Sending request to Nexrender:', JSON.stringify(requestBody, null, 2));

    const response = await fetch("http://localhost:3000/api/v1/jobs", {
      method: "POST",
      headers: {
        "nexrender-secret": "myapisecret",
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nexrender API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to create Nexrender job: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const jobData = await response.json();
    // console.log('Nexrender job created:', jobData);

    // Update render item with job UID and status
    console.log('Updating render item with job UID:', jobData.uid);
    await prisma.renderItem.update({
      where: { id },
      data: {
        nexrenderUid: jobData.uid,
        status: "pending_render",
      },
    });

    console.log('Render process completed successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in render process:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start render" },
      { status: 500 }
    );
  }
} 