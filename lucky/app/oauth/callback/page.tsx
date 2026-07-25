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
    const username = params.get('username') || email.split('@')[0];
    if (window.opener) {
      // 이 창(팝업)의 sessionStorage는 팝업이 닫히면 사라지므로, 신원 정보를
      // postMessage에 실어 오프너가 자신의 login()을 호출하도록 한다.
      window.opener.postMessage({ type: 'oauth_done', username, name, email }, window.location.origin);
      window.close();
    } else {
      login({ username, name, email }, true);
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
