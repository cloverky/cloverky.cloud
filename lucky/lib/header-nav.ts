export type HeaderNavLink = {
  label: string;
  href: string;
  description?: string;
  external?: boolean;
};

export type HeaderNavMenu = {
  label: string;
  href: string;
  items: HeaderNavLink[];
};

export const HEADER_NAV_MENUS: HeaderNavMenu[] = [
  {
    label: "기능",
    href: "/#features",
    items: [
      {
        label: "재고 관리",
        href: "/features/inventory",
        description: "식재료 재고·유통기한 추적",
      },
      {
        label: "레시피 추천",
        href: "/features/recipes",
        description: "보유 재료로 요리 추천",
      },
      {
        label: "쇼핑 연결",
        href: "/features/shopping",
        description: "부족한 재료 바로 주문",
      },
      {
        label: "유통기한 알림",
        href: "/features/alerts",
        description: "임박 재료 푸시·이메일 알림",
      },
      {
        label: "소비 패턴 분석",
        href: "/features/analytics",
        description: "장보기·소비 리포트",
      },
      {
        label: "취향 기억",
        href: "/features/personalization",
        description: "쓸수록 나에게 맞춰짐",
      },
    ],
  },
  {
    label: "메일관리",
    href: "/mail/contacts",
    items: [
      {
        label: "주소록",
        href: "/mail/contacts",
        description: "연락처 관리 및 CSV 업로드",
      },
    ],
  },
];
