# Booking System - Automatic Cleanup Setup

## The Problem
When deployed to cloud platforms like Render, expired bookings weren't being cleaned up properly due to timezone differences between the server (usually UTC) and the local timezone (Thailand UTC+7).

## The Solution
We've implemented a comprehensive timezone-aware cleanup system with multiple approaches:

### 1. Timezone-Aware Utilities
- Created `lib/timezone.ts` with proper Thailand timezone handling
- All date/time operations now account for UTC+7 offset
- Consistent date parsing and comparison across the application

### 2. Automatic Cleanup Endpoints

#### `/api/cleanup` (GET/POST)
- Manual and automatic cleanup endpoint
- Removes expired bookings with proper timezone handling
- Returns detailed information about cleanup results

#### `/api/cron/cleanup` (GET/POST)
- Cron-friendly endpoint for external scheduling services
- Calls the main cleanup endpoint internally
- Designed for services like cron-job.org

#### `/api/debug` (GET)
- Debug endpoint to troubleshoot timezone issues
- Shows server timezone info and booking expiry analysis
- Helpful for debugging deployment issues

### 3. Frontend Improvements
- Better error handling and user feedback
- Timezone-aware form validation
- Improved cleanup result notifications

## Setting Up Automatic Cleanup on Render

### Option 1: Using External Cron Service (Recommended)

1. **Deploy your app to Render**
2. **Sign up for a free cron service** like [cron-job.org](https://cron-job.org)
3. **Create a new cron job**:
   - URL: `https://your-app-name.onrender.com/api/cron/cleanup`
   - Method: GET
   - Schedule: Every 15-30 minutes (e.g., `*/15 * * * *`)
   - Title: "Booking System Cleanup"

4. **Test the endpoint**:
   ```bash
   curl https://your-app-name.onrender.com/api/cron/cleanup
   ```

### Option 2: Using Render Cron Jobs (if available)

If your Render plan supports cron jobs, you can add this to your `render.yaml`:

```yaml
services:
  - type: web
    name: booking-system
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    
  - type: cron
    name: booking-cleanup
    env: node
    schedule: "*/15 * * * *"
    buildCommand: npm install
    startCommand: curl https://your-app-name.onrender.com/api/cron/cleanup
```

### Option 3: Using GitHub Actions (Alternative)

Create `.github/workflows/cleanup.yml`:

```yaml
name: Cleanup Expired Bookings
on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup endpoint
        run: |
          curl -X GET https://your-app-name.onrender.com/api/cron/cleanup
```

## Environment Variables

Add this to your Render environment variables:

```
NEXT_PUBLIC_APP_URL=https://your-app-name.onrender.com
```

## Testing the Cleanup System

### 1. Test Local Cleanup
```bash
# Manual cleanup
curl -X POST http://localhost:3000/api/cleanup

# Cron endpoint
curl http://localhost:3000/api/cron/cleanup

# Debug info
curl http://localhost:3000/api/debug
```

### 2. Test Production Cleanup
```bash
# Replace with your actual Render URL
curl -X POST https://your-app-name.onrender.com/api/cleanup
curl https://your-app-name.onrender.com/api/debug
```

### 3. Monitor Logs
Check your Render logs to see cleanup activity:
- Look for "Cleanup completed" messages
- Check for timezone debug information
- Monitor for any errors during cleanup

## Troubleshooting

### Issue: Bookings not being cleaned up
1. Check the debug endpoint: `/api/debug`
2. Verify server timezone in logs
3. Check if cleanup endpoint is being called
4. Look for errors in Render logs

### Issue: Wrong timezone handling
1. The app automatically handles Thailand timezone (UTC+7)
2. All bookings are processed with proper timezone offset
3. Check debug endpoint for timezone information

### Issue: Cron job not working
1. Verify the cron service is active
2. Check the endpoint URL is correct
3. Test the endpoint manually first
4. Check Render logs for incoming requests

## Monitoring

The cleanup system provides detailed logging:
- Number of bookings processed
- Number of expired bookings removed
- Server timezone information
- Any errors during processing

Check your Render logs regularly to ensure the cleanup is working properly.
