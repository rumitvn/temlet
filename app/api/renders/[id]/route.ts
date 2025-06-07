import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

// GET /api/renders/[id] - Get a single render item
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const renderItem = await prisma.renderItem.findUnique({
            where: { id: params.id }
        });

        if (!renderItem) {
            return NextResponse.json(
                { error: 'Render item not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(renderItem);
    } catch (error) {
        console.error('Error fetching render item:', error);
        return NextResponse.json(
            { error: 'Failed to fetch render item' },
            { status: 500 }
        );
    }
}

// PATCH /api/renders/[id] - Update a render item
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await req.json();
        const {
            fileName,
            type,
            topic,
            status,
            metadata,
            outputPath,
            youtubeUrl,
            error,
            processingTime,
            fileSize,
            resolution,
            duration,
            format,
            codec,
            bitrate,
            fps,
            audioCodec,
            audioBitrate,
            audioChannels,
            audioSampleRate,
            tags,
            description,
            title,
            thumbnailUrl,
            customFields
        } = body;

        const renderItem = await prisma.renderItem.update({
            where: { id: params.id },
            data: {
                ...(fileName && { fileName }),
                ...(type && { type }),
                ...(topic && { topic }),
                ...(status && { status }),
                ...(metadata && { metadata }),
                ...(outputPath && { outputPath }),
                ...(youtubeUrl && { youtubeUrl }),
                ...(error && { error }),
                ...(processingTime && { processingTime }),
                ...(fileSize && { fileSize }),
                ...(resolution && { resolution }),
                ...(duration && { duration }),
                ...(format && { format }),
                ...(codec && { codec }),
                ...(bitrate && { bitrate }),
                ...(fps && { fps }),
                ...(audioCodec && { audioCodec }),
                ...(audioBitrate && { audioBitrate }),
                ...(audioChannels && { audioChannels }),
                ...(audioSampleRate && { audioSampleRate }),
                ...(tags && { tags }),
                ...(description && { description }),
                ...(title && { title }),
                ...(thumbnailUrl && { thumbnailUrl }),
                ...(customFields && { customFields })
            }
        });

        return NextResponse.json(renderItem);
    } catch (error) {
        console.error('Error updating render item:', error);
        return NextResponse.json(
            { error: 'Failed to update render item' },
            { status: 500 }
        );
    }
}

// DELETE /api/renders/[id] - Delete a render item
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.renderItem.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting render item:', error);
        return NextResponse.json(
            { error: 'Failed to delete render item' },
            { status: 500 }
        );
    }
} 