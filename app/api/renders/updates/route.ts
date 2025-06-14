import { handleClientConnection } from "@/app/services/monitor";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  console.log('New SSE connection request');
  return handleClientConnection(req);
} 