import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export interface CrawlerConfig {
  keyword: string;
  site: string;
  type: 'image' | 'video';
  maxItems: number;
  quality: 'low' | 'medium' | 'high';
  format: string;
  outputPath: string;
}

export interface CrawlerResult {
  success: boolean;
  downloadedItems: number;
  failedItems: number;
  totalItems: number;
  error?: string;
  files: string[];
}

export class CrawlerService {
  private browser: puppeteer.Browser | null = null;

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async crawlPexels(config: CrawlerConfig): Promise<CrawlerResult> {
    try {
      await this.init();
      const page = await this.browser!.newPage();
      
      const searchUrl = config.type === 'video' 
        ? `https://www.pexels.com/search/videos/${encodeURIComponent(config.keyword)}/`
        : `https://www.pexels.com/search/${encodeURIComponent(config.keyword)}/`;

      console.log(`Crawling Pexels for ${config.type}s with keyword: ${config.keyword}`);
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Wait for content to load
      await page.waitForSelector(config.type === 'video' ? 'video' : 'img', { timeout: 10000 });

      // Extract media URLs
      const mediaUrls = await page.evaluate((type: string) => {
        if (type === 'video') {
          const videos = document.querySelectorAll('video source');
          return Array.from(videos, (video) => (video as HTMLSourceElement).src).filter(Boolean);
        } else {
          const images = document.querySelectorAll('img[src*="images.pexels.com"]');
          return Array.from(images, (img) => (img as HTMLImageElement).src).filter(Boolean);
        }
      }, config.type);

      console.log(`Found ${mediaUrls.length} ${config.type}s`);

      // Limit to maxItems
      const urlsToDownload = mediaUrls.slice(0, config.maxItems);
      
      // Create output directory
      const outputDir = path.join(process.cwd(), 'public', config.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Download files
      const downloadedFiles: string[] = [];
      let failedCount = 0;

      for (let i = 0; i < urlsToDownload.length; i++) {
        try {
          const url = urlsToDownload[i];
          const fileName = `${config.keyword}_${i + 1}.${config.format}`;
          const filePath = path.join(outputDir, fileName);

          // Download file
          const response = await page.goto(url);
          if (response && response.ok()) {
            const buffer = await response.buffer();
            fs.writeFileSync(filePath, buffer);
            downloadedFiles.push(filePath);
            console.log(`Downloaded: ${fileName}`);
          } else {
            failedCount++;
            console.log(`Failed to download: ${url}`);
          }
        } catch (error) {
          failedCount++;
          console.error(`Error downloading file ${i + 1}:`, error);
        }
      }

      await page.close();

      return {
        success: true,
        downloadedItems: downloadedFiles.length,
        failedItems: failedCount,
        totalItems: urlsToDownload.length,
        files: downloadedFiles
      };

    } catch (error) {
      console.error('Error crawling Pexels:', error);
      return {
        success: false,
        downloadedItems: 0,
        failedItems: 0,
        totalItems: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        files: []
      };
    }
  }

  async crawlPixabay(config: CrawlerConfig): Promise<CrawlerResult> {
    try {
      await this.init();
      const page = await this.browser!.newPage();
      
      const searchUrl = config.type === 'video' 
        ? `https://pixabay.com/videos/search/${encodeURIComponent(config.keyword)}/`
        : `https://pixabay.com/images/search/${encodeURIComponent(config.keyword)}/`;

      console.log(`Crawling Pixabay for ${config.type}s with keyword: ${config.keyword}`);
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Wait for content to load
      await page.waitForSelector(config.type === 'video' ? 'video' : 'img', { timeout: 10000 });

      // Extract media URLs
      const mediaUrls = await page.evaluate((type: string) => {
        if (type === 'video') {
          const videos = document.querySelectorAll('video source');
          return Array.from(videos, (video) => (video as HTMLSourceElement).src).filter(Boolean);
        } else {
          const images = document.querySelectorAll('img[src*="cdn.pixabay.com"]');
          return Array.from(images, (img) => (img as HTMLImageElement).src).filter(Boolean);
        }
      }, config.type);

      console.log(`Found ${mediaUrls.length} ${config.type}s`);

      // Limit to maxItems
      const urlsToDownload = mediaUrls.slice(0, config.maxItems);
      
      // Create output directory
      const outputDir = path.join(process.cwd(), 'public', config.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Download files
      const downloadedFiles: string[] = [];
      let failedCount = 0;

      for (let i = 0; i < urlsToDownload.length; i++) {
        try {
          const url = urlsToDownload[i];
          const fileName = `${config.keyword}_${i + 1}.${config.format}`;
          const filePath = path.join(outputDir, fileName);

          // Download file
          const response = await page.goto(url);
          if (response && response.ok()) {
            const buffer = await response.buffer();
            fs.writeFileSync(filePath, buffer);
            downloadedFiles.push(filePath);
            console.log(`Downloaded: ${fileName}`);
          } else {
            failedCount++;
            console.log(`Failed to download: ${url}`);
          }
        } catch (error) {
          failedCount++;
          console.error(`Error downloading file ${i + 1}:`, error);
        }
      }

      await page.close();

      return {
        success: true,
        downloadedItems: downloadedFiles.length,
        failedItems: failedCount,
        totalItems: urlsToDownload.length,
        files: downloadedFiles
      };

    } catch (error) {
      console.error('Error crawling Pixabay:', error);
      return {
        success: false,
        downloadedItems: 0,
        failedItems: 0,
        totalItems: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        files: []
      };
    }
  }

  async crawlUnsplash(config: CrawlerConfig): Promise<CrawlerResult> {
    try {
      await this.init();
      const page = await this.browser!.newPage();
      
      const searchUrl = `https://unsplash.com/s/photos/${encodeURIComponent(config.keyword)}`;

      console.log(`Crawling Unsplash for images with keyword: ${config.keyword}`);
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Wait for content to load
      await page.waitForSelector('img', { timeout: 10000 });

      // Extract image URLs
      const imageUrls = await page.evaluate(() => {
        const images = document.querySelectorAll('img[src*="images.unsplash.com"]');
        return Array.from(images, (img) => (img as HTMLImageElement).src).filter(Boolean);
      });

      console.log(`Found ${imageUrls.length} images`);

      // Limit to maxItems
      const urlsToDownload = imageUrls.slice(0, config.maxItems);
      
      // Create output directory
      const outputDir = path.join(process.cwd(), 'public', config.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Download files
      const downloadedFiles: string[] = [];
      let failedCount = 0;

      for (let i = 0; i < urlsToDownload.length; i++) {
        try {
          const url = urlsToDownload[i];
          const fileName = `${config.keyword}_${i + 1}.${config.format}`;
          const filePath = path.join(outputDir, fileName);

          // Download file
          const response = await page.goto(url);
          if (response && response.ok()) {
            const buffer = await response.buffer();
            fs.writeFileSync(filePath, buffer);
            downloadedFiles.push(filePath);
            console.log(`Downloaded: ${fileName}`);
          } else {
            failedCount++;
            console.log(`Failed to download: ${url}`);
          }
        } catch (error) {
          failedCount++;
          console.error(`Error downloading file ${i + 1}:`, error);
        }
      }

      await page.close();

      return {
        success: true,
        downloadedItems: downloadedFiles.length,
        failedItems: failedCount,
        totalItems: urlsToDownload.length,
        files: downloadedFiles
      };

    } catch (error) {
      console.error('Error crawling Unsplash:', error);
      return {
        success: false,
        downloadedItems: 0,
        failedItems: 0,
        totalItems: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        files: []
      };
    }
  }

  async crawl(config: CrawlerConfig): Promise<CrawlerResult> {
    switch (config.site.toLowerCase()) {
      case 'pexels':
        return this.crawlPexels(config);
      case 'pixabay':
        return this.crawlPixabay(config);
      case 'unsplash':
        return this.crawlUnsplash(config);
      default:
        throw new Error(`Unsupported site: ${config.site}`);
    }
  }
}

export const crawlerService = new CrawlerService(); 