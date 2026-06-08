import { NextRequest, NextResponse } from 'next/server';
import { crawlerService } from '@/app/services/crawlerService';
import { logger } from "@/app/lib/logger";

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or missing ids' },
        { status: 400 }
      );
    }

    await crawlerService.deleteJobs(ids);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting jobs:', error);
    return NextResponse.json(
      { error: 'Failed to delete jobs' },
      { status: 500 }
    );
  }
} 