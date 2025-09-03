import { NextResponse } from 'next/server';
import { crawlerService } from '@/app/services/crawlerService';

export async function GET() {
  try {
    const stats = await crawlerService.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
} 