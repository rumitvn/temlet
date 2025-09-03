import { PrismaClient } from '@prisma/client';

async function testPrismaModels() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing Prisma client models...');
    
    // Check what models are available
    console.log('Available models in Prisma client:');
    console.log('- prisma.renderItem:', typeof prisma.renderItem);
    console.log('- prisma.crawlerJob:', typeof prisma.crawlerJob);
    console.log('- prisma.template:', typeof prisma.template);
    console.log('- prisma.outputFolder:', typeof prisma.outputFolder);
    console.log('- prisma.renderFormat:', typeof prisma.renderFormat);
    
    // Test if renderItem works (we know this works)
    try {
      const renderItemCount = await prisma.renderItem.count();
      console.log('✅ prisma.renderItem.count() works:', renderItemCount);
    } catch (error) {
      console.log('❌ prisma.renderItem.count() failed:', error.message);
    }
    
    // Test if crawlerJob works
    try {
      const crawlerJobCount = await prisma.crawlerJob.count();
      console.log('✅ prisma.crawlerJob.count() works:', crawlerJobCount);
    } catch (error) {
      console.log('❌ prisma.crawlerJob.count() failed:', error.message);
      
      // Check if it's a table not found error
      if (error.message.includes('relation "CrawlerJob" does not exist')) {
        console.log('💡 The CrawlerJob table does not exist in the database!');
        console.log('💡 You need to run: npx prisma db push');
      }
    }
    
    // Check database schema
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      console.log('📋 Tables in database:', tables.map(t => t.table_name));
    } catch (error) {
      console.log('❌ Could not query database schema:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaModels(); 