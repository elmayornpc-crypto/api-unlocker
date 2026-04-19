import { NextRequest, NextResponse } from 'next/server';
import { apiUnlocker } from '@/lib/api-logic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'all';

    console.log(`[API_DISCOVER] Action: ${action}`);

    if (action === 'fastest') {
      const fastest = await apiUnlocker.getFastestFreeEndpoint();
      return NextResponse.json({
        success: true,
        endpoint: fastest
      });
    } else if (action === 'all') {
      const all = await apiUnlocker.getAllFreeEndpoints();
      return NextResponse.json({
        success: true,
        endpoints: all,
        count: all.length
      });
    } else {
      const discovered = await apiUnlocker.discoverFreeEndpoints();
      return NextResponse.json({
        success: true,
        endpoints: discovered,
        count: discovered.length
      });
    }
  } catch (error) {
    console.error('[API_DISCOVER] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
