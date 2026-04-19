import { NextRequest, NextResponse } from 'next/server';

// Terminal API disabled - PowerShell removed
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Terminal is disabled. PowerShell functionality has been removed.'
  }, { status: 503 });
}
