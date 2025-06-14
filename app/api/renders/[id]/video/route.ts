import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import fs from 'fs';
import path from 'path';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        
        const renderItem = await prisma.renderItem.findUnique({
            where: { id }
        });

        if (!renderItem) {
            return NextResponse.json(
                { error: 'Render item not found' },
                { status: 404 }
            );
        }

        if (!renderItem.renderOutputFolder) {
            return NextResponse.json(
                { error: 'Render output folder not set' },
                { status: 400 }
            );
        }

        const videoPath = path.join(renderItem.renderOutputFolder, `${renderItem.fileName}.mp4`);

        // Check if file exists
        if (!fs.existsSync(videoPath)) {
            return NextResponse.json(
                { error: 'Video file not found' },
                { status: 404 }
            );
        }

        // Read the file
        const videoBuffer = fs.readFileSync(videoPath);

        // Return the video file with appropriate headers
        return new NextResponse(videoBuffer, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `inline; filename="${renderItem.fileName}.mp4"`,
            },
        });
    } catch (error) {
        console.error('Error serving video file:', error);
        return NextResponse.json(
            { error: 'Failed to serve video file' },
            { status: 500 }
        );
    }
} 