'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SidebarContextType {
  isPinned: boolean;
  togglePin: () => void;
  setIsPinned: (pinned: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isPinned: false,
  togglePin: () => {},
  setIsPinned: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Default to false (collapsed icon-only mode) so page occupies whole space unless pinned
  const [isPinned, setIsPinnedState] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('clias_sidebar_pinned');
      if (saved !== null) {
        const val = saved === 'true';
        setIsPinnedState(val);
        document.body.setAttribute('data-sidebar', val ? 'pinned' : 'collapsed');
      } else {
        document.body.setAttribute('data-sidebar', 'collapsed');
      }
    } catch (e) {
      document.body.setAttribute('data-sidebar', 'collapsed');
    }
  }, []);

  const setIsPinned = (pinned: boolean) => {
    setIsPinnedState(pinned);
    try {
      localStorage.setItem('clias_sidebar_pinned', String(pinned));
      document.body.setAttribute('data-sidebar', pinned ? 'pinned' : 'collapsed');
    } catch (e) {}
  };

  const togglePin = () => {
    setIsPinnedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('clias_sidebar_pinned', String(next));
        document.body.setAttribute('data-sidebar', next ? 'pinned' : 'collapsed');
      } catch (e) {}
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ isPinned, togglePin, setIsPinned }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
