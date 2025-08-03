# Web Crawlers Feature

## Overview

The Web Crawlers feature allows you to download images and videos from various websites based on keywords. This feature is designed to help content creators gather media assets for their projects.

## Features

- **Multi-site Support**: Currently supports Pexels, Pixabay, and Unsplash
- **Content Types**: Download both images and videos
- **Batch Processing**: Create multiple crawler jobs
- **Progress Tracking**: Real-time progress monitoring
- **Organized Storage**: Files are saved in organized folder structure
- **Quality Settings**: Choose download quality and format

## Usage

### Creating a Crawler Job

1. Navigate to the `/crawlers` page
2. Click "Create Crawler" button
3. Fill in the form:
   - **Name**: A descriptive name for your crawler job
   - **Keyword**: The search term (e.g., "capybara", "bear", "nature")
   - **Site**: Choose from Pexels, Pixabay, or Unsplash
   - **Type**: Select "Image" or "Video"
   - **Channel**: Choose your content channel
   - **Topic**: Select the content topic
   - **Settings**:
     - Max Items: Number of files to download (1-100)
     - Quality: Low, Medium, or High
     - Format: File format (jpg, png, mp4, etc.)

### Folder Structure

Downloaded files are organized in the following structure:
```
public/
└── {channelName}/
    └── {topic}/
        └── crawler/
            └── {type}/
                ├── {keyword}_1.{format}
                ├── {keyword}_2.{format}
                └── ...
```

Example:
```
public/
└── rumitxnature/
    └── animals/
        └── crawler/
            └── video/
                ├── capybara_1.mp4
                ├── capybara_2.mp4
                └── ...
```

## Supported Websites

### Pexels
- **URL**: https://www.pexels.com
- **Content**: Images and Videos
- **Search**: Uses Pexels search functionality
- **Quality**: High-quality stock media

### Pixabay
- **URL**: https://pixabay.com
- **Content**: Images and Videos
- **Search**: Uses Pixabay search functionality
- **Quality**: Free stock media

### Unsplash
- **URL**: https://unsplash.com
- **Content**: Images only
- **Search**: Uses Unsplash search functionality
- **Quality**: High-quality photography

## Job Status

Crawler jobs can have the following statuses:

- **Pending**: Job created but not started
- **Crawling**: Currently searching for media
- **Downloading**: Currently downloading files
- **Completed**: All files downloaded successfully
- **Failed**: Job encountered an error
- **Paused**: Job temporarily stopped

## API Endpoints

### GET /api/crawlers
Get list of crawler jobs with filtering and pagination

### POST /api/crawlers
Create a new crawler job

### GET /api/crawlers/status-counts
Get count of jobs by status

### GET /api/crawlers/stats
Get overall crawler statistics

### POST /api/crawlers/batch-action
Perform batch actions (pause, resume, start)

### DELETE /api/crawlers/batch
Delete multiple crawler jobs

## Installation Requirements

To use the crawler functionality, you need to install Puppeteer:

```bash
npm install puppeteer
```

## Technical Details

### Crawler Service

The crawler functionality is implemented in `app/services/crawlerService.ts` and includes:

- **Puppeteer Integration**: Uses Puppeteer for web scraping
- **Multi-site Support**: Different crawlers for each supported site
- **Error Handling**: Comprehensive error handling and logging
- **File Management**: Automatic directory creation and file organization

### Components

- **CrawlersPage**: Main page component (`app/crawlers/page.tsx`)
- **CreateCrawlerDialog**: Dialog for creating new crawler jobs (`app/components/CreateCrawlerDialog.tsx`)

## Example Usage

### Creating a Capybara Video Crawler

1. Go to `/crawlers`
2. Click "Create Crawler"
3. Fill in:
   - Name: "Capybara Videos"
   - Keyword: "capybara"
   - Site: "Pexels"
   - Type: "Video"
   - Channel: "RumitX Nature"
   - Topic: "Animals"
   - Max Items: 10
   - Quality: "High"
   - Format: "mp4"

4. Click "Create Crawler"

The crawler will:
1. Search Pexels for "capybara" videos
2. Download up to 10 videos
3. Save them to `/public/rumitxnature/animals/crawler/video/`
4. Name files as `capybara_1.mp4`, `capybara_2.mp4`, etc.

## Notes

- The crawler respects website terms of service and rate limits
- Downloaded files are for personal/project use only
- Always check licensing requirements for downloaded content
- The crawler may take time depending on the number of files and internet speed

## Future Enhancements

- Support for more websites (Getty Images, Shutterstock, etc.)
- Advanced filtering options (date, size, orientation)
- Scheduled crawling
- Integration with content management systems
- Bulk keyword processing
- Custom download locations 