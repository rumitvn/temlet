import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { logger } from "@/app/lib/logger";

// GET /api/output-folders - List all output folders
export async function GET() {
    try {
        const outputFolders = await prisma.outputFolder.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(outputFolders);
    } catch (error) {
        logger.error('Error listing output folders:', error);
        return NextResponse.json(
            { error: 'Failed to list output folders' },
            { status: 500 }
        );
    }
}

// POST /api/output-folders - Save a new output folder
export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            return NextResponse.json(
                { error: 'Content-Type must be application/json' },
                { status: 400 }
            );
        }
        const body = await req.json();
        const { path } = body;
        if (!path) {
            return NextResponse.json(
                { error: 'No path provided' },
                { status: 400 }
            );
        }
        // Save the output folder info to the database
        const outputFolder = await prisma.outputFolder.create({
            data: {
                name: path.split(/[\\/]/).pop() || path,
                path,
                type: 'custom'
            }
        });
        return NextResponse.json(outputFolder);
    } catch (error) {
        logger.error('Error saving output folder:', error);
        return NextResponse.json(
            { error: 'Failed to save output folder' },
            { status: 500 }
        );
    }
}

// DELETE /api/output-folders?id=<id> - Delete an output folder
export async function DELETE(req: NextRequest) {
    try {
        const id = req.nextUrl.searchParams.get('id');
        if (!id) {
            return NextResponse.json(
                { error: 'Output folder ID is required' },
                { status: 400 }
            );
        }

        // Get output folder info before deleting
        const outputFolder = await prisma.outputFolder.findUnique({
            where: { id }
        });

        if (!outputFolder) {
            return NextResponse.json(
                { error: 'Output folder not found' },
                { status: 404 }
            );
        }

        // Delete from database
        await prisma.outputFolder.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Error deleting output folder:', error);
        return NextResponse.json(
            { error: 'Failed to delete output folder' },
            { status: 500 }
        );
    }
} 