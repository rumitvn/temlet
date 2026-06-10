import { NextResponse } from "next/server";
import { google } from "googleapis";
import { YOUTUBE_CATEGORY_ID } from "@/app/lib/constants";
import { Readable } from "stream";
import sharp from "sharp";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { exec } from "child_process";
import { promisify } from "util";
import ffmpegStatic from "ffmpeg-static";
import { logger } from "@/app/lib/logger";

const execAsync = promisify(exec);

// Prefer the bundled ffmpeg binary (ships with the desktop app) so thumbnail
// extraction works on a machine with no system ffmpeg. FFMPEG_PATH overrides.
const FFMPEG_BIN = process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg";

function toScheduledISO(input?: string): string | undefined {
  if (!input) return undefined;
  const parsed = new Date(input.includes("T") ? input : input.replace(" ", "T") + ":00");
  return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

async function extractFrameFromVideo(videoBuffer: Buffer, timestamp: string = "00:00:02"): Promise<Buffer> {
  const tempVideoPath = join(tmpdir(), `temp_video_${Date.now()}.mp4`);
  const tempFramePath = join(tmpdir(), `frame_${Date.now()}.jpg`);
  
  try {
    // Write video buffer to temp file
    await writeFile(tempVideoPath, videoBuffer);
    
    // Use the bundled ffmpeg (falls back to a generated thumbnail on failure).
    try {
      logger.debug(`Extracting frame at ${timestamp} via ${FFMPEG_BIN}...`);
      await execAsync(`"${FFMPEG_BIN}" -i "${tempVideoPath}" -ss ${timestamp} -vframes 1 -q:v 2 "${tempFramePath}"`);
      
      // Read the extracted frame and get its dimensions
      const frameImage = sharp(tempFramePath);
      const metadata = await frameImage.metadata();
      
      logger.debug(`Extracted frame dimensions: ${metadata.width}x${metadata.height}`);
      
      // Determine optimal thumbnail size based on aspect ratio
      let targetWidth, targetHeight;
      if (metadata.width && metadata.height) {
        const aspectRatio = metadata.width / metadata.height;
        
        if (aspectRatio > 1) {
          // Landscape video - use 1280x720
          targetWidth = 1280;
          targetHeight = 720;
        } else {
          // Portrait/vertical video - use 720x1280 (maintain aspect ratio)
          targetWidth = 720;
          targetHeight = 1280;
        }
      } else {
        // Fallback to landscape if we can't determine dimensions
        targetWidth = 1280;
        targetHeight = 720;
      }
      
      logger.debug(`Resizing thumbnail to: ${targetWidth}x${targetHeight}`);
      
      const frameBuffer = await frameImage
        .resize(targetWidth, targetHeight, { 
          fit: 'inside', 
          withoutEnlargement: true,
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .jpeg({ 
          quality: 90,
          progressive: true
        })
        .toBuffer();
      
      return frameBuffer;
    } catch (ffmpegError) {
      logger.warn('ffmpeg frame extraction failed, creating custom thumbnail...');
      
      // Create a more attractive fallback thumbnail with video info
      const fallbackThumbnail = await sharp({
        create: {
          width: 720,
          height: 1280,
          channels: 3,
          background: { r: 32, g: 32, b: 32 }
        }
      })
      .composite([{
        input: Buffer.from(`
          <svg width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#1a1a1a"/>
            <circle cx="360" cy="640" r="60" fill="#ff0000" opacity="0.8"/>
            <polygon points="340,620 340,660 380,640" fill="white"/>
            <text x="360" y="720" text-anchor="middle" fill="white" font-family="Arial" font-size="36" font-weight="bold">VIDEO</text>
            <text x="360" y="750" text-anchor="middle" fill="#cccccc" font-family="Arial" font-size="18">Auto-generated thumbnail</text>
          </svg>
        `),
        top: 0,
        left: 0
      }])
      .jpeg({ quality: 90 })
      .toBuffer();
      
      return fallbackThumbnail;
    }
  } finally {
    // Clean up temp files
    try {
      await unlink(tempVideoPath);
      await unlink(tempFramePath);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

function isValidThumbnailFormat(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 2 * 1024 * 1024; // 2MB limit
  
  return validTypes.includes(file.type) && file.size <= maxSize;
}

async function processThumbnail(thumbnailBuffer: Buffer): Promise<Buffer> {
  try {
    // Get the original image dimensions
    const image = sharp(thumbnailBuffer);
    const metadata = await image.metadata();
    
    logger.debug(`Processing thumbnail with dimensions: ${metadata.width}x${metadata.height}`);
    
    // Determine optimal size based on aspect ratio
    let targetWidth, targetHeight;
    if (metadata.width && metadata.height) {
      const aspectRatio = metadata.width / metadata.height;
      
      if (aspectRatio > 1) {
        // Landscape image - use 1280x720
        targetWidth = 1280;
        targetHeight = 720;
      } else {
        // Portrait/vertical image - use 720x1280 (maintain aspect ratio)
        targetWidth = 720;
        targetHeight = 1280;
      }
    } else {
      // Fallback to landscape if we can't determine dimensions
      targetWidth = 1280;
      targetHeight = 720;
    }
    
    logger.debug(`Resizing thumbnail to: ${targetWidth}x${targetHeight}`);
    
    // Process thumbnail to meet YouTube requirements
    return await image
      .resize(targetWidth, targetHeight, { 
        fit: 'inside', 
        withoutEnlargement: true,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      .jpeg({ 
        quality: 90,
        progressive: true
      })
      .toBuffer();
  } catch (error) {
    logger.error('Error processing thumbnail:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    logger.debug('Starting YouTube upload process...');
    
    const form = await req.formData();
    const mp4File = form.get("mp4") as File;
    const thumbnailFile = form.get("thumbnail") as File;
    const frameTimestamp = form.get("frameTimestamp")?.toString() || "00:00:02";
    const enableThumbnail = form.get("enableThumbnail")?.toString() === "true"; // New config option
    const title = form.get("title")?.toString() || "";
    const description = form.get("description")?.toString() || "";
    const playlistId = form.get("playlistId")?.toString() || "";
    const tagsRaw = form.get("tags")?.toString() || "";
    const categoryId = form.get("categoryId")?.toString() || YOUTUBE_CATEGORY_ID;
    const defaultLanguage = form.get("defaultLanguage")?.toString() || "vi";
    const defaultAudioLanguage = form.get("defaultAudioLanguage")?.toString() || "vi";
    const scheduleDateRaw = form.get("scheduleDate")?.toString();

    if (!mp4File) {
      return NextResponse.json({ error: "Missing mp4 file" }, { status: 400 });
    }

    logger.debug('Title received:', title);
    if (!title || !title.trim()) {
      logger.error('Backend: Empty or invalid title received:', title);
      return NextResponse.json({ error: "Empty or invalid title" }, { status: 400 });
    }

    const scheduledAt = toScheduledISO(scheduleDateRaw);
    if (scheduleDateRaw && !scheduledAt) {
      logger.error('Invalid schedule date:', scheduleDateRaw);
      return NextResponse.json({ error: "Invalid scheduleDate" }, { status: 400 });
    }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    logger.debug('Processing video file...');
    const buffer = Buffer.from(await mp4File.arrayBuffer());
    const stream = Readable.from(buffer);

    logger.debug('Video file size:', buffer.length, 'bytes');
    logger.debug('Title char codes:', Array.from(title).map(c => c.charCodeAt(0)));

    const creds = JSON.parse(process.env.YOUTUBE_TOKEN_JSON || "{}");
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT
    );
    oauth2Client.setCredentials(creds);

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    logger.debug('Uploading video to YouTube...');
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
    logger.debug('YouTube API requestBody:', JSON.stringify(requestBody, null, 2));

    const videoRes = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody,
      media: { body: stream },
    });

    const videoId = videoRes.data.id;
    logger.debug('Video uploaded successfully:', videoId);

    // Handle thumbnail upload (only if enabled)
    if (videoId && enableThumbnail) {
      logger.debug('Thumbnail upload is enabled, processing...');
      let thumbnailBuffer: Buffer | null = null;
      
      // Check if user provided thumbnail
      if (thumbnailFile && thumbnailFile.size > 0) {
        if (isValidThumbnailFormat(thumbnailFile)) {
          try {
            logger.debug('Processing provided thumbnail...');
            const rawThumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
            thumbnailBuffer = await processThumbnail(rawThumbnailBuffer);
            logger.debug('Thumbnail processed successfully');
          } catch (processError) {
            logger.error('Failed to process thumbnail:', processError);
            logger.debug('Will extract frame from video instead');
          }
        } else {
          logger.warn('Invalid thumbnail format or size, will extract frame from video');
        }
      }
      
      // If no valid thumbnail provided, extract frame from video
      if (!thumbnailBuffer) {
        try {
          logger.debug(`Extracting frame from video at ${frameTimestamp}...`);
          thumbnailBuffer = await extractFrameFromVideo(buffer, frameTimestamp);
          logger.debug('Frame extracted successfully');
        } catch (frameError) {
          logger.error('Failed to extract frame:', frameError);
          logger.debug('Will use YouTube auto-generated thumbnail');
        }
      }
      
      // Upload thumbnail if we have a valid one
      if (thumbnailBuffer) {
        try {
          logger.debug('Uploading thumbnail to YouTube...');
          const thumbnailStream = Readable.from(thumbnailBuffer);
          
          await youtube.thumbnails.set({
            videoId: videoId,
            media: { body: thumbnailStream },
          });
          
          logger.debug('Thumbnail uploaded successfully');
        } catch (thumbnailError: unknown) {
          logger.error('Thumbnail upload failed:', thumbnailError);
          logger.debug('YouTube will use auto-generated thumbnail');
          // Don't fail the entire upload if thumbnail fails
          // Just log the error and continue
        }
      }
    } else if (videoId) {
      logger.debug('Thumbnail upload is disabled, YouTube will use auto-generated thumbnail');
    }

    if (playlistId && videoId) {
      logger.debug('Adding video to playlist:', playlistId);
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
    logger.error("Upload error:", err);
    return NextResponse.json({ 
      error: err.message || "Upload failed",
      details: err.response?.data || err
    }, { status: 500 });
  }
}

