import { NextRequest, NextResponse } from 'next/server';
import { crawlerService } from '@/app/services/crawlerService';
import { logger } from "@/app/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, action } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or missing ids' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Process all jobs in parallel
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        try {
          switch (action) {
            case 'start':
              await crawlerService.startJob(id);
              return { id, success: true };
            case 'pause':
              await crawlerService.pauseJob(id);
              return { id, success: true };
            case 'resume':
              await crawlerService.resumeJob(id);
              return { id, success: true };
            default:
              logger.warn(`Unknown action: ${action}`);
              return { id, success: false, error: 'Unknown action' };
          }
        } catch (error) {
          logger.error(`Error processing job ${id} with action ${action}:`, error);
          return { 
            id, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      })
    );

    // Check results
    const failed = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );

    if (failed.length > 0) {
      logger.error('Some jobs failed:', failed);
      return NextResponse.json({
        success: false,
        error: `Failed to process ${failed.length} job(s)`,
        details: failed
      }, { status: 207 }); // 207 Multi-Status
    }

    return NextResponse.json({ 
      success: true,
      results: results.map(r => r.status === 'fulfilled' ? r.value : null)
    });
  } catch (error) {
    logger.error('Error processing batch action:', error);
    return NextResponse.json(
      { error: 'Failed to process batch action' },
      { status: 500 }
    );
  }
} 