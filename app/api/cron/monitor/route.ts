import { startMonitoring } from "@/app/services/monitor";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  console.log('Cron job triggered');
  
  // Skip auth check in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: skipping auth check');
    try {
      console.log('Starting monitoring from cron job');
      await startMonitoring();
      console.log('Monitoring completed successfully');
      return new NextResponse('Monitoring completed', { status: 200 });
    } catch (error) {
      console.error('Error in cron job:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }

  // Production auth check
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('Unauthorized cron request');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    console.log('Starting monitoring from cron job');
    await startMonitoring();
    console.log('Monitoring completed successfully');
    return new NextResponse('Monitoring completed', { status: 200 });
  } catch (error) {
    console.error('Error in cron job:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 