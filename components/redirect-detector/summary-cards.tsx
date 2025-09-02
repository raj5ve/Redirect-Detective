import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Zap, Globe, Clock } from 'lucide-react';
import { RedirectChain } from '@/types/redirect';

interface SummaryCardsProps {
  redirectChain: RedirectChain;
}

export function SummaryCards({ redirectChain }: SummaryCardsProps) {
  return (
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
  );
}