import React, { useState, useEffect, useRef } from 'react';

interface BlurImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  fallbackInitials?: string;
  showSpinner?: boolean;
}

/**
 * BlurImage Component:
 * Starts with a full Gaussian blur and smooth shimmer background,
 * and transitions gracefully to crisp focus upon image load.
 */
export function BlurImage({
  src,
  alt = '',
  className = '',
  containerClassName = '',
  fallbackInitials,
  showSpinner = false,
  ...props
}: BlurImageProps) {
  const [isLoaded, setIsLoaded] = useState(() => {
    if (typeof window === 'undefined' || !src) return false;
    const testImg = new Image();
    testImg.src = src;
    return Boolean(testImg.complete && testImg.naturalWidth > 0);
  });
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Check if image is already cached in memory or completed by the browser
  useEffect(() => {
    setHasError(false);

    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [src]);

  if (!src || hasError) {
    if (fallbackInitials) {
      return (
        <div
          className={`flex h-full w-full items-center justify-center font-bold text-rose-300 bg-rose-50 select-none ${containerClassName}`}
        >
          {fallbackInitials}
        </div>
      );
    }
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-slate-100 text-slate-300 select-none ${containerClassName}`}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden w-full h-full bg-slate-100 ${containerClassName}`}>
      {/* Animated shimmer skeleton while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 z-0 img-shimmer-bg animate-pulse" />
      )}

      {/* The actual image with full blur transitioning to clear focus */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`${className} transition-all duration-700 ease-out will-change-[filter,transform,opacity] ${
          isLoaded
            ? 'filter-none scale-100 opacity-100'
            : 'filter blur-xl scale-110 opacity-70'
        }`}
        {...props}
      />
    </div>
  );
}
