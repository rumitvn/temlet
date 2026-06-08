import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, parsePaginationParams } from "@/app/lib/api-utils";
import { logger } from "@/app/lib/logger";

// GET /api/renders/search - Search render items by file name
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get('q');
        const type = searchParams.get('type');
        const topic = searchParams.get('topic');
        const { page, limit } = parsePaginationParams(searchParams);
        const skip = (page - 1) * limit;

        if (!query) {
            return apiError('Search query is required', 400);
        }

        const where: Prisma.RenderItemWhereInput = {
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
        logger.error('Error searching render items:', error);
        return apiError('Failed to search render items');
    }
} 