'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Header } from '@/components/redirect-detector/header';
import { UrlInput } from '@/components/redirect-detector/url-input';
import { SummaryCards } from '@/components/redirect-detector/summary-cards';
import { RedirectChainDisplay } from '@/components/redirect-detector/redirect-chain';
import { FinalDestination } from '@/components/redirect-detector/final-destination';
import { EmptyState } from '@/components/redirect-detector/empty-state';
import { RedirectChain } from '@/types/redirect';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectChain, setRedirectChain] = useState<RedirectChain | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValidUrl = (urlString: string) => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleTrace = async () => {
    if (!url.trim()) {
      setError('Please enter a URL to trace');
      return;
    }

    if (!isValidUrl(url)) {
      setError('Please enter a valid URL (include http:// or https://)');
      return;
    }

    setLoading(true);
    setError(null);
    setRedirectChain(null);

    try {
      const apiUrl = '/.netlify/functions/trace-redirects';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to trace redirects');
      }

      const data = await response.json();
      setRedirectChain(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-6xl">
        <Header />
        
        <UrlInput 
          url={url}
          setUrl={setUrl}
          loading={loading}
          onTrace={handleTrace}
        />

        {error && (
          <Alert className="mb-6 sm:mb-8 border-red-200 bg-red-50/80 backdrop-blur-sm">
            <AlertDescription className="text-red-800 text-sm sm:text-base">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {redirectChain && (
          <div className="space-y-4 sm:space-y-8">
            <SummaryCards redirectChain={redirectChain} />
            <RedirectChainDisplay redirectChain={redirectChain} />
            <FinalDestination redirectChain={redirectChain} />
          </div>
        )}

        {!redirectChain && !loading && !error && <EmptyState />}

        <div className="text-center mt-8 sm:mt-16 text-gray-500 text-xs sm:text-sm">
          <p>Built with Next.js and Netlify Functions</p>
          <p className="mt-1">Analyze redirect chains • Track response times • Copy URLs</p>
        </div>
      </div>
    </div>
  );
}