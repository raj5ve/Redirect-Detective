const https = require('https');
const http = require('http');
const { URL } = require('url');

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

  try {
    const { url } = JSON.parse(event.body);

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' }),
      };
    }

    const redirectChain = await traceRedirects(url);
    
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
  }
};

async function traceRedirects(initialUrl) {
  const steps = [];
  let currentUrl = initialUrl;
  let totalTime = 0;
  const maxRedirects = 20;

  for (let i = 0; i < maxRedirects; i++) {
    const startTime = Date.now();
    
    try {
      const result = await makeRequest(currentUrl);
      const responseTime = Date.now() - startTime;
      totalTime += responseTime;

      const step = {
        url: currentUrl,
        statusCode: result.statusCode,
        statusText: result.statusMessage || getStatusText(result.statusCode),
        headers: result.headers,
        responseTime,
      };

      steps.push(step);

      // Check if it's a redirect
      if (result.statusCode >= 300 && result.statusCode < 400) {
        const location = result.headers.location;
        if (location) {
          // Handle relative URLs
          if (location.startsWith('/')) {
            const urlObj = new URL(currentUrl);
            currentUrl = `${urlObj.protocol}//${urlObj.host}${location}`;
          } else if (!location.startsWith('http')) {
            const urlObj = new URL(currentUrl);
            const basePath = urlObj.pathname.endsWith('/') ? urlObj.pathname : urlObj.pathname + '/';
            currentUrl = `${urlObj.protocol}//${urlObj.host}${basePath}${location}`;
          } else {
            currentUrl = location;
          }
        } else {
          break; // No location header, stop
        }
      } else {
        break; // Not a redirect, stop
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

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method: 'HEAD',
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'Redirect Detector Tool/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      timeout: 10000,
    };

    const req = client.request(options, (res) => {
      const headers = {};
      Object.keys(res.headers).forEach(key => {
        headers[key] = res.headers[key];
      });

      resolve({
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers,
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

function getStatusText(statusCode) {
  const statusTexts = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  
  return statusTexts[statusCode] || 'Unknown Status';
}
