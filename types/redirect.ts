export interface RedirectStep {
  url: string;
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  responseTime: number;
  redirectType?: string;
  redirectDelay?: number;
}

export interface RedirectChain {
  steps: RedirectStep[];
  finalUrl: string;
  totalTime: number;
  totalRedirects: number;
}