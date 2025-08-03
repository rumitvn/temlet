import { NextResponse } from 'next/server';

// Mock data for demonstration
const mockJobs = [
  {
    id: "1",
    status: "completed"
  },
  {
    id: "2",
    status: "crawling"
  },
  {
    id: "3",
    status: "pending"
  },
  {
    id: "4",
    status: "pending"
  },
  {
    id: "5",
    status: "failed"
  }
];

export async function GET() {
  try {
    const statusCounts = mockJobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json(statusCounts);
  } catch (error) {
    console.error('Error fetching status counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status counts' },
      { status: 500 }
    );
  }
} 