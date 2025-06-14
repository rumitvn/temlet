import fetch from 'node-fetch';

async function runMonitor() {
  try {
    console.log('Running monitor...');
    const response = await fetch('http://localhost:3001/api/cron/monitor');
    const text = await response.text();
    console.log('Monitor response:', text);
  } catch (error) {
    console.error('Monitor error:', error);
  }
}

// Run immediately
runMonitor();

// Then run every 5 seconds
setInterval(runMonitor, 5000); 