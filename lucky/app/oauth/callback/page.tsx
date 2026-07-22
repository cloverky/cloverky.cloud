'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-context';

function OAuthHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    const name = params.get('name') ?? '';
    const email = params.get('email') ?? '';
    if (!token) { router.replace('/'); return; }
    localStorage.setItem('access_token', token);
    login({ username: email.split('@')[0], name, email }, true);
    if (window.opener) {
      window.opener.postMessage({ type: 'oauth_done' }, window.location.origin);
      window.close();
    } else {
      router.replace('/');
    }
  }, [params, login, router]);

  return <p className='text-muted-foreground'>로그인 처리 중...</p>;
}

export default function OAuthCallbackPage() {
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <Suspense fallback={<p className='text-muted-foreground'>로딩 중...</p>}>
        <OAuthHandler />
      </Suspense>
    </div>
  );
}
