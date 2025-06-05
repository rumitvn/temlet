import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";

function toScheduledISO(input?: string): string | undefined {
  if (!input) return undefined;
  const parsed = new Date(input.includes("T") ? input : input.replace(" ", "T") + ":00");
  return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const mp4File = form.get("mp4") as File;
    const title = form.get("title")?.toString() || "";
    const description = form.get("description")?.toString() || "";

    const playlistId = form.get("playlistId")?.toString() || "";
    const tagsRaw = form.get("tags")?.toString() || "";
    const categoryId = form.get("categoryId")?.toString() || "27";
    const defaultLanguage = form.get("defaultLanguage")?.toString() || "vi";
    const defaultAudioLanguage = form.get("defaultAudioLanguage")?.toString() || "vi";
    const scheduleDateRaw = form.get("scheduleDate")?.toString(); // dynamic

    const scheduledAt = toScheduledISO(scheduleDateRaw);
    if (!scheduledAt) return NextResponse.json({ error: "Invalid scheduleDate" }, { status: 400 });

    if (!mp4File || !title || !description) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const buffer = Buffer.from(await mp4File.arrayBuffer());
    const stream = Readable.from(buffer);

    const creds = JSON.parse(process.env.YOUTUBE_TOKEN_JSON || "{}");
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT
    );
    oauth2Client.setCredentials(creds);

    await oauth2Client.getAccessToken();

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const videoRes = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
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
      },
      media: { body: stream },
    });

    const videoId = videoRes.data.id;

    if (playlistId && videoId) {
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
