import { Card, CardContent } from '@/components/ui/card';
import { Globe } from 'lucide-react';

export function EmptyState() {
  return (
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
  );
}