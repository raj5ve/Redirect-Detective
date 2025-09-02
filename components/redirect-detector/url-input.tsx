'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';

interface UrlInputProps {
  url: string;
  setUrl: (url: string) => void;
  loading: boolean;
  onTrace: () => void;
}

export function UrlInput({ url, setUrl, loading, onTrace }: UrlInputProps) {
  return (
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
              onKeyPress={(e) => e.key === 'Enter' && !loading && onTrace()}
              className="text-base sm:text-lg py-3 sm:py-4 px-4 border-2 border-gray-200 focus:border-blue-500 transition-all duration-200"
              disabled={loading}
            />
          </div>
          <Button 
            onClick={onTrace} 
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
  );
}