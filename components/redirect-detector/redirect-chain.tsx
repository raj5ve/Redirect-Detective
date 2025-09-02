'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, ArrowRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { RedirectChain } from '@/types/redirect';

interface RedirectChainProps {
  redirectChain: RedirectChain;
}

export function RedirectChainDisplay({ redirectChain }: RedirectChainProps) {
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
  );
}