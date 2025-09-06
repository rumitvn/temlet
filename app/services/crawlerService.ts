import { prisma } from '@/app/lib/db';
import { config } from '@/lib/config';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

/**
 * Crawler Service for downloading images and videos from various sites
 * 
 * Path Structure:
 * - Uses WORKING_DIRECTORY environment variable as base path
 * - Creates structure: {WORKING_DIRECTORY}/{channel}/{topic}/crawler/{type}/{keyword}/
 * - Example: C:/Users/youruser/Documents/animals/wildlife/crawler/image/capybara/
 * - For videos: C:/Users/youruser/Documents/animals/wildlife/crawler/video/capybara/
 * 
 * File Naming:
 * - Format: {keyword}_{site}_{index}.{format}
 * - Example: capybara_pexels_1.jpg, capybara_pixabay_2.png
 * - Benefits: Easy sorting by keyword, then by site, then by index
 * 
 * Supported Sites:
 * - Pexels (images)
 * - Pixabay (images) 
 * - Unsplash (images)
 * - Video crawling not yet implemented
 */
export interface CrawlerConfig {
  keyword: string;
  site: string;
  type: 'image' | 'video';
  maxItems: number;
  quality: 'low' | 'medium' | 'high';
  format: string;
}

export interface CrawlerResult {
  success: boolean;
  downloadedItems: number;
  failedItems: number;
  totalItems: number;
  error?: string;
  files: string[];
}

export interface CrawlerJob {
  id: string;
  name: string;
  keyword: string;
  site: string;
  type: 'image' | 'video';
  channel: string;
  topic: string;
  status: 'pending' | 'crawling' | 'downloading' | 'completed' | 'failed' | 'paused';
  progress: number;
  totalItems: number;
  downloadedItems: number;
  failedItems: number;
  createdAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  error?: string | null;
  outputPath?: string | null;
  settings: {
    maxItems: number;
    quality: 'low' | 'medium' | 'high';
    format: string;
  };
}

export class CrawlerService {
  async createJob(data: Omit<CrawlerJob, 'id' | 'status' | 'progress' | 'totalItems' | 'downloadedItems' | 'failedItems' | 'createdAt' | 'updatedAt'>): Promise<CrawlerJob> {
    try {
      // Test database connection first
      await prisma.$connect();
      
      const job = await prisma.crawlerJob.create({
        data: {
          name: data.name,
          keyword: data.keyword,
          site: data.site,
          type: data.type,
          channel: data.channel,
          topic: data.topic,
          status: 'pending',
          progress: 0,
          totalItems: 0,
          downloadedItems: 0,
          failedItems: 0,
          outputPath: '',
          settings: data.settings
        }
      });

      return {
        ...job,
        type: job.type as 'image' | 'video',
        status: job.status as 'pending' | 'crawling' | 'downloading' | 'completed' | 'failed' | 'paused',
        settings: job.settings as any
      };
    } catch (error) {
      console.error('Error creating crawler job:', error);
      
      // Check if it's a database connection issue
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
          throw new Error('Database connection failed. Please check your database configuration.');
        }
        if (error.message.includes('relation "CrawlerJob" does not exist')) {
          throw new Error('CrawlerJob table not found. Please run database migrations.');
        }
      }
      
      throw new Error(`Failed to create crawler job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getJob(id: string): Promise<CrawlerJob | null> {
    try {
      const job = await prisma.crawlerJob.findUnique({
        where: { id }
      });

      if (!job) return null;

      return {
        ...job,
        type: job.type as 'image' | 'video',
        status: job.status as 'pending' | 'crawling' | 'downloading' | 'completed' | 'failed' | 'paused',
        settings: job.settings as any
      };
    } catch (error) {
      console.error('Error fetching crawler job:', error);
      return null;
    }
  }

  async updateJobStatus(id: string, status: CrawlerJob['status'], progress?: number, error?: string): Promise<void> {
    try {
      const updateData: any = { status };
      
      if (progress !== undefined) updateData.progress = progress;
      if (error !== undefined) updateData.error = error;
      
      if (status === 'crawling' || status === 'downloading') {
        updateData.startedAt = new Date();
      } else if (status === 'completed' || status === 'failed') {
        updateData.completedAt = new Date();
      }

      await prisma.crawlerJob.update({
        where: { id },
        data: updateData
      });
    } catch (error) {
      console.error('Error updating job status:', error);
      throw new Error('Failed to update job status');
    }
  }

  async updateJobProgress(id: string, progress: number, downloadedItems: number, failedItems: number, totalItems: number): Promise<void> {
    try {
      await prisma.crawlerJob.update({
        where: { id },
        data: {
          progress,
          downloadedItems,
          failedItems,
          totalItems
        }
      });
    } catch (error) {
      console.error('Error updating job progress:', error);
      throw new Error('Failed to update job progress');
    }
  }

  async getAllJobs(page: number = 1, limit: number = 20, filters: any = {}): Promise<{ jobs: CrawlerJob[], totalPages: number, totalJobs: number }> {
    try {
      // Test database connection first
      await prisma.$connect();
      
      const where: any = {};
      
      if (filters.q) {
        where.OR = [
          { name: { contains: filters.q, mode: 'insensitive' } },
          { keyword: { contains: filters.q, mode: 'insensitive' } }
        ];
      }
      
      if (filters.type) where.type = filters.type;
      if (filters.topic) where.topic = filters.topic;
      if (filters.channel) where.channel = filters.channel;
      if (filters.site) where.site = filters.site;
      if (filters.status) where.status = filters.status;

      const totalJobs = await prisma.crawlerJob.count({ where });
      const totalPages = Math.ceil(totalJobs / limit);
      const skip = (page - 1) * limit;

      const jobs = await prisma.crawlerJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc' }
      });

      const formattedJobs = jobs.map((job: any) => ({
        ...job,
        type: job.type as 'image' | 'video',
        status: job.status as 'pending' | 'crawling' | 'downloading' | 'completed' | 'failed' | 'paused',
        settings: job.settings as any
      }));

      return {
        jobs: formattedJobs,
        totalPages,
        totalJobs
      };
    } catch (error) {
      console.error('Error fetching jobs:', error);
      
      // Check if it's a database connection issue
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
          throw new Error('Database connection failed. Please check your database configuration.');
        }
        if (error.message.includes('relation "CrawlerJob" does not exist')) {
          throw new Error('CrawlerJob table not found. Please run database migrations.');
        }
      }
      
      throw new Error(`Failed to fetch jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStatusCounts(): Promise<Partial<Record<CrawlerJob['status'], number>>> {
    try {
      const counts = await prisma.crawlerJob.groupBy({
        by: ['status'],
        _count: { status: true }
      });

      const result: Partial<Record<CrawlerJob['status'], number>> = {};
      counts.forEach((count: any) => {
        result[count.status as CrawlerJob['status']] = count._count.status;
      });

      return result;
    } catch (error) {
      console.error('Error fetching status counts:', error);
      return {};
    }
  }

  async getStats(): Promise<{
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalDownloaded: number;
    totalFailed: number;
    averageSpeed: number;
  }> {
    try {
      const [
        totalJobs,
        activeJobs,
        completedJobs,
        failedJobs,
        totalDownloaded,
        totalFailed
      ] = await Promise.all([
        prisma.crawlerJob.count(),
        prisma.crawlerJob.count({
          where: { status: { in: ['pending', 'crawling', 'downloading'] } }
        }),
        prisma.crawlerJob.count({ where: { status: 'completed' } }),
        prisma.crawlerJob.count({ where: { status: 'failed' } }),
        prisma.crawlerJob.aggregate({
          _sum: { downloadedItems: true }
        }),
        prisma.crawlerJob.aggregate({
          _sum: { failedItems: true }
        })
      ]);

      return {
        totalJobs,
        activeJobs,
        completedJobs,
        failedJobs,
        totalDownloaded: totalDownloaded._sum.downloadedItems || 0,
        totalFailed: totalFailed._sum.failedItems || 0,
        averageSpeed: 0
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        totalJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        totalDownloaded: 0,
        totalFailed: 0,
        averageSpeed: 0
      };
    }
  }

  async deleteJob(id: string): Promise<void> {
    try {
      await prisma.crawlerJob.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error deleting job:', error);
      throw new Error('Failed to delete job');
    }
  }

  async deleteJobs(ids: string[]): Promise<void> {
    try {
      await prisma.crawlerJob.deleteMany({
        where: { id: { in: ids } }
      });
    } catch (error) {
      console.error('Error deleting jobs:', error);
      throw new Error('Failed to delete jobs');
    }
  }

  async startJob(id: string): Promise<void> {
    let browser;
    try {
      await this.updateJobStatus(id, 'crawling');
      console.log(`Starting job ${id}`);
      
      // Get job details
      const job = await this.getJob(id);
      if (!job) {
        throw new Error(`Job ${id} not found`);
      }

      const { keyword, site, type, settings } = job;
      const { maxItems, quality, format } = settings;

      console.log(`Starting real crawl for: ${keyword} on ${site}, type: ${type}`);

      // Launch browser
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Set user agent to avoid being blocked
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      let imageUrls: string[] = [];
      let totalItems = 0;

      // Crawl based on site and type
      if (site === 'pexels' && type === 'image') {
        console.log(`Crawling Pexels for images with keyword: ${keyword}`);
        
        const searchUrl = `https://www.pexels.com/search/${encodeURIComponent(keyword)}/`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });
        
        // Wait for images to load
        await page.waitForSelector('img', { timeout: 10000 });
        
        // Scroll to load more images
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Extract image URLs with better filtering
        imageUrls = await page.evaluate((keyword) => {
          // Look for actual search result images, not promotional content
          const images = document.querySelectorAll('img');
          const validImages: string[] = [];
          
          images.forEach((img: any) => {
            const src = img.src;
            const alt = img.alt || '';
            const parent = img.closest('article, .photo-item, .search-result-item, [data-testid*="photo"]');
            
            // Skip promotional images
            if (src.includes('canva') || 
                src.includes('assets/static') || 
                src.includes('lib/') ||
                src.includes('promo') ||
                src.includes('advertisement') ||
                src.includes('banner')) {
              return;
            }
            
            // Only include images that are likely search results
            if (src.includes('images.pexels.com/photos/') && 
                src.includes('pexels-photo-') &&
                src.includes('auto=compress') &&
                parent) {
              validImages.push(src);
            }
          });
          
          // Remove duplicates and return
          return [...new Set(validImages)];
        }, keyword);
        
        totalItems = Math.min(imageUrls.length, maxItems);
        imageUrls = imageUrls.slice(0, totalItems);
        
        console.log(`Filtered to ${totalItems} valid search result images`);
        
      } else if (site === 'pixabay' && type === 'image') {
        console.log(`Crawling Pixabay for images with keyword: ${keyword}`);
        
        const searchUrl = `https://pixabay.com/images/search/${encodeURIComponent(keyword)}/`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });
        
        await page.waitForSelector('img', { timeout: 10000 });
        
        // Scroll to load more images
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Extract image URLs with better filtering
        imageUrls = await page.evaluate((keyword) => {
          const images = document.querySelectorAll('img');
          const validImages: string[] = [];
          
          images.forEach((img: any) => {
            const src = img.src;
            const parent = img.closest('.item, .photo, .search-result, [data-id]');
            
            // Skip promotional and non-search images
            if (src.includes('cdn.pixabay.com/photo/') && 
                src.includes('_') && // Pixabay photos have underscores
                src.includes('_640') && // Standard size indicator
                parent) {
              validImages.push(src);
            }
          });
          
          return [...new Set(validImages)];
        }, keyword);
        
        totalItems = Math.min(imageUrls.length, maxItems);
        imageUrls = imageUrls.slice(0, totalItems);
        
        console.log(`Filtered to ${totalItems} valid search result images`);
        
      } else if (site === 'unsplash' && type === 'image') {
        console.log(`Crawling Unsplash for images with keyword: ${keyword}`);
        
        const searchUrl = `https://unsplash.com/s/photos/${encodeURIComponent(keyword)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });
        
        await page.waitForSelector('img', { timeout: 10000 });
        
        // Scroll to load more images
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Extract image URLs with better filtering
        imageUrls = await page.evaluate((keyword) => {
          const images = document.querySelectorAll('img');
          const validImages: string[] = [];
          
          images.forEach((img: any) => {
            const src = img.src;
            const parent = img.closest('figure, .photo-item, .search-result, [data-testid*="photo"]');
            
            // Skip promotional and non-search images
            if (src.includes('images.unsplash.com/photo-') && 
                src.includes('?') && // Unsplash photos have query parameters
                src.includes('w=') && // Width parameter
                parent) {
              validImages.push(src);
            }
          });
          
          return [...new Set(validImages)];
        }, keyword);
        
        totalItems = Math.min(imageUrls.length, maxItems);
        imageUrls = imageUrls.slice(0, totalItems);
        
        console.log(`Filtered to ${totalItems} valid search result images`);
      }

      console.log(`Found ${totalItems} images to download`);

      if (totalItems === 0) {
        throw new Error('No images found for the given keyword');
      }

      // Debug: Show what we found
      console.log('Image URLs found:');
      imageUrls.slice(0, 5).forEach((url, index) => {
        console.log(`  ${index + 1}: ${url}`);
      });
      if (imageUrls.length > 5) {
        console.log(`  ... and ${imageUrls.length - 5} more`);
      }

      // If we found fewer images than requested, try to get more
      if (totalItems < maxItems && site === 'pexels') {
        console.log(`Found only ${totalItems} images, trying to get more...`);
        
        // Scroll more and try different selectors
        await page.evaluate(() => {
          window.scrollTo(0, 0);
          window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Try alternative selectors for Pexels
        const additionalImages = await page.evaluate((keyword) => {
          const images = document.querySelectorAll('img[src*="images.pexels.com/photos/"]');
          const validImages: string[] = [];
          
          images.forEach((img: any) => {
            const src = img.src;
            if (src.includes('pexels-photo-') && 
                src.includes('auto=compress') &&
                !src.includes('canva') &&
                !src.includes('assets/static') &&
                !src.includes('lib/')) {
              validImages.push(src);
            }
          });
          
          return [...new Set(validImages)];
        }, keyword);
        
        if (additionalImages.length > imageUrls.length) {
          imageUrls = additionalImages;
          totalItems = Math.min(imageUrls.length, maxItems);
          imageUrls = imageUrls.slice(0, totalItems);
          console.log(`Found ${totalItems} total images after fallback`);
        }
      }

      // Update progress to show items found
      await this.updateJobProgress(id, 10, 0, 0, totalItems);

      // Create output directory using WORKING_DIRECTORY with channel/topic structure
      // Path will be: {WORKING_DIRECTORY}/{channel}/{topic}/crawler/{type}/{keyword}/
      // Example: C:/Users/youruser/Documents/animals/wildlife/crawler/image/capybara/
      // For videos: C:/Users/youruser/Documents/animals/wildlife/crawler/video/capybara/
      const outputDir = config.getCrawlerPathsWithKeyword(job.channel, job.topic, job.keyword)[job.type];
      console.log(`Creating output directory: ${outputDir}`);
      console.log(`Base working directory: ${config.workingDirectory}`);
      console.log(`Channel: ${job.channel}, Topic: ${job.topic}, Type: ${job.type}, Keyword: ${job.keyword}`);
      console.log(`File naming pattern: ${job.keyword}_${job.site}_[index].${job.settings.format}`);
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`Successfully created directory: ${outputDir}`);
      } else {
        console.log(`Directory already exists: ${outputDir}`);
      }

      // Update status to downloading before starting downloads
      await this.updateJobStatus(id, 'downloading');

      // Download images
      let downloadedItems = 0;
      let failedItems = 0;

      // Note: Currently only image crawling is implemented
      // Video crawling would need similar site-specific implementations
      // for sites like YouTube, Vimeo, etc.
      for (let i = 0; i < imageUrls.length; i++) {
        try {
          const imageUrl = imageUrls[i];
          console.log(`Downloading ${job.type} ${i + 1}/${totalItems}: ${imageUrl}`);
          
          // Download image using page.goto and response.buffer()
          const response = await page.goto(imageUrl);
          if (response && response.ok()) {
            const buffer = await response.buffer();
            const fileName = `${keyword}_${site}_${i + 1}.${format}`;
            const filePath = path.join(outputDir, fileName);
            
            console.log(`Saving file: ${fileName} to: ${filePath}`);
            fs.writeFileSync(filePath, buffer);
            downloadedItems++;
            
            console.log(`Successfully downloaded: ${fileName}`);
          } else {
            failedItems++;
            console.log(`Failed to download ${job.type} ${i + 1}`);
          }
        } catch (error) {
          failedItems++;
          console.error(`Error downloading ${job.type} ${i + 1}:`, error);
        }

        // Update progress
        const progress = Math.floor(((i + 1) / totalItems) * 100);
        await this.updateJobProgress(id, progress, downloadedItems, failedItems, totalItems);
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Mark job as completed when all possible downloads are finished
      const actualTotal = downloadedItems + failedItems;
      const finalProgress = Math.floor((downloadedItems / totalItems) * 100);
      
      // Update final status and progress
      await this.updateJobStatus(id, 'completed');
      await this.updateJobProgress(id, finalProgress, downloadedItems, failedItems, totalItems);
      
      console.log(`Job ${id} completed: Downloaded ${downloadedItems} ${job.type}s, Failed ${failedItems}`);

    } catch (error) {
      console.error(`Error starting job ${id}:`, error);
      await this.updateJobStatus(id, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Failed to start job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async pauseJob(id: string): Promise<void> {
    try {
      await this.updateJobStatus(id, 'paused');
    } catch (error) {
      console.error('Error pausing job:', error);
      throw new Error('Failed to pause job');
    }
  }

  async resumeJob(id: string): Promise<void> {
    try {
      const job = await this.getJob(id);
      if (!job) {
        throw new Error('Job not found');
      }

      // Update status first
      await this.updateJobStatus(id, 'crawling');

      // Start the job process
      this.startJob(id).catch(error => {
        console.error(`Error starting resumed job ${id}:`, error);
        // If starting fails, mark as failed
        this.updateJobStatus(id, 'failed', undefined, error instanceof Error ? error.message : 'Failed to resume job');
      });
    } catch (error) {
      console.error('Error resuming job:', error);
      throw new Error('Failed to resume job');
    }
  }

  // Note: The actual crawling methods would need to be implemented with a proper web scraping library
  async crawl(config: CrawlerConfig): Promise<CrawlerResult> {
    // This would be implemented with a proper web scraping solution
    // For now, return a mock result
    return {
      success: true,
      downloadedItems: 0,
      failedItems: 0,
      totalItems: 0,
      files: []
    };
  }
}

export const crawlerService = new CrawlerService(); 