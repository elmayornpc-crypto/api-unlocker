import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir, readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const path = searchParams.get('path') || '';

    if (action === 'list') {
      const dirPath = path || 'C:\\Users\\USER';
      if (!existsSync(dirPath)) {
        return NextResponse.json({ success: false, error: 'Directory does not exist' }, { status: 404 });
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
      if (!path) {
        return NextResponse.json({ success: false, error: 'Path is required' }, { status: 400 });
      }

      if (!existsSync(path)) {
        return NextResponse.json({ success: false, error: 'File does not exist' }, { status: 404 });
      }

      const content = await readFile(path, 'utf-8');
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
    const body = await request.json();
    const { action, path, content, name } = body;

    if (action === 'write') {
      if (!path || !content) {
        return NextResponse.json({ success: false, error: 'Path and content are required' }, { status: 400 });
      }

      const dir = path.substring(0, path.lastIndexOf('\\'));
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      await writeFile(path, content, 'utf-8');
      return NextResponse.json({ success: true });
    } else if (action === 'create') {
      if (!path || !name) {
        return NextResponse.json({ success: false, error: 'Path and name are required' }, { status: 400 });
      }

      const fullPath = join(path, name);
      await writeFile(fullPath, '', 'utf-8');
      return NextResponse.json({ success: true, path: fullPath });
    } else if (action === 'mkdir') {
      if (!path) {
        return NextResponse.json({ success: false, error: 'Path is required' }, { status: 400 });
      }

      await mkdir(path, { recursive: true });
      return NextResponse.json({ success: true });
    } else if (action === 'delete') {
      if (!path) {
        return NextResponse.json({ success: false, error: 'Path is required' }, { status: 400 });
      }

      await unlink(path);
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
