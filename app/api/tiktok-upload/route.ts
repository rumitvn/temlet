import { NextResponse } from "next/server";
import { Readable } from "stream";

export async function POST(req: Request) {
  try {
    console.log('Starting TikTok upload process...');
    
    const form = await req.formData();
    const mp4File = form.get("mp4") as File;
    const title = form.get("title")?.toString() || "";
    const description = form.get("description")?.toString() || "";
    const tagsRaw = form.get("tags")?.toString() || "";

    if (!mp4File) {
      return NextResponse.json({ error: "Missing mp4 file" }, { status: 400 });
    }

    console.log('Title received:', title);
    if (!title || !title.trim()) {
      console.error('Backend: Empty or invalid title received:', title);
      return NextResponse.json({ error: "Empty or invalid title" }, { status: 400 });
    }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    console.log('Processing video file...');
    const buffer = Buffer.from(await mp4File.arrayBuffer());
    const stream = Readable.from(buffer);

    console.log('Video file size:', buffer.length, 'bytes');

    // TikTok API credentials
    const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

    if (!accessToken) {
      console.error('Missing TikTok access token. Please authenticate with TikTok first.');
      return NextResponse.json({ error: "TikTok not authenticated. Please connect your TikTok account first." }, { status: 401 });
    }

    if (!clientKey || !clientSecret) {
      console.error('Missing TikTok API credentials');
      return NextResponse.json({ error: "TikTok API credentials not configured" }, { status: 500 });
    }

    // Step 1: Initialize upload using the correct endpoint
    console.log('Initializing TikTok upload...');
    console.log('Using access token:', accessToken.substring(0, 20) + '...');
    
    // TikTok chunk size - try 15MB chunks to get even fewer chunks
    // Your file is ~89MB, so this should give us ~6 chunks
    const CHUNK_SIZE = 15728640; // 15MB chunks (15 * 1024 * 1024)
    const totalChunks = Math.ceil(buffer.length / CHUNK_SIZE) - 1;
    
    console.log(`File size: ${buffer.length} bytes, Chunk size: ${CHUNK_SIZE} bytes, Total chunks: ${totalChunks}`);
    
    const initResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: buffer.length,
          chunk_size: CHUNK_SIZE,
          total_chunk_count: totalChunks,
        },
      }),
    });
    
    console.log('Init response status:', initResponse.status);

    if (!initResponse.ok) {
      const text = await initResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(text);
      } catch {
        errorData = { raw: text };
      }
      console.error('TikTok init error:', errorData);
      throw new Error(`TikTok init failed: ${errorData.error?.message || errorData.raw || 'Unknown error'}`);
    }

    const initData = await initResponse.json();
    const { upload_url, publish_id } = initData.data;

    console.log('TikTok upload initialized:', { upload_url, publish_id });

    // Step 2: Upload video file in chunks
    console.log('Uploading video to TikTok in chunks...');
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, buffer.length);
      const chunk = buffer.slice(start, end);
      
      // For the last chunk, ensure we only upload the remaining bytes
      const actualEnd = (chunkIndex === totalChunks - 1) ? buffer.length : end;
      const actualChunk = buffer.slice(start, actualEnd);
      
      console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks} (bytes ${start}-${actualEnd - 1}, size: ${actualChunk.length} bytes)`);
      
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Range': `bytes ${start}-${actualEnd - 1}/${buffer.length}`,
        },
        body: actualChunk,
      });
      
      if (!uploadResponse.ok) {
        const text = await uploadResponse.text();
        console.log(`Chunk ${chunkIndex + 1} response status: ${uploadResponse.status}, text: ${text}`);
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = { raw: text };
        }
        console.error(`TikTok upload error for chunk ${chunkIndex + 1}:`, errorData);
        throw new Error(`TikTok upload failed for chunk ${chunkIndex + 1}: ${errorData?.error?.message || errorData?.raw || 'Unknown error'}`);
      }
      
      console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`);
    }
    
    console.log('All video chunks uploaded successfully to TikTok');

    // Step 3: Check upload status (optional - for monitoring)
    console.log('Checking upload status...');
    const statusResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publish_id: publish_id,
      }),
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('Upload status:', statusData);
    }

    console.log('TikTok video uploaded successfully:', publish_id);

    return NextResponse.json({ 
      success: true, 
      publishId: publish_id,
      message: 'Video uploaded to TikTok successfully'
    });

  } catch (err: any) {
    console.error("TikTok upload error:", err);
    return NextResponse.json({ 
      error: err.message || "TikTok upload failed",
      details: err.response?.data || err
    }, { status: 500 });
  }
} 