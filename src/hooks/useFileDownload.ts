'use client';

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

type DownloadTrigger = () => Promise<{ data?: Blob | undefined; error?: unknown }>;

interface UseFileDownloadOptions {
  defaultFilename?: string;
  timeoutMs?: number;
}

interface UseFileDownloadResult {
  isDownloading: boolean;
  download: (trigger: DownloadTrigger, filename?: string) => Promise<void>;
}

export function useFileDownload(options?: UseFileDownloadOptions): UseFileDownloadResult {
  const [isDownloading, setIsDownloading] = useState(false);
  const timeoutMs = options?.timeoutMs ?? 30_000;

  const download = useCallback(
    async (trigger: DownloadTrigger, filename?: string) => {
      if (isDownloading) return;
      setIsDownloading(true);

      try {
        const result = await Promise.race([
          trigger(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs),
          ),
        ]);

        if (result.error) {
          // Extract a user-friendly message from RTK Query error
          const err = result.error as Record<string, unknown>;
          const msg =
            (err?.data as Record<string, unknown>)?.message as string ??
            (err?.message as string) ??
            'Download failed. Please try again.';
          toast.error(msg);
          return;
        }

        if (result.data instanceof Blob && result.data.size > 0) {
          const blobUrl = URL.createObjectURL(result.data);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename ?? options?.defaultFilename ?? 'download';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        } else {
          toast.error('No file data received. Please try again.');
        }
      } catch (err) {
        const isTimeout = err instanceof Error && err.message === 'TIMEOUT';
        toast.error(
          isTimeout
            ? 'Download timed out. Please try again.'
            : 'Download failed. Please try again.',
        );
      } finally {
        setIsDownloading(false);
      }
    },
    [isDownloading, options?.defaultFilename, timeoutMs],
  );

  return { isDownloading, download };
}
