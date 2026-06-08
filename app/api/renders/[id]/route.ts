import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

// GET /api/renders/[id] - Get a single render item
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const renderItem = await prisma.renderItem.findUnique({
            where: { id }
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
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const {
            fileName,
            type,
            topic,
            channelName,
            channelId,
            templateAeUrl,
            templateAeComposition,
            templateAeRenderFormat,
            templateAeAssets,
            autoRender,
            autoCreateMetadata,
            autoUpload,
            uploadScheduleStart,
            uploadFromHour,
            uploadToHour,
            videosPerDay,
            youtubeMetadata,
            status,
            renderTime,
            metadataTime,
            uploadTime,
            youtubeLink,
        } = body;

        const renderItem = await prisma.renderItem.update({
            where: { id },
            data: {
                ...(fileName && { fileName }),
                ...(type && { type }),
                ...(topic && { topic }),
                ...(channelName && { channelName }),
                ...(channelId && { channelId }),
                ...(templateAeUrl && { templateAeUrl }),
                ...(templateAeComposition && { templateAeComposition }),
                ...(templateAeRenderFormat && { templateAeRenderFormat }),
                ...(templateAeAssets && { templateAeAssets }),
                ...(autoRender !== undefined && { autoRender }),
                ...(autoCreateMetadata !== undefined && { autoCreateMetadata }),
                ...(autoUpload !== undefined && { autoUpload }),
                ...(uploadScheduleStart && { uploadScheduleStart }),
                ...(uploadFromHour !== undefined && { uploadFromHour }),
                ...(uploadToHour !== undefined && { uploadToHour }),
                ...(videosPerDay !== undefined && { videosPerDay }),
                ...(youtubeMetadata && { youtubeMetadata }),
                ...(status && { status }),
                ...(renderTime !== undefined && { renderTime }),
                ...(metadataTime !== undefined && { metadataTime }),
                ...(uploadTime !== undefined && { uploadTime }),
                ...(youtubeLink && { youtubeLink }),
            },
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
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.renderItem.delete({
            where: { id },
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