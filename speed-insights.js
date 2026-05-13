/**
 * Vercel Speed Insights Integration
 * This file initializes and configures Speed Insights for the inventory dashboard.
 * 
 * Speed Insights tracks Core Web Vitals and page performance metrics.
 * Learn more: https://vercel.com/docs/speed-insights
 */

import { injectSpeedInsights } from './node_modules/@vercel/speed-insights/dist/index.mjs';

// Initialize Speed Insights
// This will automatically track Web Vitals when the page loads
injectSpeedInsights({
  // Optional: Set framework identifier
  framework: 'vanilla',
  
  // Optional: Enable debug mode in development
  debug: false,
  
  // Optional: Sample rate (1.0 = 100% of visitors tracked)
  // sampleRate: 1.0,
  
  // Optional: Custom beforeSend callback to modify or filter data
  // beforeSend: (data) => {
  //   console.log('Speed Insights data:', data);
  //   return data;
  // }
});

console.log('[Speed Insights] Initialized successfully');
