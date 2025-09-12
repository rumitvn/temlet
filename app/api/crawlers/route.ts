import { NextRequest, NextResponse } from 'next/server';
import { crawlerService } from '@/app/services/crawlerService';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Handle resource listing mode
    const mode = searchParams.get('mode');
    if (mode === 'resources') {
      const type = searchParams.get('type');
      const channel = searchParams.get('channel');
      const topic = searchParams.get('topic');

      if (!type || !channel || !topic) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
      }

      const key = searchParams.get('key');
      if (!key) {
        return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
      }

      // Use the config utility to get the correct paths
      const { config } = await import('@/lib/config');
      const crawlerPaths = config.getCrawlerPathsWithKeyword(channel, topic, key);
      const basePath = type === 'image' ? crawlerPaths.image : crawlerPaths.video;
      
      console.log('Looking for files in:', basePath);
      
      if (!fs.existsSync(basePath)) {
        console.log('Directory not found:', basePath);
        return NextResponse.json({ files: [] });
      }

      // Read directory contents
      const files = fs.readdirSync(basePath)
        .filter(file => {
          if (type === 'image') {
            return file.match(/\.(jpg|jpeg|png|gif|webp)$/i);
          } else {
            return file.match(/\.(mp4|webm|mov)$/i);
          }
        })
        .map(file => ({
          name: file,
          path: path.join(basePath, file),
          url: `/api/crawlers/preview?path=${encodeURIComponent(path.join(basePath, file))}`
        }));

      return NextResponse.json({ files });
    }

    // Original job listing logic
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

    const filters: any = {
      q,
      type,
      topic,
      channel,
      site,
      status,
      sortBy,
      sortOrder
    };

    const result = await crawlerService.getAllJobs(page, limit, filters);

    return NextResponse.json({
      jobs: result.jobs,
      totalPages: result.totalPages,
      currentPage: page,
      totalJobs: result.totalJobs
    });
  } catch (error) {
    console.error('Error in crawler API:', error);
    return NextResponse.json(
      { error: 'API operation failed' },
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

    // Generate output path
    const outputPath = `/${channel.toLowerCase().replace(/\s+/g, '')}/${topic.toLowerCase()}/crawler/${type}`;

    // Create new job using the service
    const newJob = await crawlerService.createJob({
      name,
      keyword,
      site,
      type,
      channel,
      topic,
      outputPath,
      settings: {
        maxItems: settings.maxItems || 10,
        quality: settings.quality || 'medium',
        format: settings.format || (type === 'image' ? 'jpg' : 'mp4')
      }
    });

    return NextResponse.json(newJob, { status: 201 });
  } catch (error) {
    console.error('Error creating crawler job:', error);
    return NextResponse.json(
      { error: 'Failed to create crawler job' },
      { status: 500 }
    );
  }
} 