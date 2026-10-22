'use client';

import React from 'react';

export function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/25 dark:bg-black/45 backdrop-blur-md pointer-events-auto transition-opacity duration-150"
      role="status"
      aria-label="Loading"
    >
      {/* 100% geometrically round SVG vector spinner - immune to CSS border-radius: 0 */}
      <svg
        className="w-12 h-12 animate-spin text-[#e05033]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3.5"
        />
        <path
          className="opacity-100"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}
