#!/usr/bin/env node

const { spawn } = require('child_process')
const ngrok = require('ngrok')
const fs = require('fs')
const path = require('path')

let nextProcess
let ngrokUrl

function updateSupabaseConfig(ngrokUrl) {
  const configPath = path.join(__dirname, '..', 'supabase', 'config.toml')
  let configContent = fs.readFileSync(configPath, 'utf8')

  // Update site_url to ngrok URL for proper auth redirects
  configContent = configContent.replace(
    /site_url = "http:\/\/localhost:3000"/,
    `site_url = "${ngrokUrl}"`
  )

  // Add ngrok URL to additional_redirect_urls
  configContent = configContent.replace(
    /additional_redirect_urls = \[\]/,
    `additional_redirect_urls = ["${ngrokUrl}"]`
  )

  fs.writeFileSync(configPath, configContent)
  console.log(`🔧 Supabase auth config updated for ngrok URL: ${ngrokUrl}`)
}

function saveRuntimeFiles(ngrokUrl) {
  // Save URL to a file for reference and environment variable
  const ngrokInfoPath = path.join(__dirname, '..', '.ngrok-url')
  fs.writeFileSync(ngrokInfoPath, ngrokUrl)

  // Create runtime environment file for dynamic ngrok URL
  const envRuntimePath = path.join(__dirname, '..', '.env.runtime')
  fs.writeFileSync(envRuntimePath, `NEXT_PUBLIC_APP_URL=${ngrokUrl}\nAPP_URL=${ngrokUrl}`)

  console.log(`🔧 Runtime environment updated: ${ngrokUrl}`)
}

async function startDevelopment() {
  try {
    console.log('🚀 Starting development environment with webhook support...\n')

    // Step 1: Start ngrok tunnel first
    console.log('🌐 Starting ngrok tunnel...')

    // First try to kill any existing ngrok processes
    try {
      await ngrok.kill()
    } catch (e) {
      // Ignore if no ngrok processes running
    }

    // Wait a moment before starting new tunnel
    await new Promise(resolve => setTimeout(resolve, 1000))

    const ngrokOptions = {
      addr: 3000
    }

    // Add optional configuration if provided
    if (process.env.NGROK_AUTHTOKEN) {
      ngrokOptions.authtoken = process.env.NGROK_AUTHTOKEN
    }

    if (process.env.NGROK_SUBDOMAIN) {
      ngrokOptions.subdomain = process.env.NGROK_SUBDOMAIN
    }

    ngrokUrl = await ngrok.connect(ngrokOptions)
    console.log(`✅ ngrok tunnel created: ${ngrokUrl}`)

    // Step 2: Update Supabase config with ngrok URL before starting
    updateSupabaseConfig(ngrokUrl)

    // Step 3: Start Supabase with updated config (single startup)
    console.log('📦 Starting local Supabase with ngrok configuration...')
    spawn('npm', ['run', 'db:start'], {
      stdio: 'inherit',
      shell: true
    })

    // Wait for Supabase to start
    await new Promise(resolve => setTimeout(resolve, 8000))

    // Step 4: Start Next.js development server
    console.log('⚡ Starting Next.js development server...')
    nextProcess = spawn('npm', ['run', 'dev:start'], {
      stdio: 'inherit',
      shell: true
    })

    // Wait for Next.js to start
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Step 5: Save runtime files
    saveRuntimeFiles(ngrokUrl)

    console.log('\n✅ Development environment ready!')
    console.log(`📍 Local URL: http://localhost:3000`)
    console.log(`🌐 Public URL: ${ngrokUrl}`)
    console.log('\n📧 メール認証について:')
    console.log(`   - ユーザー登録時にメール認証が必要です`)
    console.log(`   - 開発環境では実際のメールは送信されません`)
    console.log(`   - Inbucket (http://localhost:54324) で確認メールを確認できます`)
    console.log(`   - 確認メール内のリンクをクリックして認証を完了してください`)
    console.log('\n🎯 To set up Slack webhook integration:')
    console.log(`   1. Access the app at http://localhost:3000`)
    console.log(`   2. Log in and go to Settings (⚙️)`)
    console.log(`   3. Connect to your Slack workspace`)
    console.log(`   4. Click "絵文字リアクション連携を有効化"`)
    console.log(`   5. Copy your unique webhook URL`)
    console.log(`   6. Configure it in your Slack App Event Subscriptions`)
    console.log('\n💡 Each user gets their own unique webhook URL!')
    console.log('\n⚠️  Keep this terminal open to maintain the tunnel')
    console.log('   Press Ctrl+C to stop all services')

  } catch (error) {
    console.error('❌ Failed to start development environment:', error.message)

    if (error.message.includes('authtoken')) {
      console.log('\n💡 To fix ngrok authentication:')
      console.log('   1. Sign up at https://ngrok.com')
      console.log('   2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken')
      console.log('   3. Add NGROK_AUTHTOKEN=your_token to .env.local')
      console.log('   OR run: npx ngrok config add-authtoken YOUR_TOKEN')
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('4040')) {
      console.log('\n💡 ngrok connection issue detected:')
      console.log('   Alternative 1: Try manually starting ngrok:')
      console.log('   > ngrok http 3000')
      console.log('')
      console.log('   Alternative 2: Use regular development mode:')
      console.log('   > npm run dev')
      console.log('   (Slack webhooks will not work, but other features will)')
      console.log('')
      console.log('   Alternative 3: Reset ngrok:')
      console.log('   > pkill ngrok && npm run dev:webhook')
    }

    await cleanup()
    process.exit(1)
  }
}

async function cleanup() {
  console.log('\n🛑 Shutting down development environment...')

  // Kill Next.js process
  if (nextProcess) {
    nextProcess.kill()
  }

  // Kill ngrok
  if (ngrokUrl) {
    await ngrok.kill()
  }

  // Stop Supabase
  console.log('🛑 Stopping Supabase...')
  const stopSupabase = spawn('npm', ['run', 'db:stop'], {
    stdio: 'inherit',
    shell: true
  })

  // Wait for Supabase to stop
  await new Promise(resolve => {
    stopSupabase.on('close', resolve)
  })

  // Clean up the URL files
  const ngrokInfoPath = path.join(__dirname, '..', '.ngrok-url')
  const envRuntimePath = path.join(__dirname, '..', '.env.runtime')

  if (fs.existsSync(ngrokInfoPath)) {
    fs.unlinkSync(ngrokInfoPath)
  }

  if (fs.existsSync(envRuntimePath)) {
    fs.unlinkSync(envRuntimePath)
  }

  // Restore original Supabase config
  const configPath = path.join(__dirname, '..', 'supabase', 'config.toml')
  if (fs.existsSync(configPath)) {
    let configContent = fs.readFileSync(configPath, 'utf8')

    // Restore localhost site_url
    configContent = configContent.replace(
      /site_url = "https:\/\/[^"]+\.ngrok[^"]*"/,
      'site_url = "http://localhost:3000"'
    )

    // Remove ngrok URL from additional_redirect_urls
    configContent = configContent.replace(
      /additional_redirect_urls = \["https:\/\/[^"]+\.ngrok[^"]*"\]/,
      'additional_redirect_urls = []'
    )

    fs.writeFileSync(configPath, configContent)
    console.log('🔧 Supabase config restored to localhost')
  }

  console.log('✅ All services stopped')
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await cleanup()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await cleanup()
  process.exit(0)
})

startDevelopment()
