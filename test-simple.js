import { PrismaClient } from '@prisma/client';

console.log('🔍 Testing Prisma client...');

const prisma = new PrismaClient();

// Check if models exist
console.log('prisma.renderItem exists:', !!prisma.renderItem);
console.log('prisma.crawlerJob exists:', !!prisma.crawlerJob);

// Check model types
console.log('prisma.renderItem type:', typeof prisma.renderItem);
console.log('prisma.crawlerJob type:', typeof prisma.crawlerJob);

// List all properties of prisma
console.log('All prisma properties:', Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_'))); 