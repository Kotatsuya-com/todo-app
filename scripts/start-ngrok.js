#!/usr/bin/env node

const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');

async function startNgrok() {
  try {
    console.log('🚀 Starting ngrok tunnel...');
    
    // Connect to ngrok
    const url = await ngrok.connect({
      addr: 3000,
      subdomain: process.env.NGROK_SUBDOMAIN, // Optional custom subdomain
      authtoken: process.env.NGROK_AUTHTOKEN, // Optional auth token
    });
    
    console.log('✅ ngrok tunnel established!');
    console.log(`📍 Public URL: ${url}`);
    console.log(`🔗 Slack Webhook URL: ${url}/api/slack/events`);
    console.log('');
    console.log('📋 Copy this URL to your Slack App Event Subscriptions:');
    console.log(`   ${url}/api/slack/events`);
    console.log('');
    console.log('⚠️  Keep this terminal open to maintain the tunnel');
    console.log('   Press Ctrl+C to stop ngrok');
    
    // Save URL to a file for other scripts to use
    const ngrokInfoPath = path.join(__dirname, '..', '.ngrok-url');
    fs.writeFileSync(ngrokInfoPath, url);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Stopping ngrok tunnel...');
      await ngrok.kill();
      
      // Clean up the URL file
      if (fs.existsSync(ngrokInfoPath)) {
        fs.unlinkSync(ngrokInfoPath);
      }
      
      console.log('✅ ngrok tunnel stopped');
      process.exit(0);
    });
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Failed to start ngrok:', error.message);
    
    if (error.message.includes('authtoken')) {
      console.log('');
      console.log('💡 To fix this issue:');
      console.log('   1. Sign up at https://ngrok.com');
      console.log('   2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken');
      console.log('   3. Add NGROK_AUTHTOKEN=your_token to .env.local');
      console.log('   OR run: npx ngrok config add-authtoken YOUR_TOKEN');
    }
    
    process.exit(1);
  }
}

startNgrok();