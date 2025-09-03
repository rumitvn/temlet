import { NextResponse } from 'next/server';
import { crawlerService } from '@/app/services/crawlerService';

export async function GET() {
  try {
    const statusCounts = await crawlerService.getStatusCounts();
    return NextResponse.json(statusCounts);
  } catch (error) {
    console.error('Error fetching status counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status counts' },
      { status: 500 }
    );
  }
} 