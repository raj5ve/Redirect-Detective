const { chromium } = require('playwright-core');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let browser;
  try {
    const { url } = JSON.parse(event.body);

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' }),
      };
    }

    // Launch browser with minimal configuration for serverless
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Redirect Detector Tool/1.0 (Playwright)',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    const redirectChain = await traceRedirectsWithPlaywright(page, url);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(redirectChain),
    };
  } catch (error) {
    console.error('Error tracing redirects:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to trace redirects',
        details: error.message 
      }),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

async function traceRedirectsWithPlaywright(page, initialUrl) {
  const steps = [];
  let totalTime = 0;
  const navigationSteps = [];
  let navigationStartTime = Date.now();

  // Track all navigation events
  page.on('response', (response) => {
    const responseTime = Date.now() - navigationStartTime;
    const headers = {};
    
    // Extract headers
    for (const [key, value] of Object.entries(response.headers())) {
      headers[key] = value;
    }

    navigationSteps.push({
      url: response.url(),
      statusCode: response.status(),
      statusText: response.statusText(),
      headers,
      responseTime,
      fromCache: response.fromCache(),
    });
  });

  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      navigationStartTime = Date.now();
    }
  });

  try {
    const startTime = Date.now();
    
    // Navigate to the initial URL and wait for network to be idle
    await page.goto(initialUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const endTime = Date.now();
    totalTime = endTime - startTime;

    // Get the final URL after all redirects
    const finalUrl = page.url();

    // Process all captured navigation steps
    const mainFrameSteps = navigationSteps.filter(step => {
      // Include main document requests and redirects
      const isMainDocument = step.url === initialUrl || step.url === finalUrl;
      const isRedirect = step.statusCode >= 300 && step.statusCode < 400;
      const isRelevantStep = isMainDocument || isRedirect || 
        (step.url.includes(new URL(initialUrl).hostname));
      
      return isRelevantStep;
    });

    // Sort by response time and remove duplicates
    const uniqueSteps = [];
    const seenUrls = new Set();
    
    for (const step of mainFrameSteps) {
      if (!seenUrls.has(step.url)) {
        seenUrls.add(step.url);
        uniqueSteps.push({
          url: step.url,
          statusCode: step.statusCode,
          statusText: step.statusText,
          headers: step.headers,
          responseTime: step.responseTime
        });
      }
    }

    steps.push(...uniqueSteps);

    // If no redirect steps were captured but URLs differ, add both
    if (steps.length === 0 && initialUrl !== finalUrl) {
      steps.push({
        url: initialUrl,
        statusCode: 302,
        statusText: 'Found',
        headers: {},
        responseTime: Math.floor(totalTime / 2)
      });
      
      steps.push({
        url: finalUrl,
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        responseTime: Math.floor(totalTime / 2)
      });
    }

    // If still no steps, add the initial request
    if (steps.length === 0) {
      steps.push({
        url: finalUrl,
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        responseTime: totalTime
      });
    }

    // Calculate total redirects (3xx status codes)
    const totalRedirects = steps.filter(step => 
      step.statusCode >= 300 && step.statusCode < 400
    ).length;

    return {
      steps,
      finalUrl,
      totalTime,
      totalRedirects,
    };

  } catch (error) {
    console.error('Playwright navigation failed:', error);
    // If navigation fails, return error info
    return {
      steps: [{
        url: initialUrl,
        statusCode: 0,
        statusText: 'Navigation Failed',
        headers: {},
        responseTime: Date.now() - Date.now()
      }],
      finalUrl: initialUrl,
      totalTime: 0,
      totalRedirects: 0,
    };
  }
}