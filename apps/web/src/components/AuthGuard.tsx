'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LoadingScreen } from './LoadingScreen';
import { UserRole } from '@clias/shared-types';

function getAuthorizedDashboard(user: any): string {
  if (!user) return '/auth/login';
  switch (user.role) {
    case UserRole.STUDENT:
      return '/student/dashboard';
    case UserRole.FACULTY:
      return '/faculty/dashboard';
    case UserRole.COUNSELLOR:
      return '/counsellor/dashboard';
    case UserRole.HOD:
      return '/hod/dashboard';
    case UserRole.HEAD:
      return '/head/dashboard';
    case UserRole.SUPER_ADMIN:
      return '/admin/dashboard';
    default:
      if (user.isFaculty) return '/faculty/dashboard';
      if (user.isCounsellor) return '/counsellor/dashboard';
      return '/student/dashboard';
  }
}

function isUserAuthorizedForPath(user: any, pathname: string): boolean {
  if (!user) return false;
  if (user.role === UserRole.SUPER_ADMIN) return true;

  if (pathname.startsWith('/student')) {
    return user.role === UserRole.STUDENT;
  }
  if (pathname.startsWith('/faculty')) {
    return (
      user.role === UserRole.FACULTY ||
      user.role === UserRole.HOD ||
      Boolean(user.isFaculty)
    );
  }
  if (pathname.startsWith('/counsellor')) {
    return (
      user.role === UserRole.COUNSELLOR ||
      user.role === UserRole.HOD ||
      Boolean(user.isCounsellor)
    );
  }
  if (pathname.startsWith('/hod')) {
    return user.role === UserRole.HOD;
  }
  if (pathname.startsWith('/head')) {
    return user.role === UserRole.HEAD;
  }
  if (pathname.startsWith('/admin')) {
    return user.role === UserRole.SUPER_ADMIN;
  }
  if (pathname === '/profile') {
    return true;
  }

  return true;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isLoggingOut } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine route classifications
  const isAuthRoute = pathname.startsWith('/auth');
  const isLandingPage = pathname === '/';
  const isProtectedRoute =
    pathname.startsWith('/student') ||
    pathname.startsWith('/faculty') ||
    pathname.startsWith('/counsellor') ||
    pathname.startsWith('/hod') ||
    pathname.startsWith('/head') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/profile');

  // Side-effect: Handle redirects safely once loading finishes
  useEffect(() => {
    if (!mounted || loading || isLoggingOut) return;

    if (isProtectedRoute && !user) {
      router.replace('/auth/login');
      return;
    }

    if (isProtectedRoute && user && !isUserAuthorizedForPath(user, pathname)) {
      const target = getAuthorizedDashboard(user);
      router.replace(target);
      return;
    }

    if (isAuthRoute && user) {
      const target = getAuthorizedDashboard(user);
      router.replace(target);
      return;
    }
  }, [mounted, loading, isLoggingOut, user, pathname, isProtectedRoute, isAuthRoute, router]);

  // Determine whether to display the round loader overlay over the blurred page
  const showLoader =
    isLoggingOut ||
    (isProtectedRoute && (!mounted || loading || !user || !isUserAuthorizedForPath(user, pathname))) ||
    (isAuthRoute && mounted && !loading && Boolean(user));

  return (
    <>
      {children}
      {showLoader && <LoadingScreen />}
    </>
  );
}
