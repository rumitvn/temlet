import { prisma } from "@/lib/prisma";
import { checkRenderStatus } from "./render";

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
        status: {
          in: ['pending_render', 'rendering']
        },
        nexrenderUid: {
          not: ""
        }
      }
    });

    console.log(`Found ${renders.length} renders to monitor:`, renders);

    // Check status for each render
    for (const render of renders) {
      try {
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
      } catch (error) {
        console.error(`Error checking status for render ${render.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in monitoring:', error);
  }
  console.log('Monitoring cycle completed');
}