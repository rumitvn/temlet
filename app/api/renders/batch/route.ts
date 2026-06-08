import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/app/lib/logger";

// DELETE /api/renders/batch - Delete multiple render items
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: 'No render item IDs provided' },
                { status: 400 }
            );
        }

        // Delete all items in a transaction
        await prisma.$transaction(
            ids.map(id => 
                prisma.renderItem.delete({
                    where: { id }
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Error deleting render items:', error);
        return NextResponse.json(
            { error: 'Failed to delete render items' },
            { status: 500 }
        );
    }
}

// POST /api/renders/batch - Perform batch actions (render, metadata, upload)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { ids, action } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: 'No render item IDs provided' },
                { status: 400 }
            );
        }

        if (!action) {
            return NextResponse.json(
                { error: 'No action specified' },
                { status: 400 }
            );
        }

        // Update all items in a transaction
        await prisma.$transaction(
            ids.map(id => {
                let status = 'new';
                switch (action) {
                    case 'render':
                        status = 'pending_render';
                        break;
                    case 'metadata':
                        status = 'pending_metadata';
                        break;
                    case 'upload':
                        status = 'pending_upload';
                        break;
                    default:
                        throw new Error(`Invalid action: ${action}`);
                }

                return prisma.renderItem.update({
                    where: { id },
                    data: { status }
                });
            })
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Error performing batch action:', error);
        return NextResponse.json(
            { error: 'Failed to perform batch action' },
            { status: 500 }
        );
    }
} 