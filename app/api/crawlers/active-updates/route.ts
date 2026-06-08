import { NextRequest, NextResponse } from 'next/server';
import { crawlerService } from '@/app/services/crawlerService';
import { logger } from "@/app/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { jobIds } = await request.json();
    logger.debug('Active-updates API called with job IDs:', jobIds);

    if (!jobIds || !Array.isArray(jobIds)) {
      return NextResponse.json(
        { error: 'Invalid job IDs provided' },
        { status: 400 }
      );
    }

    // Get updates for the specified jobs
    const updates = [];
    
    for (const jobId of jobIds) {
      try {
        const job = await crawlerService.getJob(jobId);
        if (job) {
          const update = {
            id: job.id,
            status: job.status,
            progress: job.progress,
            totalItems: job.totalItems,
            downloadedItems: job.downloadedItems,
            failedItems: job.failedItems,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            error: job.error
          };
          updates.push(update);
          logger.debug(`Job ${jobId} update:`, update);
        }
      } catch (error) {
        logger.error(`Error fetching job ${jobId}:`, error);
      }
    }

    logger.debug('Returning updates:', updates);
    return NextResponse.json(updates);
  } catch (error) {
    logger.error('Error in active-updates API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 