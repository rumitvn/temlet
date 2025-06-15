import { prisma } from "@/lib/prisma";
import { checkRenderStatus } from "./render";
import { generateMetadata } from "./metadata";

function mapNexrenderStatus(nexrenderState: string): string {
  // Initial states
  if (["created", "queued"].includes(nexrenderState)) {
    return "pending_render";
  }

  // Rendering states
  if (nexrenderState.startsWith("render:") || 
      ["picked", "started"].includes(nexrenderState)) {
    return "rendering";
  }

  // Final states
  if (nexrenderState === "finished") {
    return "rendered";
  }

  if (nexrenderState === "error") {
    return "render_error";
  }

  // Default case - keep current status
  return "pending_render";
}

// Background monitoring function
export async function startMonitoring() {
  console.log('Starting monitoring...');
  try {
    // Get all renders that need monitoring
    const renders = await prisma.renderItem.findMany({
      where: {
        OR: [
          // Monitor renders in progress
          {
            status: {
              in: ['pending_render', 'rendering']
            },
            nexrenderUid: {
              not: ""
            }
          },
          // Monitor rendered items that need metadata
          {
            status: 'rendered',
            autoCreateMetadata: true,
            metadataTime: null,
            // Exclude items that are already being processed by the client
            NOT: {
              status: {
                in: ['pending_metadata', 'processing_metadata']
              }
            }
          }
        ]
      }
    });

    console.log(`Found ${renders.length} items to monitor:`, renders);

    // Check status for each render
    for (const render of renders) {
      try {
        // Handle metadata processing for rendered items
        if (render.status === 'rendered' && render.autoCreateMetadata && !render.metadataTime) {
          console.log(`Starting metadata generation for render ${render.id}`);
          try {
            // First check if the item is still in the same state
            const currentItem = await prisma.renderItem.findUnique({
              where: { id: render.id },
              select: { status: true }
            });

            // Skip if the item is already being processed or has changed state
            if (!currentItem || 
                currentItem.status !== 'rendered' || 
                ['pending_metadata', 'processing_metadata'].includes(currentItem.status)) {
              console.log(`Skipping metadata generation for render ${render.id} - already being processed or state changed`);
              continue;
            }

            // Update status to pending_metadata
            await prisma.renderItem.update({
              where: { id: render.id },
              data: { status: 'pending_metadata' }
            });

            // Generate metadata
            const metadata = await generateMetadata(render.jsonContent);
            
            // Update with metadata and set status to processed_metadata
            await prisma.renderItem.update({
              where: { id: render.id },
              data: {
                status: 'processed_metadata',
                youtubeMetadata: metadata,
                metadataTime: Math.floor(Date.now() / 1000)
              }
            });
            
            console.log(`Successfully generated metadata for render ${render.id}`);
          } catch (error) {
            console.error(`Error generating metadata for render ${render.id}:`, error);
            // Update status to declined if metadata generation fails
            await prisma.renderItem.update({
              where: { id: render.id },
              data: { 
                status: 'declined',
                error: error instanceof Error ? error.message : 'Failed to generate metadata'
              }
            });
          }
          continue;
        }

        // Handle render status monitoring
        if (render.nexrenderUid) {
          console.log(`Checking status for render ${render.id} (${render.nexrenderUid})`);
          const status = await checkRenderStatus(render.nexrenderUid);
          
          const newStatus = mapNexrenderStatus(status.state);
          console.log(`Current status: ${render.status}, New status: ${newStatus}`);

          // Only update if status changed or progress changed
          if (newStatus !== render.status || status.renderProgress !== render.renderProgress) {
            console.log(`Status changed for render ${render.id}: ${render.status} -> ${newStatus}`);
            await prisma.renderItem.update({
              where: { id: render.id },
              data: {
                status: newStatus,
                renderProgress: status.renderProgress || 0,
                ...(newStatus === 'rendered' ? { renderTime: Math.floor(Date.now() / 1000) } : {})
              }
            });
          } else {
            console.log(`No status change for render ${render.id}`);
          }
        }
      } catch (error) {
        console.error(`Error processing render ${render.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in monitoring:', error);
  }
  console.log('Monitoring cycle completed');
}