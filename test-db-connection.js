import { PrismaClient } from '@prisma/client';

async function testDatabaseConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test if we can query the database
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query successful:', result);
    
    // Check if crawler table exists
    try {
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'CrawlerJob'
        ) as exists
      `;
      console.log('✅ CrawlerJob table check:', tableExists);
      
      if (tableExists[0]?.exists) {
        console.log('✅ CrawlerJob table exists!');
        
        // Try to count records
        const count = await prisma.crawlerJob.count();
        console.log('✅ CrawlerJob count:', count);
      } else {
        console.log('❌ CrawlerJob table does not exist');
      }
      
    } catch (error) {
      console.log('❌ Error checking CrawlerJob table:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 This suggests PostgreSQL is not running or not accessible');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('💡 This suggests the database host cannot be found');
    } else if (error.message.includes('authentication failed')) {
      console.log('💡 This suggests incorrect database credentials');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection(); 