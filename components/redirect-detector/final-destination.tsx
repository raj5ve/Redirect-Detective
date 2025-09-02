'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ExternalLink, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { RedirectChain } from '@/types/redirect';

interface FinalDestinationProps {
  redirectChain: RedirectChain;
}

export function FinalDestination({ redirectChain }: FinalDestinationProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
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
  );
}