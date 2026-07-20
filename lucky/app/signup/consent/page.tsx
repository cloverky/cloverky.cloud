'use client';
import { Suspense } from 'react';
import ConsentContent from './ConsentContent';

export default function ConsentPage() {
  return (
    <Suspense fallback={<div className=flex min-h-screen items-center justify-center><p className=text-muted-foreground>로딩 중...</p></div>}>
      <ConsentContent />
    </Suspense>
  );
}
