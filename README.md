# NexRender Manager

A comprehensive video rendering and upload management system for After Effects projects.

## Features

### Render Management
- Create render items from JSON files
- Automatic rendering with nexrender
- Real-time render progress tracking
- Support for multiple templates and output formats

### Metadata Generation
- Automatic YouTube metadata generation
- Customizable titles, descriptions, and tags
- Support for playlists and categories

### Upload Management
- **NEW: Scheduled Uploads** - Schedule multiple videos for automatic upload
- YouTube upload integration
- TikTok upload integration
- Batch upload operations

## Scheduling Feature

The new scheduling feature allows you to automatically schedule multiple videos for upload with specific timing rules:

### How it works:
1. **Start Date**: Choose when to start uploading videos
2. **Time Slots**: Define specific times of day for uploads (e.g., 06:00, 11:00, 16:00)
3. **Videos Per Day**: Set how many videos to upload per day
4. **Automatic Distribution**: The system automatically distributes videos across days and time slots

### Example:
- Start Date: 20/07/2025
- Time Slots: 06:00, 11:00, 16:00
- Videos Per Day: 3
- 7 videos selected

**Result:**
- Day 1 (20/07/2025): Videos 1, 2, 3 at 06:00, 11:00, 16:00
- Day 2 (21/07/2025): Videos 4, 5, 6 at 06:00, 11:00, 16:00  
- Day 3 (22/07/2025): Video 7 at 06:00

### When the scheduling dialog appears:
- When selecting multiple items and clicking "Upload" or "TikTok"
- When creating multiple render items with "Auto Upload" enabled
- When clicking individual upload buttons (for consistency)

## Installation

```bash
npm install
npm run dev
```

## API Endpoints

- `POST /api/renders` - Create render items
- `POST /api/renders/:id/render` - Start rendering
- `POST /api/youtube-metadata` - Generate YouTube metadata
- `POST /api/youtube-upload` - Upload to YouTube
- `POST /api/tiktok-upload` - Upload to TikTok

## Configuration

The system supports various configuration options for templates, output folders, and render formats. These can be managed through the web interface.
