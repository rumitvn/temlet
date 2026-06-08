import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/app/lib/logger";

// GET /api/render-formats - Get all render formats
export async function GET() {
    try {
        const formats = await prisma.renderFormat.findMany({
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json(formats);
    } catch (error) {
        logger.error('Error fetching render formats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch render formats' },
            { status: 500 }
        );
    }
}

// POST /api/render-formats - Create a new render format
export async function POST(req: NextRequest) {
    try {
        const { name, code } = await req.json();

        if (!name || !code) {
            return NextResponse.json(
                { error: 'Name and code are required' },
                { status: 400 }
            );
        }

        // Check if code already exists
        const existingFormat = await prisma.renderFormat.findUnique({
            where: { code }
        });

        if (existingFormat) {
            return NextResponse.json(
                { error: 'A format with this code already exists' },
                { status: 400 }
            );
        }

        const format = await prisma.renderFormat.create({
            data: {
                name,
                code
            }
        });

        return NextResponse.json(format);
    } catch (error) {
        logger.error('Error creating render format:', error);
        return NextResponse.json(
            { error: 'Failed to create render format' },
            { status: 500 }
        );
    }
} 