import { NextResponse } from 'next/server';
import { apiUnlocker } from '@/lib/api-logic';

export async function GET() {
  try {
    console.log('[SEARCH_ROUTE] Starting auto-search for best provider...');
    
    const searchResults = await apiUnlocker.autoSearchBestProvider();
    
    const fastestProvider = searchResults
      .filter(s => s.available)
      .sort((a, b) => (a.responseTime || Infinity) - (b.responseTime || Infinity))[0];
    
    return NextResponse.json({
      scan_complete: true,
      timestamp: new Date().toISOString(),
      results: searchResults,
      fastest_provider: fastestProvider ? {
        name: fastestProvider.name,
        response_time: fastestProvider.responseTime
      } : null,
      recommendation: fastestProvider 
        ? `USE_${fastestProvider.name}_FOR_OPTIMAL_PERFORMANCE`
        : 'ALL_ENDPOINTS_UNAVAILABLE'
    });
  } catch (error) {
    console.error('[SEARCH_ROUTE] Error during search:', error);
    return NextResponse.json(
      {
        scan_complete: false,
        error: 'Failed to scan endpoints',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // This endpoint can be used to trigger a manual search
  return GET();
}
