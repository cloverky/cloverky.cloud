'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-context';

const TERMS = [
  { id: 'terms', label: '이용약관 동의', required: true, detail: 'FridgeAI 서비스 이용약관에 동의합니다.' },
  { id: 'privacy', label: '개인정보 수집 및 이용 동의', required: true, detail: '서비스 제공을 위한 개인정보(이름, 이메일)를 수집·이용합니다.' },
  { id: 'marketing', label: '마케팅 정보 수신 동의', required: false, detail: '이벤트, 혜택 등 마케팅 정보를 수신합니다.' },
] as const;

type TermId = typeof TERMS[number]['id'];

export default function ConsentContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();

  const token = params.get('token') ?? '';
  const name = params.get('name') ?? '';
  const email = params.get('email') ?? '';
  const usernameParam = params.get('username') ?? '';

  const [checked, setChecked] = useState<Record<TermId, boolean>>({
    terms: false, privacy: false, marketing: false,
  });
  const [expanded, setExpanded] = useState<Record<TermId, boolean>>({
    terms: false, privacy: false, marketing: false,
  });

  const allRequired = TERMS.filter(t => t.required).every(t => checked[t.id]);
  const allChecked = TERMS.every(t => checked[t.id]);

  const toggleAll = () => {
    const next = !allChecked;
    setChecked({ terms: next, privacy: next, marketing: next });
  };

  const toggle = (id: TermId) => setChecked(p => ({ ...p, [id]: !p[id] }));

  const handleConsent = () => {
    if (!token) { router.replace('/'); return; }
    localStorage.setItem('access_token', token);
    const username = usernameParam || email.split('@')[0];
    if (window.opener) {
      // 이 창(팝업)의 sessionStorage는 팝업이 닫히면 사라지므로, 신원 정보를
      // postMessage에 실어 오프너가 자신의 login()을 호출하도록 한다.
      window.opener.postMessage({ type: 'oauth_done', username, name, email }, window.location.origin);
      window.close();
    } else {
      login({ username, name, email }, true);
      router.replace('/');
    }
  };

  const handleCancel = () => {
    if (window.opener) { window.close(); } else { router.replace('/'); }
  };

  const circleClass = (on: boolean) =>
    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ' +
    (on ? 'border-accent bg-accent' : 'border-border bg-background');

  const Checkmark = () => (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        {/* 헤더 */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
              <path d="M5 6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6Z"/>
              <path d="M5 10h14"/>
              <path d="M15 7v6"/>
            </svg>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">소셜 회원가입</p>
            <p className="text-sm font-semibold text-foreground">FridgeAI</p>
          </div>
        </div>

        {/* 타이틀 */}
        <div className="px-5 pt-5 pb-3">
          <h1 className="text-base font-bold text-foreground">서비스 약관 동의</h1>
          {name && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{name}</span>님, 환영합니다!
            </p>
          )}
        </div>

        {/* 전체 동의 */}
        <div className="px-5 pb-2">
          <button
            type="button"
            onClick={toggleAll}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-2.5 transition hover:bg-secondary"
          >
            <div className={circleClass(allChecked)}>
              {allChecked && <Checkmark />}
            </div>
            <span className="text-sm font-semibold text-foreground">전체 동의하기</span>
            <span className="text-xs text-muted-foreground">선택 동의 포함</span>
          </button>
        </div>

        <div className="mx-5 h-px bg-border" />

        {/* 약관 목록 */}
        <div className="px-5 pt-2 pb-1">
          {TERMS.map(term => (
            <div key={term.id}>
              <div className="flex items-center gap-3 py-2.5">
                <button type="button" onClick={() => toggle(term.id)} className={circleClass(checked[term.id])}>
                  {checked[term.id] && <Checkmark />}
                </button>
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => setExpanded(p => ({ ...p, [term.id]: !p[term.id] }))}
                >
                  <span className="text-sm text-foreground">
                    <span className={'mr-1 text-xs font-medium ' + (term.required ? 'text-accent' : 'text-muted-foreground')}>
                      [{term.required ? '필수' : '선택'}]
                    </span>
                    {term.label}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(p => ({ ...p, [term.id]: !p[term.id] }))}
                  className="text-muted-foreground"
                >
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: expanded[term.id] ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                  >
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
              {expanded[term.id] && (
                <div className="mb-1 ml-8 rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                  {term.detail}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="px-5 pb-3 text-center text-[11px] leading-relaxed text-muted-foreground">
          FridgeAI는 회원가입·로그인 기능 제공자이며,<br/>
          개인정보 수집·이용에 대한 책임은 FridgeAI에 있습니다.
        </p>

        {/* 버튼 */}
        <div className="flex border-t border-border">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-3.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary"
          >
            취소
          </button>
          <div className="w-px bg-border" />
          <button
            type="button"
            onClick={handleConsent}
            disabled={!allRequired}
            className="flex-1 py-3.5 text-sm font-semibold text-accent transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            동의하기
          </button>
        </div>
      </div>
    </div>
  );
}
