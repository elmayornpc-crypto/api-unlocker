'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface ResizableOptions {
  minWidth?: number;
  maxWidth?: number;
  initialWidth?: number;
}

export function useResizable({
  minWidth = 200,
  maxWidth = 600,
  initialWidth = 320
}: ResizableOptions = {}) {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startWidth: width
    };
  }, [width]);

  const stopResize = useCallback(() => {
    setIsResizing(false);
    resizeRef.current = null;
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeRef.current) return;

    const { startX, startWidth } = resizeRef.current;
    const delta = e.clientX - startX;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));
    
    setWidth(newWidth);
  }, [isResizing, minWidth, maxWidth]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResize);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, resize, stopResize]);

  return {
    width,
    setWidth,
    isResizing,
    startResize
  };
}

export function useResizableHorizontal({
  minHeight = 100,
  maxHeight = 600,
  initialHeight = 200
}: {
  minHeight?: number;
  maxHeight?: number;
  initialHeight?: number;
} = {}) {
  const [height, setHeight] = useState(initialHeight);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startY: e.clientY,
      startHeight: height
    };
  }, [height]);

  const stopResize = useCallback(() => {
    setIsResizing(false);
    resizeRef.current = null;
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeRef.current) return;

    const { startY, startHeight } = resizeRef.current;
    const delta = startY - e.clientY; // Invert for bottom-up resize
    const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + delta));
    
    setHeight(newHeight);
  }, [isResizing, minHeight, maxHeight]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResize);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, resize, stopResize]);

  return {
    height,
    setHeight,
    isResizing,
    startResize
  };
}
