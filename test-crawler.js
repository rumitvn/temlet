import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('Testing Prisma client...');
console.log('renderItem available:', !!prisma.renderItem);
console.log('crawlerJob available:', !!prisma.crawlerJob);

// Try to access crawlerJob
if (prisma.crawlerJob) {
  console.log('✅ CrawlerJob model is available!');
  console.log('Type:', typeof prisma.crawlerJob);
} else {
  console.log('❌ CrawlerJob model is NOT available');
}

// List all available models
const models = Object.keys(prisma).filter(key => 
  !key.startsWith('$') && 
  !key.startsWith('_') && 
  typeof prisma[key] === 'object'
);
console.log('Available models:', models); 