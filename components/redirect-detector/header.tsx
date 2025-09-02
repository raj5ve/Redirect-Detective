import { Globe } from 'lucide-react';

export function Header() {
  return (
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
  );
}