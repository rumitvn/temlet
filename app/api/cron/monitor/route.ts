import { startMonitoring } from "@/app/services/monitor";
import { NextResponse } from "next/server";
import { logger } from "@/app/lib/logger";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {  
  // Skip auth check in development
  if (process.env.NODE_ENV === 'development') {
    try {
      await startMonitoring();
      return new NextResponse('Monitoring completed', { status: 200 });
    } catch (error) {
      logger.error('Error in cron job:', error);
      // Return success even if monitoring fails due to database issues
      if (error instanceof Error && error.message.includes('database')) {
        return new NextResponse('Monitoring skipped - database not available', { status: 200 });
      }
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }

  // Production auth check
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logger.debug('Unauthorized cron request');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    logger.debug('Starting monitoring from cron job');
    await startMonitoring();
    logger.debug('Monitoring completed successfully');
    return new NextResponse('Monitoring completed', { status: 200 });
  } catch (error) {
    logger.error('Error in cron job:', error);
    // Return success even if monitoring fails due to database issues
    if (error instanceof Error && error.message.includes('database')) {
      return new NextResponse('Monitoring skipped - database not available', { status: 200 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 