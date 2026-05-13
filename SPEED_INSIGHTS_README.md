# Vercel Speed Insights Integration

This project has been configured to use Vercel Speed Insights to track Core Web Vitals and page performance metrics.

## What is Speed Insights?

Speed Insights is a tool that:
- Tracks Core Web Vitals (LCP, FID, CLS, FCP, TTFB, INP)
- Provides real user performance data
- Helps identify performance issues
- Works automatically once deployed to Vercel

## Implementation Details

### Files Added/Modified

1. **package.json** - Updated `@vercel/speed-insights` to version `^2.0.0`
2. **package-lock.json** - Lock file for consistent dependency installation
3. **speed-insights.js** - ES module that imports and initializes Speed Insights using `injectSpeedInsights()`
4. **index.html** - Added Speed Insights module script tag with `type="module"`

### How It Works

The integration uses the official Vercel Speed Insights approach for vanilla JavaScript projects:

1. The `speed-insights.js` ES module imports `injectSpeedInsights()` from the npm package
2. It calls the function to initialize the Speed Insights queue and load the tracking script
3. The tracking script automatically collects Web Vitals when pages load
4. Data is sent to Vercel for analysis

### Code Implementation

**speed-insights.js:**
```javascript
import { injectSpeedInsights } from './node_modules/@vercel/speed-insights/dist/index.mjs';

injectSpeedInsights({
  framework: 'vanilla',
  debug: false
});
```

**index.html:**
```html
<script type="module" src="speed-insights.js"></script>
```

### Local Development

When running locally with `npm run dev`, Speed Insights will use the debug script:
- Development environment is automatically detected
- Debug script URL: `https://va.vercel-scripts.com/v1/speed-insights/script.debug.js`
- Console logs will help you verify the integration

In production (when deployed to Vercel):
- Uses production script from `/_vercel/speed-insights/script.js`
- Automatically tracks real user metrics

### Viewing Your Data

After deploying to Vercel:

1. Go to your project dashboard on Vercel
2. Navigate to the "Speed Insights" tab
3. View real-time performance metrics and Web Vitals scores

Note: It may take a few hours to a day for data to start appearing after your first deployment.

## Configuration Options

The current implementation uses these settings (in `speed-insights.js`):

- **Framework**: `vanilla` (identifies this as a vanilla JS project)
- **Debug**: `false` (set to `true` to enable console logging)
- **SDK Version**: 2.0.0

### Optional Customization

You can modify `speed-insights.js` to add these options:

```javascript
injectSpeedInsights({
  framework: 'vanilla',
  debug: false,
  
  // Sample rate (0.0 to 1.0)
  sampleRate: 0.5, // Track 50% of visitors
  
  // Custom route for SPAs
  route: '/custom-route',
  
  // Custom beforeSend callback
  beforeSend: (data) => {
    console.log('Speed Insights data:', data);
    return data; // Return modified data or null to cancel
  },
  
  // Custom script source
  scriptSrc: 'https://custom-cdn.com/script.js',
  
  // Custom endpoint
  endpoint: '/api/speed-insights',
  
  // Custom base path
  basePath: '/my-app'
});
```

## Package Manager

This project uses **npm** as its package manager. Dependencies are tracked in `package-lock.json`.

### Installation Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build (no build step for this static site)
npm run build
```

## Deployment

Simply deploy to Vercel as usual:

```bash
vercel deploy
```

Or connect your Git repository to Vercel for automatic deployments.

## Documentation

- [Speed Insights Quickstart](https://vercel.com/docs/speed-insights/quickstart)
- [Speed Insights Package](https://vercel.com/docs/speed-insights/package)
- [Core Web Vitals](https://web.dev/vitals/)

## Troubleshooting

### Speed Insights not showing data

1. Ensure you're deployed to Vercel (data collection only works in production)
2. Check that Speed Insights is enabled in your Vercel project settings
3. Wait a few hours for data to populate (not instant)
4. Verify the script loads in your browser's Network tab

### Script loading errors

If you see console errors about loading the script:
- Check that `node_modules/@vercel/speed-insights` is installed
- Verify the import path in `speed-insights.js` is correct
- Ensure the browser supports ES modules (all modern browsers do)
- Check for content blockers or ad blockers that might interfere

### Development mode

In development, you should see:
```
[Speed Insights] Initialized successfully
```

If you enable debug mode, you'll see additional console logs about the tracking.

## Version History

- **v2.0.0** (Current) - Latest stable version with improved API
- Uses `injectSpeedInsights()` function for vanilla JS projects
- Better TypeScript support and framework detection
