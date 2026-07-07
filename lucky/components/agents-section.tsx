"use client";

const helpers = [
  {
    name: "재고 담당 AI",
    description: "냉장고 안 식재료를 파악하고, 수량과 유통기한을 챙겨 드립니다.",
    responsibilities: [
      "식재료 자동 인식 및 분류",
      "재고 수량 실시간 업데이트",
      "유통기한 모니터링",
    ],
  },
  {
    name: "레시피 담당 AI",
    description: "지금 있는 재료와 취향에 맞는 요리를 골라 추천합니다.",
    responsibilities: [
      "보유 식재료 기반 레시피 매칭",
      "영양 균형 고려 추천",
      "난이도별 레시피 필터링",
    ],
  },
  {
    name: "장보기·소비 담당 AI",
    description: "무엇을 자주 사고 쓰는지 보고, 알뜰한 장보기를 돕습니다.",
    responsibilities: [
      "주간/월간 소비 리포트",
      "장보기 리스트 자동 생성",
      "비용 절감 팁 제공",
    ],
  },
  {
    name: "알림 담당 AI",
    description: "유통기한·재고 부족 등 꼭 필요한 소식을 알려 드립니다.",
    responsibilities: [
      "유통기한 임박 알림",
      "재고 부족 알림",
      "레시피 추천 알림",
    ],
  },
];

export function AgentsSection() {
  return (
    <section id="agents" className="border-t border-border bg-card/50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            AI 도우미 팀
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
            4명의 AI가 각자 맡은 일을 하며
            <br />
            냉장고 관리를 더 편하게 만들어 드립니다.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {helpers.map((helper, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-background p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {helper.name}
                </h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {helper.description}
              </p>
              <ul className="mt-4 space-y-2">
                {helper.responsibilities.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
