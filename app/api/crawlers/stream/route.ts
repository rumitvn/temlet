import { NextRequest, NextResponse } from 'next/server';
import { crawlerService } from '@/app/services/crawlerService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
  }

  // Set up SSE headers
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', jobId })}\n\n`));

      // Function to send job updates
      const sendUpdate = async () => {
        try {
          const job = await crawlerService.getJob(jobId);
          if (job) {
            // Check if controller is closed before sending any messages
            if (request.signal.aborted) {
              clearInterval(interval);
              return;
            }

            const update = {
              type: 'job_update',
              job: {
                id: job.id,
                status: job.status,
                progress: job.progress,
                totalItems: job.totalItems,
                downloadedItems: job.downloadedItems,
                failedItems: job.failedItems,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                error: job.error
              }
            };
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
            
            // If job is completed, failed, or paused, close the stream
            if (['completed', 'failed', 'paused'].includes(job.status)) {
              if (!request.signal.aborted) {
                // Send one final update
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'completed', 
                  jobId,
                  finalStatus: job.status,
                  stats: {
                    downloadedItems: job.downloadedItems,
                    failedItems: job.failedItems,
                    totalItems: job.totalItems,
                    progress: job.progress
                  }
                })}\n\n`));
                clearInterval(interval);
                controller.close();
              }
              return;
            }
          }
        } catch (error) {
          console.error('Error sending job update:', error);
          if (!request.signal.aborted) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Failed to get job update' })}\n\n`));
            clearInterval(interval);
            controller.close();
          }
        }
      };

      // Send updates every second
      const interval = setInterval(sendUpdate, 1000);
      
      // Send initial update immediately
      await sendUpdate();
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
} 