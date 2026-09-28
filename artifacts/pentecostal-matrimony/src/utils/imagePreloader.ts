import { useState, useEffect } from 'react';

/**
 * Preload a single image URL into the browser cache.
 */
export function preloadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url || typeof window === 'undefined') {
      resolve(false);
      return;
    }
    const img = new Image();
    img.src = url;
    if (img.complete && img.naturalWidth > 0) {
      resolve(true);
      return;
    }
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
  });
}

/**
 * Preload an array of image URLs in parallel with an optional safety timeout.
 */
export function preloadImages(
  urls: (string | undefined | null)[],
  timeoutMs: number = 2200
): Promise<boolean[]> {
  const validUrls = urls.filter((u): u is string => Boolean(u && typeof u === 'string'));
  if (validUrls.length === 0) return Promise.resolve([]);

  const promises = validUrls.map((url) => preloadImage(url));
  const timeoutPromise = new Promise<boolean[]>((resolve) =>
    setTimeout(() => resolve([]), timeoutMs)
  );

  return Promise.race([Promise.all(promises), timeoutPromise]);
}

/**
 * React hook that holds isImagesLoaded = false while candidate photo URLs are downloading in the background.
 * Keeps the skeleton loading state active on screen until background images are cached.
 */
export function usePreloadProfileImages(
  urls: (string | undefined | null)[],
  enabled: boolean = true,
  timeoutMs: number = 2200
): boolean {
  const [loaded, setLoaded] = useState<boolean>(false);
  const cacheKey = urls.filter(Boolean).join('|');

  useEffect(() => {
    if (!enabled) {
      setLoaded(true);
      return;
    }

    const valid = urls.filter((u): u is string => Boolean(u && typeof u === 'string'));
    if (valid.length === 0) {
      setLoaded(true);
      return;
    }

    let active = true;
    setLoaded(false);

    preloadImages(valid, timeoutMs).then(() => {
      if (active) {
        setLoaded(true);
      }
    });

    return () => {
      active = false;
    };
  }, [cacheKey, enabled, timeoutMs]);

  return loaded;
}
