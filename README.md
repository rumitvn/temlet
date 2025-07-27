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

### AI Image Generation
- **NEW: AI Image Generation** - Generate images using AI models
- Support for OpenAI DALL-E 3
- Support for Grok-2 Image (xAI)
- Support for local ComfyUI integration
- Automatic image saving to assets directory
- Configurable image sizes, quality, and styles

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

## AI Image Generation Feature

The new AI Image Generation feature allows you to create images using advanced AI models directly from the assets page.

### Supported Models:

#### OpenAI DALL-E 3
- **Requirements**: OpenAI API key in environment variables
- **Features**: 
  - High-quality image generation
  - Multiple size options (256x256 to 1792x1024)
  - Quality settings (standard/HD)
  - Style options (vivid/natural)
- **Setup**: Add `OPENAI_API_KEY=your_api_key` to your `.env` file

#### Grok-2 Image (xAI)
- **Requirements**: Grok API key in environment variables
- **Features**: 
  - High-quality image generation using Grok-2 model
  - Multiple size options (256x256 to 1792x1024)
  - Fast generation times
  - Advanced AI capabilities
- **Setup**: Add `GROK_API_KEY=your_api_key` to your `.env` file

#### ComfyUI (Local)
- **Requirements**: ComfyUI running locally
- **Features**:
  - Local image generation (no API costs)
  - Customizable workflows
  - Multiple size options
  - Real-time generation status
- **Setup**: 
  1. Install and run ComfyUI locally (default: http://localhost:8188)
  2. Ensure ComfyUI is accessible from the application

### How to Use:
1. Navigate to the Assets page
2. Click the "Generate Image" button (green button with camera icon)
3. Select your preferred AI model
4. Enter a detailed prompt describing the image you want
5. Configure size, quality, and style options
6. Click "Generate Image"
7. The generated image will be automatically saved to your assets directory

### Features:
- **Model Selection**: Choose between OpenAI and ComfyUI
- **Real-time Status**: See model availability and connection status
- **Preview**: View generated images before saving
- **Automatic Saving**: Images are automatically saved to the appropriate assets directory
- **Error Handling**: Comprehensive error messages and retry options

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
- `POST /api/assets/generate-image` - Generate images using AI models
- `GET /api/assets/generate-image` - Get available AI models and configurations

## Configuration

The system supports various configuration options for templates, output folders, and render formats. These can be managed through the web interface.
