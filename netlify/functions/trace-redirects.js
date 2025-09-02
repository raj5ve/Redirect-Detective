const fetch = require('node-fetch');
const cheerio = require('cheerio');

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
  const visitedUrls = new Set();

  try {
    // Validate URL
    new URL(currentUrl);
  } catch (error) {
    throw new Error('Invalid URL provided');
  }

  for (let i = 0; i < maxRedirects; i++) {
    const startTime = Date.now();
    
    // Check for circular redirects
    if (visitedUrls.has(currentUrl)) {
      console.log('Circular redirect detected, stopping');
      break;
    }
    visitedUrls.add(currentUrl);
    
    try {
      const response = await fetch(currentUrl, {
        method: 'GET', // Changed to GET to get HTML content
        redirect: 'manual',
        follow: 0,
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
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
        redirectType: 'HTTP'
      };

      steps.push(step);

      // Check for HTTP redirects
      if (response.status >= 300 && response.status < 400) {
        const location = responseHeaders['location'];
        
        if (location) {
          try {
            currentUrl = resolveUrl(currentUrl, location);
            step.redirectType = `HTTP ${response.status}`;
            continue;
          } catch (error) {
            console.error('Invalid redirect URL:', location);
            break;
          }
        } else {
          break; // No location header, stop
        }
      } else if (response.status >= 200 && response.status < 300) {
        // For successful responses, check for HTML-based redirects
        try {
          const contentType = responseHeaders['content-type'] || '';
          
          if (contentType.includes('text/html')) {
            const html = await response.text();
            const htmlRedirect = await detectHtmlRedirects(html, currentUrl);
            
            if (htmlRedirect) {
              // Add another step for HTML redirect
              const htmlRedirectStartTime = Date.now();
              const htmlRedirectStep = {
                url: currentUrl,
                statusCode: 200,
                statusText: 'HTML Redirect Detected',
                headers: responseHeaders,
                responseTime: Date.now() - htmlRedirectStartTime,
                redirectType: htmlRedirect.type,
                redirectDelay: htmlRedirect.delay || 0
              };
              
              if (steps[steps.length - 1].url === currentUrl) {
                // Update the last step instead of adding duplicate
                steps[steps.length - 1].redirectType = htmlRedirect.type;
                steps[steps.length - 1].redirectDelay = htmlRedirect.delay || 0;
              }
              
              currentUrl = htmlRedirect.url;
              continue;
            }
          }
        } catch (htmlError) {
          console.log('Could not parse HTML for redirects:', htmlError.message);
        }
        
        // No more redirects found
        break;
      } else {
        // Error status, stop
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
        redirectType: 'Error'
      });
      break;
    }
  }

  return {
    steps,
    finalUrl: currentUrl,
    totalTime,
    totalRedirects: steps.filter(step => 
      (step.statusCode >= 300 && step.statusCode < 400) || 
      step.redirectType?.includes('Meta') || 
      step.redirectType?.includes('JavaScript')
    ).length,
  };
}

async function detectHtmlRedirects(html, currentUrl) {
  try {
    const $ = cheerio.load(html);
    
    // Check for meta refresh redirects
    const metaRefresh = $('meta[http-equiv="refresh"]').first();
    if (metaRefresh.length > 0) {
      const content = metaRefresh.attr('content');
      if (content) {
        const match = content.match(/(?:^|;\s*)url=(.+?)(?:$|;)/i);
        if (match) {
          let redirectUrl = match[1].trim().replace(/^['"]|['"]$/g, '');
          const delayMatch = content.match(/^\s*(\d+)/);
          const delay = delayMatch ? parseInt(delayMatch[1]) : 0;
          
          return {
            url: resolveUrl(currentUrl, redirectUrl),
            type: `Meta Refresh (${delay}s)`,
            delay: delay
          };
        }
      }
    }
    
    // Check for JavaScript redirects
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const scriptContent = $(script).html() || '';
      
      // Common JavaScript redirect patterns
      const jsRedirectPatterns = [
        /window\.location\.href\s*=\s*['"`]([^'"`]+)['"`]/i,
        /window\.location\s*=\s*['"`]([^'"`]+)['"`]/i,
        /location\.href\s*=\s*['"`]([^'"`]+)['"`]/i,
        /location\s*=\s*['"`]([^'"`]+)['"`]/i,
        /window\.location\.replace\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/i,
        /location\.replace\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/i,
        /window\.open\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]_self['"`]/i
      ];
      
      for (const pattern of jsRedirectPatterns) {
        const match = scriptContent.match(pattern);
        if (match) {
          return {
            url: resolveUrl(currentUrl, match[1]),
            type: 'JavaScript Redirect',
            delay: 0
          };
        }
      }
      
      // Check for setTimeout redirects
      const timeoutMatch = scriptContent.match(/setTimeout\s*\(\s*(?:function\s*\(\)\s*\{|)\s*(?:window\.)?location(?:\.href)?\s*=\s*['"`]([^'"`]+)['"`]/i);
      if (timeoutMatch) {
        return {
          url: resolveUrl(currentUrl, timeoutMatch[1]),
          type: 'JavaScript Timeout Redirect',
          delay: 0
        };
      }
    }
    
    // Check for immediate JavaScript redirects in inline scripts
    const inlineRedirectMatch = html.match(/<script[^>]*>[\s\S]*?(?:window\.)?location(?:\.href)?\s*=\s*['"`]([^'"`]+)['"`][\s\S]*?<\/script>/i);
    if (inlineRedirectMatch) {
      return {
        url: resolveUrl(currentUrl, inlineRedirectMatch[1]),
        type: 'JavaScript Redirect',
        delay: 0
      };
    }
    
    return null;
  } catch (error) {
    console.log('Error detecting HTML redirects:', error.message);
    return null;
  }
}

function resolveUrl(baseUrl, relativeUrl) {
  try {
    // Handle absolute URLs
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }
    
    // Handle protocol-relative URLs
    if (relativeUrl.startsWith('//')) {
      const baseUrlObj = new URL(baseUrl);
      return `${baseUrlObj.protocol}${relativeUrl}`;
    }
    
    // Handle relative URLs
    return new URL(relativeUrl, baseUrl).href;
  } catch (error) {
    throw new Error(`Invalid URL: ${relativeUrl}`);
  }
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
