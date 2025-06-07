import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

// GET /api/renders/search - Search render items by file name
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get('q');
        const type = searchParams.get('type');
        const topic = searchParams.get('topic');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        if (!query) {
            return NextResponse.json(
                { error: 'Search query is required' },
                { status: 400 }
            );
        }

        const where: any = {
            fileName: {
                contains: query,
                mode: 'insensitive'
            }
        };

        if (type) where.type = type;
        if (topic) where.topic = topic;

        const [items, total] = await Promise.all([
            prisma.renderItem.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.renderItem.count({
                where
            })
        ]);

        return NextResponse.json({
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error searching render items:', error);
        return NextResponse.json(
            { error: 'Failed to search render items' },
            { status: 500 }
        );
    }
} 