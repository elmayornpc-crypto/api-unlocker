import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, language } = body;

    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    if (!existsSync(path)) {
      return NextResponse.json(
        { error: 'File does not exist' },
        { status: 404 }
      );
    }

    let command: string;
    
    switch (language) {
      case 'sh':
        command = `bash "${path}"`;
        break;
      case 'py':
        command = `python3 "${path}"`;
        break;
      case 'js':
        command = `node "${path}"`;
        break;
      case 'ts':
        command = `npx ts-node "${path}"`;
        break;
      case 'rb':
        command = `ruby "${path}"`;
        break;
      case 'pl':
        command = `perl "${path}"`;
        break;
      case 'php':
        command = `php "${path}"`;
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported language: ${language}` },
          { status: 400 }
        );
    }

    try {
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 30000,
        cwd: process.cwd()
      });
      
      return NextResponse.json({
        success: true,
        output: stdout + (stderr ? `\nstderr: ${stderr}` : ''),
        exitCode: 0
      });
    } catch (execError: any) {
      return NextResponse.json({
        success: false,
        error: execError.stderr || execError.message || 'Execution failed',
        exitCode: execError.code || 1
      });
    }
  } catch (error) {
    console.error('[EXECUTE_API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
