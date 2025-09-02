import { NextRequest, NextResponse } from 'next/server';

interface RedirectStep {
  url: string;
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  responseTime: number;
}

interface RedirectChain {
  steps: RedirectStep[];
  finalUrl: string;
  totalTime: number;
  totalRedirects: number;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const redirectChain = await traceRedirects(url);
    
    return NextResponse.json(redirectChain);
  } catch (error) {
    console.error('Error tracing redirects:', error);
    return NextResponse.json(
      { error: 'Failed to trace redirects' },
      { status: 500 }
    );
  }
}

async function traceRedirects(initialUrl: string): Promise<RedirectChain> {
  const steps: RedirectStep[] = [];
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

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const step: RedirectStep = {
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