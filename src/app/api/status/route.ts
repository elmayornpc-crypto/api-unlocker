import { NextResponse } from 'next/server';
import { apiUnlocker } from '@/lib/api-logic';

export async function GET() {
  try {
    const status = await apiUnlocker.testAllProviders();
    const availableModels = apiUnlocker.getAvailableModels();
    
    return NextResponse.json({
      status: 'OPERATIONAL',
      timestamp: new Date().toISOString(),
      providers: status,
      models: availableModels,
      system: {
        version: '1.0.0',
        mode: 'INFILTRATION_ACTIVE',
        security_level: 'MAXIMUM'
      }
    });
  } catch (error) {
    console.error('[STATUS_ROUTE] Error:', error);
    return NextResponse.json(
      {
        status: 'ERROR',
        error: 'Failed to get system status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
