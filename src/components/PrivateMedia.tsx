import { useEffect, useState } from 'react';
import { fetchPrivateMediaBlobUrl } from '../lib/api';

export function PrivateImage({
  fileId,
  alt,
  className,
}: {
  fileId: string;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    fetchPrivateMediaBlobUrl(fileId)
      .then((url) => {
        objectUrl = url;
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  if (error) {
    return (
      <div className="flex h-36 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs text-white/50">
        Unable to load image
      </div>
    );
  }
  if (!src) {
    return <div className="h-36 animate-pulse rounded-xl bg-white/5" />;
  }
  return <img src={src} alt={alt} referrerPolicy="no-referrer" className={className} />;
}

export function PrivateVideo({
  fileId,
  className,
}: {
  fileId: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    fetchPrivateMediaBlobUrl(fileId)
      .then((url) => {
        objectUrl = url;
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  if (error) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs text-white/50">
        Unable to stream private demo video
      </div>
    );
  }
  if (!src) {
    return <div className="h-48 animate-pulse rounded-xl bg-white/5" />;
  }
  return <video src={src} controls className={className} />;
}
