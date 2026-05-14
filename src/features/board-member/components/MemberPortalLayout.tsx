import React from 'react';
import type { ElementType, ReactNode } from 'react';
import { PageHeader } from './page-helpers';

export default function MemberPortalLayout({
  icon,
  title,
  color,
  subtitle,
  children,
}: {
  icon: ElementType;
  title: string;
  color?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative w-full min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent" />
      <div className="mx-auto w-full max-w-none space-y-6">
        <PageHeader icon={icon} title={title} color={color ?? 'bg-indigo-600'} subtitle={subtitle} />
        <div className="w-full min-w-0">{children}</div>
      </div>
    </div>
  );
}
