import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { CreateRenderItemDto, UpdateRenderItemDto } from "@/app/types/render";

// GET /api/renders - Get all render items
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const where = status ? { status } : {};
        
        const [items, total] = await Promise.all([
            prisma.renderItem.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.renderItem.count({ where })
        ]);

        return NextResponse.json({
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error fetching render items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch render items' },
            { status: 500 }
        );
    }
}

// POST /api/renders - Create a new render item
export async function POST(req: NextRequest) {
    try {
        const body: CreateRenderItemDto = await req.json();
        
        // Check if fileName already exists
        const existing = await prisma.renderItem.findUnique({
            where: { fileName: body.fileName }
        });

        if (existing) {
            return NextResponse.json(
                { error: 'File name already exists' },
                { status: 400 }
            );
        }

        const item = await prisma.renderItem.create({
            data: {
                ...body,
                status: 'new',
                jsonContent: body.jsonContent
            }
        });

        return NextResponse.json(item);
    } catch (error) {
        console.error('Error creating render item:', error);
        return NextResponse.json(
            { error: 'Failed to create render item' },
            { status: 500 }
        );
    }
} 