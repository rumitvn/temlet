import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RenderStatus } from '@/app/types/render';
import { Prisma } from '@prisma/client';
import { logger } from "@/app/lib/logger";

type StatusCountResult = {
  status: string;
  _count: {
    status: number;
  };
}[];

export async function GET() {
  try {
    // Get counts for each status
    const statusCounts = await prisma.renderItem.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    // Initialize counts for all possible statuses
    const allStatuses: RenderStatus[] = [
      'new',
      'pending_render',
      'rendering',
      'rendered',
      'pending_metadata',
      'processing_metadata',
      'processed_metadata',
      'pending_upload',
      'processing_upload',
      'uploaded',
      'declined',
      'approved'
    ];

    // Create a map with all statuses initialized to 0
    const counts = allStatuses.reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<RenderStatus, number>);

    // Update counts with actual values from database
    statusCounts.forEach(({ status, _count }) => {
      if (status in counts) {
        counts[status as RenderStatus] = _count.status;
      }
    });

    return NextResponse.json(counts);
  } catch (error) {
    logger.error('Error fetching status counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status counts' },
      { status: 500 }
    );
  }
} 