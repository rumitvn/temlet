import { prisma } from "@/lib/prisma";
import { checkRenderStatus } from "./render";

// Store connected clients
const clients = new Set<{ id: string; send: (data: any) => void }>();

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

// Function to send updates to all connected clients
export function broadcastUpdate(data: any) {
  console.log('Broadcasting update to', clients.size, 'clients:', data);
  clients.forEach(client => {
    try {
      client.send(data);
    } catch (error) {
      console.error('Error sending to client:', error);
    }
  });
}

// Function to handle client connection
export function handleClientConnection(req: Request) {
  const id = Math.random().toString(36).substring(7);
  console.log('New client connected:', id);
  
  const stream = new ReadableStream({
    start(controller) {
      const client = {
        id,
        send: (data: any) => {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        }
      };

      clients.add(client);
      console.log('Active clients:', clients.size);

      // Send initial data
      client.send({ type: 'connected', id });

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clients.delete(client);
        console.log('Client disconnected:', id);
        console.log('Remaining clients:', clients.size);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
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
        console.log(`Nexrender status for ${render.id}:`, status);
        
        const newStatus = mapNexrenderStatus(status.state);
        console.log(`Current status: ${render.status}, New status: ${newStatus}`);

        // Only update if status changed
        if (newStatus !== render.status) {
          console.log(`Status changed for render ${render.id}: ${render.status} -> ${newStatus}`);
          const updatedRender = await prisma.renderItem.update({
            where: { id: render.id },
            data: {
              status: newStatus,
              ...(newStatus === 'rendered' ? { renderTime: Math.floor(Date.now() / 1000) } : {})
            }
          });

          // Fetch the complete render item with assets for broadcasting
          const completeRender = await prisma.renderItem.findUnique({
            where: { id: render.id }
          });

          console.log('Updated render in database:', completeRender);

          // Broadcast update to all connected clients
          broadcastUpdate({
            type: 'render_update',
            render: completeRender
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