"use client";

export function ArchitectureSection() {
  return (
    <section id="architecture" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            서비스는 이렇게 돌아가요
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
            여러 AI가 협력하는 구조로
            <br />
            안정적이고 편리하게 설계되었습니다.
          </p>
        </div>

        <div className="mt-16">
          <div className="rounded-xl border border-border bg-card p-8">
            <div className="flex flex-col items-center gap-8">
              <div className="w-full max-w-md">
                <div className="rounded-lg border border-border bg-secondary p-4 text-center">
                  <span className="text-sm font-medium text-foreground">사용자 화면</span>
                  <p className="mt-1 text-xs text-muted-foreground">웹 / 모바일 앱</p>
                </div>
              </div>

              <div className="h-8 w-px bg-border" />

              <div className="w-full max-w-lg">
                <div className="rounded-lg border border-accent/50 bg-accent/10 p-4 text-center">
                  <span className="text-sm font-medium text-foreground">접속·보안</span>
                  <p className="mt-1 text-xs text-muted-foreground">로그인 · 안전한 연결</p>
                </div>
              </div>

              <div className="h-8 w-px bg-border" />

              <div className="w-full max-w-2xl">
                <div className="rounded-lg border border-border bg-background p-4 text-center">
                  <span className="text-sm font-medium text-foreground">AI 총괄·조율</span>
                  <p className="mt-1 text-xs text-muted-foreground">질문을 맞는 AI에게 연결</p>
                </div>
              </div>

              <div className="flex w-full max-w-4xl items-center justify-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <div className="h-px flex-1 bg-border" />
                <div className="h-px flex-1 bg-border" />
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
                {["재고 도우미", "레시피 도우미", "장보기 도우미", "알림 도우미"].map((name, index) => (
                  <div key={index} className="rounded-lg border border-border bg-secondary p-3 text-center">
                    <span className="text-xs font-medium text-foreground">{name}</span>
                  </div>
                ))}
              </div>

              <div className="flex w-full max-w-4xl items-center justify-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-card p-3 text-center">
                  <span className="text-xs font-medium text-foreground">레시피 검색 DB</span>
                  <p className="mt-1 text-xs text-muted-foreground">요리 정보 저장</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3 text-center">
                  <span className="text-xs font-medium text-foreground">PostgreSQL</span>
                  <p className="mt-1 text-xs text-muted-foreground">회원 · 재고 데이터</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">사용 기술</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
            {["Next.js", "LangChain", "OpenAI", "PostgreSQL", "Pinecone", "Vercel"].map((tech) => (
              <span key={tech} className="text-sm font-medium text-foreground/60">{tech}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
