'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, ExternalLink, Loader2, Search, ArrowRight, Globe, Clock, TrendingUp, Zap } from 'lucide-react';
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getStatusBadgeColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'bg-emerald-500 hover:bg-emerald-600';
    if (statusCode >= 300 && statusCode < 400) return 'bg-blue-500 hover:bg-blue-600';
    if (statusCode >= 400 && statusCode < 500) return 'bg-amber-500 hover:bg-amber-600';
    return 'bg-red-500 hover:bg-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-10">
          <div className="inline-flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="relative">
              <Globe className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Redirect Detector
            </h1>
          </div>
          <p className="text-sm sm:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
            Trace the complete redirect chain of any URL and analyze each step with detailed status codes, headers, and response times.
          </p>
        </div>

        {/* Input Section */}
        <Card className="mb-6 sm:mb-10 backdrop-blur-sm bg-white/90 border-0 shadow-2xl">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Search className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              Enter URL to Trace
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Enter any URL to see its complete redirect chain and final destination
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && handleTrace()}
                  className="text-base sm:text-lg py-3 sm:py-4 px-4 border-2 border-gray-200 focus:border-blue-500 transition-all duration-200"
                  disabled={loading}
                />
              </div>
              <Button 
                onClick={handleTrace} 
                disabled={loading || !url.trim()}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    <span className="hidden sm:inline">Tracing...</span>
                    <span className="sm:hidden">Loading...</span>
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Trace Redirects</span>
                    <span className="sm:hidden">Trace</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6 sm:mb-8 border-red-200 bg-red-50/80 backdrop-blur-sm">
            <AlertDescription className="text-red-800 text-sm sm:text-base">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {redirectChain && (
          <div className="space-y-4 sm:space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-blue-600 mb-1">
                    {redirectChain.totalRedirects}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">
                    Redirects
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-emerald-600 mb-1">
                    {redirectChain.totalTime}ms
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">
                    Total Time
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-purple-600 mb-1">
                    {redirectChain.steps.length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">
                    Total Steps
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-orange-600 mb-1">
                    {Math.round(redirectChain.totalTime / redirectChain.steps.length)}ms
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">
                    Avg Time
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Redirect Chain */}
            <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-2xl">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Redirect Chain Analysis</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Complete trace of the redirect path from source to destination
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-6">
                  {redirectChain.steps.map((step, index) => (
                    <div key={index}>
                      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-6 rounded-xl border-2 hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-200 group">
                        <div className="flex-shrink-0 self-center sm:self-start">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-sm sm:text-base font-bold text-white shadow-lg">
                            {index + 1}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                            <Badge className={`${getStatusBadgeColor(step.statusCode)} text-white text-xs sm:text-sm px-2 sm:px-3 py-1 transition-colors`}>
                              {step.statusCode} {step.statusText}
                            </Badge>
                            {step.redirectType && (
                              <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1">
                                {step.redirectType}
                              </Badge>
                            )}
                            {step.redirectDelay && step.redirectDelay > 0 && (
                              <Badge variant="secondary" className="text-xs sm:text-sm px-2 sm:px-3 py-1">
                                Delay: {step.redirectDelay}s
                              </Badge>
                            )}
                            <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                              {step.responseTime}ms
                            </div>
                          </div>
                          
                          <div className="break-all text-gray-800 font-mono text-xs sm:text-sm bg-gray-50 p-3 sm:p-4 rounded-lg border mb-3 group-hover:bg-gray-100 transition-colors">
                            {step.url}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(step.url)}
                              className="h-8 text-xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
                            >
                              <Copy className="h-3 w-3 mr-1 sm:mr-2" />
                              Copy
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(step.url, '_blank')}
                              className="h-8 text-xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3 mr-1 sm:mr-2" />
                              Open
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {index < redirectChain.steps.length - 1 && (
                        <div className="flex justify-center py-2 sm:py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 sm:w-12 h-0.5 bg-gradient-to-r from-blue-300 to-indigo-300"></div>
                            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                            <div className="w-8 sm:w-12 h-0.5 bg-gradient-to-r from-blue-300 to-indigo-300"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Final Destination */}
            <Card className="backdrop-blur-sm bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 shadow-2xl">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-emerald-800 flex items-center gap-2 text-lg sm:text-xl">
                  <Globe className="h-5 w-5 sm:h-6 sm:w-6" />
                  Final Destination
                </CardTitle>
                <CardDescription className="text-emerald-700 text-sm sm:text-base">
                  The ultimate URL after all redirects have been resolved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white/80 p-4 sm:p-6 rounded-xl border border-emerald-200 shadow-inner">
                  <div className="break-all text-emerald-800 font-mono text-xs sm:text-sm mb-4 sm:mb-6 bg-emerald-50 p-3 sm:p-4 rounded-lg">
                    {redirectChain.finalUrl}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(redirectChain.finalUrl)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200 transform hover:scale-105"
                    >
                      <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Copy Final URL
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(redirectChain.finalUrl, '_blank')}
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-all duration-200"
                    >
                      <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Visit Final URL
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!redirectChain && !loading && !error && (
          <Card className="backdrop-blur-sm bg-white/70 border-0 shadow-xl">
            <CardContent className="text-center py-12 sm:py-20">
              <Globe className="h-16 w-16 sm:h-20 sm:w-20 text-gray-300 mx-auto mb-4 sm:mb-6" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2 sm:mb-3">
                Ready to Trace Redirects
              </h3>
              <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto">
                Enter a URL above to start analyzing its redirect chain and discover where it ultimately leads.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 sm:mt-16 text-gray-500 text-xs sm:text-sm">
          <p>Built with Next.js and Supabase Edge Functions</p>
          <p className="mt-1">Analyze redirect chains • Track response times • Copy URLs</p>
        </div>
      </div>
    </div>
  );
}
