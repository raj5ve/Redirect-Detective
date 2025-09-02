const fetch = require('node-fetch');

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

  try {
    // Validate URL
    new URL(currentUrl);
  } catch (error) {
    throw new Error('Invalid URL provided');
  }

  for (let i = 0; i < maxRedirects; i++) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        follow: 0,
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      });

      const responseTime = Date.now() - startTime;
      totalTime += responseTime;

      // Convert Headers object to plain object
      const responseHeaders = {};
      if (response.headers) {
        response.headers.forEach((value, key) => {
          responseHeaders[key.toLowerCase()] = value;
        });
      }

      const step = {
        url: currentUrl,
        statusCode: response.status,
        statusText: response.statusText || getStatusText(response.status),
        headers: responseHeaders,
        responseTime,
      };

      steps.push(step);

      // Check if it's a redirect
      if (response.status >= 300 && response.status < 400) {
        const location = responseHeaders['location'];
        
        if (location) {
          // Handle relative URLs
          try {
            if (location.startsWith('http://') || location.startsWith('https://')) {
              currentUrl = location;
            } else if (location.startsWith('//')) {
              const urlObj = new URL(currentUrl);
              currentUrl = `${urlObj.protocol}${location}`;
            } else if (location.startsWith('/')) {
              const urlObj = new URL(currentUrl);
              currentUrl = `${urlObj.protocol}//${urlObj.host}${location}`;
            } else {
              const urlObj = new URL(currentUrl);
              const basePath = urlObj.pathname.endsWith('/') ? urlObj.pathname : urlObj.pathname.replace(/[^/]*$/, '');
              currentUrl = `${urlObj.protocol}//${urlObj.host}${basePath}${location}`;
            }
            
            // Validate the new URL
            new URL(currentUrl);
          } catch (error) {
            console.error('Invalid redirect URL:', location);
            break;
          }
        } else {
          break; // No location header, stop
        }
      } else {
        break; // Not a redirect, stop
      }

      // Prevent infinite loops
      const previousUrls = steps.map(s => s.url);
      if (previousUrls.includes(currentUrl)) {
        console.log('Circular redirect detected, stopping');
        break;
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      totalTime += responseTime;
      
      let errorMessage = 'Connection Failed';
      if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
        errorMessage = 'Request Timeout';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'DNS Resolution Failed';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection Refused';
      } else if (error.code === 'CERT_HAS_EXPIRED') {
        errorMessage = 'SSL Certificate Expired';
      } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        errorMessage = 'SSL Certificate Invalid';
      }
      
      steps.push({
        url: currentUrl,
        statusCode: 0,
        statusText: errorMessage,
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

function getStatusText(statusCode) {
  const statusTexts = {
    100: 'Continue',
    101: 'Switching Protocols',
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
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
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  
  return statusTexts[statusCode] || 'Unknown Status';
}
