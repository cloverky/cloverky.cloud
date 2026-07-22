'use client';

import { useAuth } from '@/components/auth-context';

interface Props {
  onClose: () => void;
}

const GATEWAY_PROVIDERS = new Set(['google', 'naver', 'kakao']);

export function SocialLoginButtons({ onClose }: Props) {
  const { login } = useAuth();

  const handleSocialLogin = (provider: string) => {
    const url = GATEWAY_PROVIDERS.has(provider)
      ? (process.env.NEXT_PUBLIC_AUTH_URL ?? 'https://auth.cloverky.cloud') + '/auth/login/' + provider
      : (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.cloverky.cloud') + '/auth/' + provider;
    const w = 480, h = 600;
    const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
    const popup = window.open(url, 'social_login', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`);

    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'oauth_done') {
        window.removeEventListener('message', onMsg);
        const { username, name, email } = e.data;
        // 팝업과 이 창은 sessionStorage를 공유하지 않으므로, 팝업 안에서 호출한
        // login()은 팝업이 닫히면 같이 사라진다 — 신원 정보를 postMessage로
        // 직접 받아 이 창(오프너) 자신의 login()을 호출해야 한다.
        if (username && email) {
          login({ username, name: name || username, email }, true);
        }
        onClose();
      }
    };
    window.addEventListener('message', onMsg);

    const timer = setInterval(() => {
      if (popup?.closed) { clearInterval(timer); window.removeEventListener('message', onMsg); }
    }, 500);
  };

  return (
    <div className='mt-2'>
      <div className='relative my-3 flex items-center gap-3'>
        <div className='h-px flex-1 bg-border' />
        <span className='text-xs text-muted-foreground'>또는</span>
        <div className='h-px flex-1 bg-border' />
      </div>
      <div className='flex justify-center gap-3'>
        <button
          type='button'
          onClick={() => handleSocialLogin('kakao')}
          className='flex h-12 w-12 items-center justify-center rounded-xl transition hover:opacity-80'
          style={{ backgroundColor: '#FEE500' }}
          aria-label='카카오 로그인'
        >
          <svg width='22' height='22' viewBox='0 0 24 24' fill='none'>
            <path d='M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.6 5.08 4.03 6.54L5 21l4.47-2.4c.83.17 1.67.26 2.53.26 5.523 0 10-3.477 10-7.8C22 6.477 17.523 3 12 3z' fill='#000000'/>
          </svg>
        </button>
        <button
          type='button'
          onClick={() => handleSocialLogin('naver')}
          className='flex h-12 w-12 items-center justify-center rounded-xl transition hover:opacity-80'
          style={{ backgroundColor: '#03CF5D' }}
          aria-label='네이버 로그인'
        >
          <svg width='20' height='20' viewBox='0 0 24 24' fill='white'>
            <path d='M13.5 12.6L10.2 7H7v10h3.5V11.4L14 17H17V7h-3.5z'/>
          </svg>
        </button>
        <button
          type='button'
          onClick={() => handleSocialLogin('apple')}
          className='flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary transition hover:opacity-80'
          aria-label='애플 로그인'
        >
          <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'>
            <path d='M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z'/>
          </svg>
        </button>
        <button
          type='button'
          onClick={() => handleSocialLogin('google')}
          className='flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary transition hover:opacity-80'
          aria-label='구글 로그인'
        >
          <svg width='20' height='20' viewBox='0 0 24 24'>
            <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' fill='#4285F4'/>
            <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' fill='#34A853'/>
            <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' fill='#FBBC05'/>
            <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' fill='#EA4335'/>
          </svg>
        </button>
      </div>
    </div>
  );
}
