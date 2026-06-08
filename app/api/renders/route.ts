import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, parsePaginationParams } from "@/app/lib/api-utils";
import { logger } from "@/app/lib/logger";

// GET /api/renders - List render items with filtering and sorting
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const type = searchParams.get('type');
        const topic = searchParams.get('topic');
        const status = searchParams.get('status');
        const { page, limit, sortBy, sortOrder } = parsePaginationParams(searchParams);
        const skip = (page - 1) * limit;
        const ids = searchParams.get('ids')?.split(',');

        // Build the where clause
        const whereClause: Prisma.RenderItemWhereInput = {};
        
        if (type) {
            whereClause.type = type;
        }
        if (topic) {
            whereClause.topic = topic;
        }
        if (status) {
            whereClause.status = status;
        }
        if (ids) {
            whereClause.id = {
                in: ids
            };
        }

        const items = await prisma.renderItem.findMany({
            where: whereClause,
            skip: ids ? 0 : skip, // Don't skip if fetching by IDs
            take: ids ? undefined : limit, // Don't limit if fetching by IDs
            orderBy: {
                [sortBy]: sortOrder
            }
        });

        const total = ids ? items.length : await prisma.renderItem.count({
            where: whereClause
        });

        return NextResponse.json({
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        logger.error('Error listing render items:', error);
        return apiError('Failed to list render items');
    }
}

// POST /api/renders - Create a new render item
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            fileName,
            nexrenderUid,
            type,
            topic,
            channelName,
            channelId,
            templateAeUrl,
            templateAeComposition,
            templateAeRenderFormat,
            templateAeAssets,
            renderOutputFolder,
            autoRender,
            autoCreateMetadata,
            autoUpload,
            uploadScheduleStart,
            uploadFromHour,
            uploadToHour,
            videosPerDay,
            jsonContent,
            mp4Link,
            youtubeMetadata,
            status
        } = body;

        // Validate required fields
        const requiredFields = [
            'fileName', 'type', 'topic', 
            'channelName', 'channelId', 'templateAeUrl', 
            'templateAeComposition', 'templateAeRenderFormat',
            'renderOutputFolder', 'jsonContent'
        ];
        
        const missingFields = requiredFields.filter(field => !body[field]);
        if (missingFields.length > 0) {
            return apiError(`Missing required fields: ${missingFields.join(', ')}`, 400);
        }

        // Check if fileName already exists
        const existing = await prisma.renderItem.findUnique({
            where: { fileName }
        });

        if (existing) {
            return apiError('File name already exists', 400);
        }

        // Fetch the render format details to include the code field
        const renderFormat = await prisma.renderFormat.findUnique({
            where: { id: templateAeRenderFormat.id }
        });

        if (!renderFormat) {
            return apiError('Invalid render format ID', 400);
        }

        const renderItem = await prisma.renderItem.create({
            data: {
                fileName,
                nexrenderUid: nexrenderUid || '', // Default to empty string if not provided
                type,
                topic,
                channelName,
                channelId,
                templateAeUrl,
                templateAeComposition,
                templateAeRenderFormat: {
                    id: renderFormat.id,
                    name: renderFormat.name,
                    code: renderFormat.code
                },
                templateAeAssets: templateAeAssets || [], // Default to empty array if not provided
                renderOutputFolder,
                autoRender: autoRender || false,
                autoCreateMetadata: autoCreateMetadata || false,
                autoUpload: autoUpload || false,
                uploadScheduleStart,
                uploadFromHour,
                uploadToHour,
                videosPerDay: videosPerDay || 1,
                jsonContent,
                mp4Link: mp4Link || '', // Default to empty string if not provided
                youtubeMetadata,
                status: status || 'new'
            }
        });

        return NextResponse.json(renderItem);
    } catch (error) {
        logger.error('Error creating render item:', error);
        return apiError('Failed to create render item');
    }
} 