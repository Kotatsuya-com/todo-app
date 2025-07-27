#!/usr/bin/env node

const { spawn } = require('child_process');
const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');

let nextProcess;
let ngrokUrl;

async function startDevelopment() {
  try {
    console.log('🚀 Starting development environment with webhook support...\n');
    
    // Start Supabase first
    console.log('📦 Starting local Supabase...');
    const supabaseProcess = spawn('npm', ['run', 'db:start'], { 
      stdio: 'inherit',
      shell: true 
    });
    
    // Wait a bit for Supabase to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Start Next.js development server
    console.log('⚡ Starting Next.js development server...');
    nextProcess = spawn('npm', ['run', 'dev:start'], {
      stdio: 'inherit',
      shell: true
    });
    
    // Wait a bit for Next.js to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start ngrok tunnel
    console.log('🌐 Starting ngrok tunnel...');
    
    // First try to kill any existing ngrok processes
    try {
      await ngrok.kill();
    } catch (e) {
      // Ignore if no ngrok processes running
    }
    
    // Wait a moment before starting new tunnel
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const ngrokOptions = {
      addr: 3000,
    };
    
    // Add optional configuration if provided
    if (process.env.NGROK_AUTHTOKEN) {
      ngrokOptions.authtoken = process.env.NGROK_AUTHTOKEN;
    }
    
    if (process.env.NGROK_SUBDOMAIN) {
      ngrokOptions.subdomain = process.env.NGROK_SUBDOMAIN;
    }
    
    ngrokUrl = await ngrok.connect(ngrokOptions);
    
    console.log('\n✅ Development environment ready!');
    console.log(`📍 Local URL: http://localhost:3000`);
    console.log(`🌐 Public URL: ${ngrokUrl}`);
    console.log('\n🎯 To set up Slack webhook integration:');
    console.log(`   1. Access the app at http://localhost:3000`);
    console.log(`   2. Log in and go to Settings (⚙️)`);
    console.log(`   3. Connect to your Slack workspace`);
    console.log(`   4. Click "絵文字リアクション連携を有効化"`);
    console.log(`   5. Copy your unique webhook URL`);
    console.log(`   6. Configure it in your Slack App Event Subscriptions`);
    console.log('\n💡 Each user gets their own unique webhook URL!');
    console.log('\n⚠️  Keep this terminal open to maintain the tunnel');
    console.log('   Press Ctrl+C to stop all services');
    
    // Save URL to a file for reference
    const ngrokInfoPath = path.join(__dirname, '..', '.ngrok-url');
    fs.writeFileSync(ngrokInfoPath, ngrokUrl);
    
  } catch (error) {
    console.error('❌ Failed to start development environment:', error.message);
    
    if (error.message.includes('authtoken')) {
      console.log('\n💡 To fix ngrok authentication:');
      console.log('   1. Sign up at https://ngrok.com');
      console.log('   2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken');
      console.log('   3. Add NGROK_AUTHTOKEN=your_token to .env.local');
      console.log('   OR run: npx ngrok config add-authtoken YOUR_TOKEN');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('4040')) {
      console.log('\n💡 ngrok connection issue detected:');
      console.log('   Alternative 1: Try manually starting ngrok:');
      console.log('   > ngrok http 3000');
      console.log('');
      console.log('   Alternative 2: Use regular development mode:');
      console.log('   > npm run dev');
      console.log('   (Slack webhooks will not work, but other features will)');
      console.log('');
      console.log('   Alternative 3: Reset ngrok:');
      console.log('   > pkill ngrok && npm run dev:webhook');
    }
    
    await cleanup();
    process.exit(1);
  }
}

async function cleanup() {
  console.log('\n🛑 Shutting down development environment...');
  
  // Kill Next.js process
  if (nextProcess) {
    nextProcess.kill();
  }
  
  // Kill ngrok
  if (ngrokUrl) {
    await ngrok.kill();
  }
  
  // Clean up the URL file
  const ngrokInfoPath = path.join(__dirname, '..', '.ngrok-url');
  if (fs.existsSync(ngrokInfoPath)) {
    fs.unlinkSync(ngrokInfoPath);
  }
  
  console.log('✅ All services stopped');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

startDevelopment();