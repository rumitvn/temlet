import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid job IDs' },
        { status: 400 }
      );
    }

    // In a real implementation, you would delete the jobs from the database
    // For now, we'll just return a success response
    console.log(`Deleting jobs:`, ids);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${ids.length} job(s)`,
      deletedJobs: ids.length
    });
  } catch (error) {
    console.error('Error deleting jobs:', error);
    return NextResponse.json(
      { error: 'Failed to delete jobs' },
      { status: 500 }
    );
  }
} 