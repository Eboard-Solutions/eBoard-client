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
    <div className="container mx-auto max-w-5xl px-4 md:px-6 py-8">
      <PageHeader icon={icon} title={title} color={color ?? 'bg-indigo-600'} subtitle={subtitle} />
      <div className="mt-4">{children}</div>
    </div>
  );
}
