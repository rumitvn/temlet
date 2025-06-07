import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { UpdateRenderItemDto } from "@/app/types/render";

// GET /api/renders/[id] - Get a single render item
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const item = await prisma.renderItem.findUnique({
            where: { id }
        });

        if (!item) {
            return NextResponse.json(
                { error: 'Render item not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(item);
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
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const body: UpdateRenderItemDto = await req.json();
        
        const item = await prisma.renderItem.update({
            where: { id },
            data: {
                ...body,
                youtubeMetadata: body.youtubeMetadata ? body.youtubeMetadata : undefined
            }
        });

        return NextResponse.json(item);
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
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        await prisma.renderItem.delete({
            where: { id }
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