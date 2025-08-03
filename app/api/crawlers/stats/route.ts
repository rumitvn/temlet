import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Mock stats data
    const stats = {
      totalJobs: 2,
      activeJobs: 1,
      completedJobs: 1,
      failedJobs: 0,
      totalDownloaded: 17,
      totalFailed: 1,
      averageSpeed: 2.5
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
} 