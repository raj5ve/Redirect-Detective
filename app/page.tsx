'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, ExternalLink, Loader2, Search, ArrowRight, Globe, Clock } from 'lucide-react';
import { toast } from 'sonner';

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
      const response = await fetch('/api/trace-redirects', {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getStatusBadgeColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'bg-green-500';
    if (statusCode >= 300 && statusCode < 400) return 'bg-blue-500';
    if (statusCode >= 400 && statusCode < 500) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Globe className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Redirect Detector
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Trace the complete redirect chain of any URL and analyze each step with detailed status codes and response times.
          </p>
        </div>

        {/* Input Section */}
        <Card className="mb-8 backdrop-blur-sm bg-white/80 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Enter URL to Trace
            </CardTitle>
            <CardDescription>
              Enter any URL to see its complete redirect chain and final destination
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTrace()}
                  className="text-lg py-3"
                />
              </div>
              <Button 
                onClick={handleTrace} 
                disabled={loading}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Tracing...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Trace Redirects
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert className="mb-8 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {redirectChain && (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Redirect Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{redirectChain.totalRedirects}</div>
                    <div className="text-sm text-gray-600">Total Redirects</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{redirectChain.totalTime}ms</div>
                    <div className="text-sm text-gray-600">Total Time</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">{redirectChain.steps.length}</div>
                    <div className="text-sm text-gray-600">Total Steps</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Redirect Chain */}
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Redirect Chain</CardTitle>
                <CardDescription>
                  Complete trace of the redirect path from source to destination
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {redirectChain.steps.map((step, index) => (
                    <div key={index}>
                      <div className="flex items-start gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                            {index + 1}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`${getStatusBadgeColor(step.statusCode)} text-white`}>
                              {step.statusCode} {step.statusText}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Clock className="h-3 w-3" />
                              {step.responseTime}ms
                            </div>
                          </div>
                          
                          <div className="break-all text-gray-800 font-mono text-sm bg-gray-50 p-2 rounded">
                            {step.url}
                          </div>
                          
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(step.url)}
                              className="h-7"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(step.url, '_blank')}
                              className="h-7"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Open
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {index < redirectChain.steps.length - 1 && (
                        <div className="flex justify-center py-2">
                          <ArrowRight className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Final Destination */}
            <Card className="backdrop-blur-sm bg-green-50/80 border-green-200 shadow-xl">
              <CardHeader>
                <CardTitle className="text-green-800">Final Destination</CardTitle>
                <CardDescription className="text-green-700">
                  The ultimate URL after all redirects have been resolved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="break-all text-green-800 font-mono text-sm mb-3">
                    {redirectChain.finalUrl}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(redirectChain.finalUrl)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Final URL
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(redirectChain.finalUrl, '_blank')}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Visit Final URL
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Enter any URL to trace its complete redirect path and analyze each step.</p>
        </div>
      </div>
    </div>
  );
}