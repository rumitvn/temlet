import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Mock data for demonstration
const mockJobs = [
  {
    id: "1",
    name: "Capybara Videos",
    keyword: "capybara",
    site: "pexels",
    type: "video",
    channel: "RumitX Nature",
    topic: "Animals",
    status: "completed",
    progress: 100,
    totalItems: 8,
    downloadedItems: 8,
    failedItems: 0,
    createdAt: new Date("2024-01-15"),
    startedAt: new Date("2024-01-15T10:00:00"),
    completedAt: new Date("2024-01-15T10:15:00"),
    outputPath: "/channelName/animals/crawler/video",
    settings: {
      maxItems: 10,
      quality: "high",
      format: "mp4"
    }
  },
  {
    id: "2",
    name: "Bear Images",
    keyword: "bear",
    site: "pixabay",
    type: "image",
    channel: "RumitX Studio",
    topic: "Animals",
    status: "crawling",
    progress: 45,
    totalItems: 20,
    downloadedItems: 9,
    failedItems: 1,
    createdAt: new Date("2024-01-16"),
    startedAt: new Date("2024-01-16T14:30:00"),
    outputPath: "/channelName/animals/crawler/image",
    settings: {
      maxItems: 20,
      quality: "medium",
      format: "jpg"
    }
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const q = searchParams.get('q');
    const type = searchParams.get('type');
    const topic = searchParams.get('topic');
    const channel = searchParams.get('channel');
    const site = searchParams.get('site');
    const status = searchParams.get('status');

    // Filter jobs based on search parameters
    let filteredJobs = [...mockJobs];

    if (q) {
      filteredJobs = filteredJobs.filter(job => 
        job.name.toLowerCase().includes(q.toLowerCase()) ||
        job.keyword.toLowerCase().includes(q.toLowerCase())
      );
    }

    if (type) {
      filteredJobs = filteredJobs.filter(job => job.type === type.toLowerCase());
    }

    if (topic) {
      filteredJobs = filteredJobs.filter(job => job.topic === topic);
    }

    if (channel) {
      filteredJobs = filteredJobs.filter(job => job.channel === channel);
    }

    if (site) {
      filteredJobs = filteredJobs.filter(job => job.site === site);
    }

    if (status) {
      filteredJobs = filteredJobs.filter(job => job.status === status);
    }

    // Sort jobs
    filteredJobs.sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a];
      let bValue: any = b[sortBy as keyof typeof b];

      if (aValue instanceof Date && bValue instanceof Date) {
        aValue = aValue.getTime();
        bValue = bValue.getTime();
      }

      if (aValue === undefined) aValue = '';
      if (bValue === undefined) bValue = '';

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedJobs = filteredJobs.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredJobs.length / limit);

    return NextResponse.json({
      jobs: paginatedJobs,
      totalPages,
      currentPage: page,
      totalJobs: filteredJobs.length
    });
  } catch (error) {
    console.error('Error fetching crawler jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crawler jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, keyword, site, type, channel, topic, settings } = body;

    // Validate required fields
    if (!name || !keyword || !site || !type || !channel || !topic) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new job
    const newJob: any = {
      id: Date.now().toString(),
      name,
      keyword,
      site,
      type,
      channel,
      topic,
      status: 'pending',
      progress: 0,
      totalItems: 0,
      downloadedItems: 0,
      failedItems: 0,
      createdAt: new Date(),
      outputPath: `/${channel.toLowerCase().replace(/\s+/g, '')}/${topic.toLowerCase()}/crawler/${type}`,
      settings: {
        maxItems: settings.maxItems || 10,
        quality: settings.quality || 'medium',
        format: settings.format || (type === 'image' ? 'jpg' : 'mp4')
      }
    };

    // In a real implementation, you would save this to a database
    // For now, we'll just return the new job
    mockJobs.unshift(newJob);

    return NextResponse.json(newJob, { status: 201 });
  } catch (error) {
    console.error('Error creating crawler job:', error);
    return NextResponse.json(
      { error: 'Failed to create crawler job' },
      { status: 500 }
    );
  }
} 