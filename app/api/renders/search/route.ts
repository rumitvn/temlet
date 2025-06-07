import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

// GET /api/renders/search - Search render items by file name
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get('q');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        if (!query) {
            return NextResponse.json(
                { error: 'Search query is required' },
                { status: 400 }
            );
        }

        const [items, total] = await Promise.all([
            prisma.renderItem.findMany({
                where: {
                    fileName: {
                        contains: query,
                        mode: 'insensitive'
                    }
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.renderItem.count({
                where: {
                    fileName: {
                        contains: query,
                        mode: 'insensitive'
                    }
                }
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