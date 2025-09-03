import { NextRequest, NextResponse } from 'next/server';
import { crawlerService } from '@/app/services/crawlerService';

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

    // Process each job based on the action
    for (const id of ids) {
      try {
        switch (action) {
          case 'start':
            await crawlerService.startJob(id);
            break;
          case 'pause':
            await crawlerService.pauseJob(id);
            break;
          case 'resume':
            await crawlerService.resumeJob(id);
            break;
          default:
            console.warn(`Unknown action: ${action}`);
        }
      } catch (error) {
        console.error(`Error processing job ${id} with action ${action}:`, error);
        // Continue with other jobs even if one fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing batch action:', error);
    return NextResponse.json(
      { error: 'Failed to process batch action' },
      { status: 500 }
    );
  }
} 