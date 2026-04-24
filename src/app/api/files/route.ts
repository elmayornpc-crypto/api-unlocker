import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir, readdir, stat, unlink } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import { tmpdir } from 'os';

// Use temp directory that works on both Windows (local) and Linux (Render)
const BASE_DIR = process.env.FILES_BASE_DIR || join(tmpdir(), 'api-unlocker-files');

// Ensure base directory exists
async function ensureBaseDir() {
  if (!existsSync(BASE_DIR)) {
    await mkdir(BASE_DIR, { recursive: true });
  }
  return BASE_DIR;
}

// Sanitize path to prevent directory traversal attacks
function sanitizePath(inputPath: string): string {
  // Remove any parent directory references
  const cleanPath = inputPath.replace(/\.\.(\\|\/)/g, '').replace(/[:*?"<>|]/g, '_');
  return resolve(BASE_DIR, cleanPath);
}

export async function GET(request: NextRequest) {
  try {
    await ensureBaseDir();
    
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const pathParam = searchParams.get('path') || '';
    
    if (action === 'list') {
      const dirPath = pathParam ? sanitizePath(pathParam) : BASE_DIR;
      
      if (!existsSync(dirPath)) {
        // Return empty list if directory doesn't exist
        return NextResponse.json({ success: true, files: [] });
      }

      const files = await readdir(dirPath, { withFileTypes: true });
      const fileList = await Promise.all(files.map(async (file) => {
        const filePath = join(dirPath, file.name);
        const stats = await stat(filePath);
        return {
          name: file.name,
          path: filePath,
          isDirectory: file.isDirectory(),
          size: stats.size,
          modified: stats.mtime
        };
      }));

      return NextResponse.json({ success: true, files: fileList });
    } else if (action === 'read') {
      if (!pathParam) {
        return NextResponse.json({ success: false, error: 'Path is required' }, { status: 400 });
      }

      const filePath = sanitizePath(pathParam);
      
      if (!existsSync(filePath)) {
        return NextResponse.json({ success: false, error: 'File does not exist' }, { status: 404 });
      }

      const content = await readFile(filePath, 'utf-8');
      return NextResponse.json({ success: true, content });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[FILES_API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureBaseDir();
    
    const body = await request.json();
    const { action, path, content, name } = body;

    if (action === 'write') {
      if (!path) {
        return NextResponse.json({ success: false, error: 'Path is required' }, { status: 400 });
      }

      const filePath = sanitizePath(path);
      const dir = filePath.substring(0, filePath.lastIndexOf('/') >= 0 ? filePath.lastIndexOf('/') : filePath.lastIndexOf('\\'));
      
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      await writeFile(filePath, content || '', 'utf-8');
      return NextResponse.json({ success: true, path: filePath });
    } else if (action === 'create') {
      if (!name) {
        return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
      }

      const dirPath = path ? sanitizePath(path) : BASE_DIR;
      const fullPath = join(dirPath, name);
      
      if (!existsSync(dirPath)) {
        await mkdir(dirPath, { recursive: true });
      }
      
      await writeFile(fullPath, '', 'utf-8');
      return NextResponse.json({ success: true, path: fullPath });
    } else if (action === 'mkdir') {
      if (!path) {
        return NextResponse.json({ success: false, error: 'Path is required' }, { status: 400 });
      }

      const dirPath = sanitizePath(path);
      await mkdir(dirPath, { recursive: true });
      return NextResponse.json({ success: true });
    } else if (action === 'delete') {
      if (!path) {
        return NextResponse.json({ success: false, error: 'Path is required' }, { status: 400 });
      }

      const filePath = sanitizePath(path);
      await unlink(filePath);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[FILES_API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
