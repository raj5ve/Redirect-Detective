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
      body: JSON.stringify({ error: 'Failed to trace redirects' }),
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