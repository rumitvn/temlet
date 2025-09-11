import { prisma } from '@/app/lib/db';
import { config } from '@/lib/config';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import type { Browser } from 'puppeteer';

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
  private prisma: typeof prisma;

  constructor() {
    this.prisma = prisma;
  }

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
    let browser: Browser | null = null;
    try {
      await this.updateJobStatus(id, 'crawling');
      const job = await this.getJob(id);
      if (!job) {
        throw new Error('Job not found');
      }

      const { keyword, site, type, channel, topic, settings } = job;
      const { maxItems, quality, format } = settings;

      console.log(`Starting real crawl for: ${keyword} on ${site}, type: ${type}`);

      // Configure browser with stealth mode
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-infobars',
          '--window-position=0,0',
          '--ignore-certifcate-errors',
          '--ignore-certifcate-errors-spki-list',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        ],
      });

      const page = await browser.newPage();
      
      // Add stealth configurations
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br'
      });

      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      });

      let videoUrls: string[] = [];
      let totalItems = 0;

      // Crawl based on site and type
      if (site === 'freepik') {
        console.log(`Crawling Freepik for videos with keyword: ${keyword}`);
        
        // Use the search URL with free content filter
        const searchUrl = `https://www.freepik.com/search?format=search&query=${encodeURIComponent(keyword)}&selection=1&type=video`;
        console.log('Search URL:', searchUrl);
        
        try {
          // Create output directory
          const outputDir = path.join(config.workingDirectory, channel.toLowerCase(), topic.toLowerCase(), 'crawler', type, keyword);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          // Set initial status to crawling
          await this.updateJobStatus(id, 'crawling', 0);

          // Navigate with longer timeout and wait for network to be idle
          console.log('Navigating to search page...');
          await page.goto(searchUrl, { 
            waitUntil: ['networkidle2', 'domcontentloaded'], 
            timeout: 45000 
          });

          // Wait for JavaScript to initialize...
          console.log('Waiting for JavaScript to initialize...');
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Wait for the content to be loaded
          console.log('Waiting for content to load...');
          await page.waitForFunction(() => {
            // Check for either videos or no results message
            return (
              document.querySelectorAll('[class*="gridItem"], [class*="listItem"], [class*="card"], [class*="showcase"], article, [data-type="video"]').length > 0 ||
              document.querySelector('[class*="empty"], [class*="noResults"]') !== null
            );
          }, { timeout: 30000 });

          // Log the page content for debugging
          const pageContent = await page.content();
          console.log('Page loaded. Content length:', pageContent.length);
          console.log('First 500 characters:', pageContent.substring(0, 500));

          // Check for any error messages or captcha
          const hasError = await page.evaluate(() => {
            const errorElements = document.querySelectorAll('.error-message, .captcha, .blocked-message');
            return Array.from(errorElements).map(el => el.textContent).join(', ');
          });

          if (hasError) {
            console.log('Found error message on page:', hasError);
            throw new Error(`Page error: ${hasError}`);
          }

          // Try to find any video elements with broader selectors
          console.log('Searching for video elements...');
          const videoElements = await page.evaluate(() => {
            const selectors = [
              // Grid and list items
              '[class*="gridItem"]',
              '[class*="listItem"]',
              // Cards and articles
              '[class*="card"]',
              'article',
              // Video specific
              '[data-type="video"]',
              '[data-category="video"]',
              // Generic containers
              '[class*="item"]',
              '[class*="showcase"]',
              // Specific Freepik selectors (based on their current structure)
              '[class*="ResultsContainer"] > div',
              '[class*="SearchResults"] > div'
            ];

            const elements = document.querySelectorAll(selectors.join(', '));
            console.log('Found elements:', elements.length);

            // Log some details about what we found
            const details = Array.from(elements).map(el => ({
              classes: el.className,
              type: el.getAttribute('data-type'),
              href: el.querySelector('a')?.href,
              text: el.textContent?.slice(0, 50)
            }));

            return {
              count: elements.length,
              details
            };
          });

          console.log('Video elements found:', videoElements.count);
          console.log('Element details:', JSON.stringify(videoElements.details, null, 2));

          // Extract video URLs with broader matching
          const detailUrls = await page.evaluate(() => {
            const urls = new Set<string>();
            
            // Get all links that match video detail pages
            document.querySelectorAll('a[href*="/free-video/"]').forEach((link: any) => {
              const href = link.href;
              
              // Skip navigation/menu links and ensure it's a valid video detail page
              if (href && 
                  !href.includes('#from_element') && 
                  !href.includes('/videos#') &&
                  href.includes('/free-video/') &&
                  href.match(/\/free-video\/[^\/]+_\d+/)) { // Must match pattern: /free-video/title_number
                urls.add(href);
              }
            });

            return Array.from(urls);
          });

          console.log(`Found ${detailUrls.length} video detail URLs:`, detailUrls);

          if (detailUrls.length === 0) {
            // Try to get more information about the page state
            const pageState = await page.evaluate(() => ({
              title: document.title,
              url: window.location.href,
              bodyClasses: document.body.className,
              mainContent: document.querySelector('main')?.innerHTML?.length || 0,
              errorMessages: Array.from(document.querySelectorAll('.error, .message, .notification')).map(el => el.textContent),
              totalLinks: document.querySelectorAll('a').length,
              possibleVideos: document.querySelectorAll('[data-type="video"], video, .video').length
            }));

            console.log('Page state when no videos found:', pageState);
            throw new Error(`No videos found for keyword: ${keyword}. Page title: ${pageState.title}`);
          }

          // Process each detail URL
          const downloadUrls: string[] = [];
          
          for (const detailUrl of detailUrls.slice(0, maxItems)) {
            try {
              console.log(`\nProcessing detail page: ${detailUrl}`);
              await page.goto(detailUrl, { 
                waitUntil: ['networkidle2', 'domcontentloaded'],
                timeout: 30000 
              });

              // Wait for the page to be fully loaded
              await new Promise(resolve => setTimeout(resolve, 3000));

              // Try to find download options
              const downloadInfo = await page.evaluate(() => {
                const info: any = {
                  isPremium: false,
                  downloadUrl: null,
                  buttonFound: false,
                  selectors: []
                };

                // Check premium status
                const premiumIndicators = document.querySelectorAll('.premium, [data-premium="true"], .premium-badge');
                info.isPremium = premiumIndicators.length > 0;

                // Look for download buttons and URLs
                const downloadSelectors = [
                  'a[href*=".mp4"]',
                  'button[data-download]',
                  '.download-button',
                  '[data-type="download"]',
                  'video source',
                  '.video-player source',
                  '[data-video-source]'
                ];

                for (const selector of downloadSelectors) {
                  const element = document.querySelector(selector);
                  if (element) {
                    info.selectors.push(selector);
                    info.buttonFound = true;
                    
                    // Try various attributes that might contain the URL
                    const url = element.getAttribute('href') ||
                              element.getAttribute('src') ||
                              element.getAttribute('data-src') ||
                              element.getAttribute('data-download') ||
                              element.getAttribute('data-video-source');
                              
                    if (url && url.includes('.mp4')) {
                      info.downloadUrl = url;
                      break;
                    }
                  }
                }

                return info;
              });

              console.log('Download info:', downloadInfo);

              if (downloadInfo.downloadUrl) {
                downloadUrls.push(downloadInfo.downloadUrl);
                console.log(`Found download URL: ${downloadInfo.downloadUrl}`);
              } else {
                console.log(`No download URL found. Premium: ${downloadInfo.isPremium}, Button found: ${downloadInfo.buttonFound}`);
              }

              await new Promise(resolve => setTimeout(resolve, 1500));
              
            } catch (error) {
              console.error(`Error processing detail page ${detailUrl}:`, error);
            }
          }

          // Update status to downloading before starting downloads
          console.log('Starting download phase...');
          await this.updateJobStatus(id, 'downloading', 0);
          
          videoUrls = downloadUrls;
          totalItems = downloadUrls.length;

          // Update job with total items found
          await this.prisma.crawlerJob.update({
            where: { id },
            data: {
              totalItems,
              downloadedItems: 0,
              failedItems: 0
            }
          });

          // Download files
          let downloadedItems = 0;
          let failedItems = 0;

          for (let i = 0; i < videoUrls.length; i++) {
            try {
              const videoUrl = videoUrls[i];
              console.log(`Downloading video ${i + 1}/${totalItems}: ${videoUrl}`);

              // Download video using node-fetch with timeout
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 60000);

              try {
                const response = await fetch(videoUrl, { 
                  signal: controller.signal,
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                    'Accept': 'video/mp4,video/*',
                    'Referer': 'https://www.freepik.com/'
                  }
                });

                if (!response.ok) {
                  throw new Error(`Failed to download video: ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                const filename = `${keyword}_${site}_${i + 1}.mp4`;
                const outputPath = path.join(outputDir, filename);
                fs.writeFileSync(outputPath, buffer);

                downloadedItems++;
                const progress = Math.round((downloadedItems / totalItems) * 100);
                
                // Update progress
                await this.prisma.crawlerJob.update({
                  where: { id },
                  data: {
                    status: 'downloading',
                    progress,
                    downloadedItems,
                    failedItems
                  }
                });

              } catch (error) {
                console.error(`Error downloading video ${i + 1}:`, error);
                failedItems++;
                
                // Update failed items count
                await this.prisma.crawlerJob.update({
                  where: { id },
                  data: {
                    failedItems,
                    downloadedItems
                  }
                });
              } finally {
                clearTimeout(timeout);
              }

              // Add a small delay between downloads
              await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
              console.error(`Error processing video ${i + 1}:`, error);
              failedItems++;
            }
          }

          // Update final status
          if (downloadedItems === 0) {
            await this.updateJobStatus(id, 'failed', 100, 'Failed to download any videos');
          } else if (failedItems > 0) {
            await this.updateJobStatus(id, 'completed', 100, `Completed with ${failedItems} failed videos`);
          } else {
            await this.updateJobStatus(id, 'completed', 100);
          }

          console.log(`Job ${id} completed: Downloaded ${downloadedItems} videos, Failed ${failedItems}`);
          
        } catch (error) {
          console.error('Error crawling Freepik:', error);
          await this.updateJobStatus(id, 'failed', undefined, `Failed to crawl Freepik videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw new Error(`Failed to crawl Freepik videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (site === 'mixkit') {
        console.log(`Crawling Mixkit for videos with keyword: ${keyword}`);
        
        // First go to the search results page
        const searchUrl = `https://mixkit.co/free-stock-video/${encodeURIComponent(keyword)}/`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        try {
          // Wait for any video content to load
          await page.waitForSelector('a[href*="/free-stock-video/"][href*="-"]', { timeout: 20000 });
          
          // Scroll to load more videos
          for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          // Extract video IDs and titles directly from the search page
          const videos = await page.evaluate((maxItems) => {
            const items: { id: string; title: string }[] = [];
            
            // Get all video links that end with a number
            document.querySelectorAll('a[href*="/free-stock-video/"]').forEach((link: any) => {
              // Only collect up to maxItems
              if (items.length >= maxItems) return;

              const href = link.href;
              // Match URLs that end with a number after the last dash
              const match = href.match(/\/free-stock-video\/([^\/]+)\-(\d+)\/?$/);
              if (match && !href.includes('elements.envato.com')) {
                const title = match[1].replace(/-/g, ' ');
                const id = match[2];
                if (!items.some(item => item.id === id)) {
                  items.push({ id, title });
                }
              }
            });
            
            return items;
          }, maxItems);

          console.log(`Found ${videos.length} videos on Mixkit (limited to ${maxItems})`);
          console.log('First few videos:', videos.slice(0, 3));

          // For each video, construct the direct download URL
          const downloadUrls: string[] = [];

          for (const video of videos) {
            try {
              // Construct direct download URL
              const downloadUrl = `https://assets.mixkit.co/videos/${video.id}/${video.id}-720.mp4`;
              console.log(`Checking download URL for video ${video.id}: ${downloadUrl}`);

              // Verify the URL is accessible
              const response = await fetch(downloadUrl, {
                method: 'HEAD',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                  'Accept': 'video/mp4,video/*',
                  'Referer': 'https://mixkit.co/'
                }
              });

              if (response.ok) {
                downloadUrls.push(downloadUrl);
                console.log(`Found working download URL for video ${video.id}`);
              } else {
                console.error(`Download URL returned status ${response.status} for video ${video.id}`);
              }
            } catch (error) {
              console.error(`Error checking download URL for video ${video.id}:`, error);
            }

            // Add a small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          videoUrls = [...new Set(downloadUrls)]; // Remove duplicates
          console.log(`Successfully got ${videoUrls.length} download URLs from Mixkit`);
          totalItems = videoUrls.length;
          
        } catch (error) {
          console.error('Error crawling Mixkit:', error);
          throw new Error('Failed to crawl Mixkit videos');
        }
      }

      if (totalItems === 0) {
        throw new Error(`No ${type}s found for the given keyword`);
      }

      // Debug: Show what we found
      console.log(`Found ${totalItems} ${type}s to download`);
      console.log('First few video URLs:', videoUrls.slice(0, 3));

      // Create output directory if it doesn't exist
      const outputDir = path.join(config.workingDirectory, channel.toLowerCase(), topic.toLowerCase(), 'crawler', type, keyword);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Update job with total items found
      await this.prisma.crawlerJob.update({
        where: { id },
        data: {
          totalItems,
          status: 'downloading',
          progress: 0
        }
      });

      // Download files
      let downloadedItems = 0;
      let failedItems = 0;

      for (let i = 0; i < videoUrls.length; i++) {
        try {
          const videoUrl = videoUrls[i];
          console.log(`Downloading video ${i + 1}/${totalItems}: ${videoUrl}`);

          // Download video using node-fetch with timeout
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 60000); // Increase timeout for video downloads

          try {
            const response = await fetch(videoUrl, { 
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Accept': 'video/mp4,video/*',
                'Referer': 'https://mixkit.co/'
              }
            });

            if (!response.ok) {
              throw new Error(`Failed to download video: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const filename = `${keyword}_${site}_${i + 1}.mp4`; // Changed extension to .mp4
            const outputPath = path.join(outputDir, filename);
            fs.writeFileSync(outputPath, buffer);

            downloadedItems++;
            const progress = Math.round((downloadedItems / totalItems) * 100);
            
            await this.prisma.crawlerJob.update({
              where: { id },
              data: {
                status: 'downloading',
                progress,
                downloadedItems,
                failedItems
              }
            });

          } catch (error) {
            console.error(`Error downloading video ${i + 1}:`, error);
            failedItems++;
          } finally {
            clearTimeout(timeout);
          }

        } catch (error) {
          console.error(`Error processing video ${i + 1}:`, error);
          failedItems++;
          
          await this.prisma.crawlerJob.update({
            where: { id },
            data: {
              status: 'downloading',
              downloadedItems,
              failedItems
            }
          });
        }
      }

      // Update final status
      if (downloadedItems === 0) {
        await this.prisma.crawlerJob.update({
          where: { id },
          data: {
            status: 'failed',
            progress: 100,
            error: `Failed to download any ${type}s`
          }
        });
      } else if (failedItems > 0) {
        await this.prisma.crawlerJob.update({
          where: { id },
          data: {
            status: 'completed',
            progress: 100,
            error: `Completed with ${failedItems} failed ${type}s`
          }
        });
      } else {
        await this.prisma.crawlerJob.update({
          where: { id },
          data: {
            status: 'completed',
            progress: 100
          }
        });
      }
      
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