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
  const maxRedirects = 20;
  let currentUrl = initialUrl;
  
  // Track all navigation events
  const navigationSteps = [];
  let navigationStartTime = Date.now();

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
    await page.goto(currentUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const endTime = Date.now();
    totalTime = endTime - startTime;

    // Get the final URL after all redirects
    const finalUrl = page.url();

    // Process all captured navigation steps
    for (const step of navigationSteps) {
      // Only include main frame responses
      if (step.url === currentUrl || step.url === finalUrl || 
          (step.statusCode >= 300 && step.statusCode < 400)) {
        steps.push({
          url: step.url,
          statusCode: step.statusCode,
          statusText: step.statusText,
          headers: step.headers,
          responseTime: step.responseTime
        });
      }
    }

    // If no redirect steps were captured but URLs differ, add both
    if (steps.length === 0 && currentUrl !== finalUrl) {
      steps.push({
        url: currentUrl,
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        responseTime: totalTime
      });
      
      steps.push({
        url: finalUrl,
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        responseTime: 0
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
    // If navigation fails, try to get basic info with fetch fallback
    return await fallbackTrace(initialUrl);
  }
}

// Fallback method using fetch if Playwright fails
async function fallbackTrace(initialUrl) {
  const steps = [];
  let currentUrl = initialUrl;
  let totalTime = 0;
  const maxRedirects = 10;

  for (let i = 0; i < maxRedirects; i++) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Redirect Detector Tool/1.0',
        },
      });

      const responseTime = Date.now() - startTime;
      totalTime += responseTime;

      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const step = {
        url: currentUrl,
        statusCode: response.status,
        statusText: response.statusText,
        headers,
        responseTime,
      };

      steps.push(step);

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          if (location.startsWith('/')) {
            const urlObj = new URL(currentUrl);
            currentUrl = `${urlObj.protocol}//${urlObj.host}${location}`;
          } else if (!location.startsWith('http')) {
            const urlObj = new URL(currentUrl);
            currentUrl = `${urlObj.protocol}//${urlObj.host}/${location}`;
          } else {
            currentUrl = location;
          }
        } else {
          break;
        }
      } else {
        break;
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      totalTime += responseTime;
      
      steps.push({
        url: currentUrl,
        statusCode: 0,
        statusText: 'Connection Failed',
        headers: {},
        responseTime,
      });
      break;
    }
  }

  return {
    steps,
    finalUrl: currentUrl,
    totalTime,
    totalRedirects: steps.filter(step => step.statusCode >= 300 && step.statusCode < 400).length,
  };
}
