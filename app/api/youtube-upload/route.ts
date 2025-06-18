import { NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";

function toScheduledISO(input?: string): string | undefined {
  if (!input) return undefined;
  const parsed = new Date(input.includes("T") ? input : input.replace(" ", "T") + ":00");
  return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export async function POST(req: Request) {
  try {
    console.log('Starting YouTube upload process...');
    
    const form = await req.formData();
    const mp4File = form.get("mp4") as File;
    const title = form.get("title")?.toString() || "";
    const description = form.get("description")?.toString() || "";
    const playlistId = form.get("playlistId")?.toString() || "";
    const tagsRaw = form.get("tags")?.toString() || "";
    const categoryId = form.get("categoryId")?.toString() || "27";
    const defaultLanguage = form.get("defaultLanguage")?.toString() || "vi";
    const defaultAudioLanguage = form.get("defaultAudioLanguage")?.toString() || "vi";
    const scheduleDateRaw = form.get("scheduleDate")?.toString();


    if (!mp4File) {
      return NextResponse.json({ error: "Missing mp4 file" }, { status: 400 });
    }

    console.log('Title received:', title);
    if (!title || !title.trim()) {
      console.error('Backend: Empty or invalid title received:', title);
      return NextResponse.json({ error: "Empty or invalid title" }, { status: 400 });
    }

    const scheduledAt = toScheduledISO(scheduleDateRaw);
    if (scheduleDateRaw && !scheduledAt) {
      console.error('Invalid schedule date:', scheduleDateRaw);
      return NextResponse.json({ error: "Invalid scheduleDate" }, { status: 400 });
    }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    console.log('Processing video file...');
    const buffer = Buffer.from(await mp4File.arrayBuffer());
    const stream = Readable.from(buffer);

    console.log('Video file size:', buffer.length, 'bytes');
    console.log('Title char codes:', Array.from(title).map(c => c.charCodeAt(0)));

    const creds = JSON.parse(process.env.YOUTUBE_TOKEN_JSON || "{}");
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT
    );
    oauth2Client.setCredentials(creds);

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    console.log('Uploading video to YouTube...');
    const requestBody = {
      snippet: {
        title,
        description,
        tags,
        categoryId,
        defaultLanguage,
        defaultAudioLanguage,
      },
      status: {
        privacyStatus: "private",
        publishAt: scheduledAt,
        madeForKids: false,
        selfDeclaredMadeForKids: false,
        containsSyntheticMedia: false,
      },
    };
    console.log('YouTube API requestBody:', JSON.stringify(requestBody, null, 2));

    const videoRes = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody,
      media: { body: stream },
    });

    const videoId = videoRes.data.id;
    console.log('Video uploaded successfully:', videoId);

    if (playlistId && videoId) {
      console.log('Adding video to playlist:', playlistId);
      await youtube.playlistItems.insert({
        part: ["snippet"],
        requestBody: {
          snippet: {
            playlistId,
            resourceId: {
              kind: "youtube#video",
              videoId,
            },
          },
        },
      });
    }

    return NextResponse.json({ success: true, videoId });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ 
      error: err.message || "Upload failed",
      details: err.response?.data || err
    }, { status: 500 });
  }
}

