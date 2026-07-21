import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Clover,
  ChefHat,
  Package,
} from "lucide-react";

export type FeatureSlug =
  | "inventory"
  | "recipes"
  | "receipt"
  | "shopping"
  | "alerts"
  | "analytics"
  | "personalization";

export type FeatureHighlight = {
  title: string;
  description: string;
};

export type FeatureStat = {
  label: string;
  value: string;
  hint?: string;
};

export type FeatureTableSection = {
  type: "table";
  title: string;
  description?: string;
  columns: string[];
  rows: string[][];
};

export type FeatureListSection = {
  type: "list";
  title: string;
  description?: string;
  items: string[];
};

export type FeatureStepsSection = {
  type: "steps";
  title: string;
  description?: string;
  steps: { title: string; description: string }[];
};

export type FeatureSection =
  | FeatureTableSection
  | FeatureListSection
  | FeatureStepsSection;

export type FeaturePageConfig = {
  slug: FeatureSlug;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tagline: string;
  agentName: string;
  highlights: FeatureHighlight[];
  stats: FeatureStat[];
  sections: FeatureSection[];
  geminiPrompt: string;
};

export const FEATURE_PAGES: Partial<Record<FeatureSlug, FeaturePageConfig>> = {
  inventory: {
    slug: "inventory",
    icon: Package,
    title: "실시간 재고 관리",
    subtitle: "냉장고 안 식재료를 한눈에 파악하세요.",
    tagline:
      "냉장고 내 식재료를 자동으로 인식하고 추적하여 재고 현황을 실시간으로 파악합니다.",
    agentName: "재고 담당 AI",
    highlights: [
      {
        title: "자동 인식·분류",
        description: "식재료를 카테고리별로 정리하고 수량을 추적합니다.",
      },
      {
        title: "유통기한 추적",
        description: "임박·만료 상태를 뱃지로 바로 확인합니다.",
      },
      {
        title: "보관 위치",
        description: "냉장·냉동·실온 구역별로 목록을 관리합니다.",
      },
    ],
    stats: [],
    sections: [],
    geminiPrompt: "냉장고에 우유 2팩, 달걀 10개, 상추 1통이 있을 때 오늘 저녁 메뉴를 추천해줘.",
  },
  recipes: {
    slug: "recipes",
    icon: ChefHat,
    title: "맞춤형 레시피 추천",
    subtitle: "지금 있는 재료로 무엇을 만들지 AI가 골라줍니다.",
    tagline:
      "보유 식재료와 개인 취향을 분석하여 최적의 레시피를 AI가 추천합니다.",
    agentName: "레시피 담당 AI",
    highlights: [
      {
        title: "재료 기반 매칭",
        description: "보유 재고와 레시피 필요 재료를 맞춥니다.",
      },
      {
        title: "영양·난이도 필터",
        description: "조리 시간, 난이도, 식단 제한을 반영합니다.",
      },
      {
        title: "대체 재료 제안",
        description: "없는 재료는 비슷한 대안을 안내합니다.",
      },
    ],
    stats: [],
    sections: [],
    geminiPrompt:
      "우유, 달걀, 상추로 만들 수 있는 한식 레시피 3가지를 단계별로 알려줘.",
  },
  alerts: {
    slug: "alerts",
    icon: Bell,
    title: "스마트 알림",
    subtitle: "유통기한·재고 부족을 미리 알려 음식물 낭비를 줄입니다.",
    tagline:
      "유통기한 임박, 재고 부족 등을 미리 알려주어 음식물 낭비를 줄입니다.",
    agentName: "알림 담당 AI",
    highlights: [
      {
        title: "유통기한 알림",
        description: "D-3, D-1 등 원하는 시점에 알려드립니다.",
      },
      {
        title: "재고 부족 알림",
        description: "자주 쓰는 재료가 떨어지기 전에 알립니다.",
      },
      {
        title: "레시피 연동",
        description: "임박 재료로 만들 수 있는 요리를 함께 제안합니다.",
      },
    ],
    stats: [],
    sections: [],
    geminiPrompt: "유통기한이 임박한 우유와 상추로 만들 수 있는 요리를 알려줘.",
  },
  analytics: {
    slug: "analytics",
    icon: BarChart3,
    title: "소비 패턴 분석",
    subtitle: "무엇을 자주 사고, 무엇을 버리는지 숫자로 확인하세요.",
    tagline:
      "식재료 소비 패턴을 분석하여 효율적인 장보기 리스트를 제안합니다.",
    agentName: "장보기·소비 담당 AI",
    highlights: [
      {
        title: "주간·월간 리포트",
        description: "카테고리별 소비 추이를 한눈에 봅니다.",
      },
      {
        title: "장보기 리스트",
        description: "패턴 기반으로 다음 구매 목록을 제안합니다.",
      },
      {
        title: "절약 인사이트",
        description: "폐기·과소비 항목을 짚어 드립니다.",
      },
    ],
    stats: [],
    sections: [],
    geminiPrompt:
      "유제품 소비가 늘었을 때 장보기를 어떻게 줄이면 좋을지 조언해줘.",
  },
  personalization: {
    slug: "personalization",
    icon: Clover,
    title: "내 취향 기억하기",
    subtitle: "쓸수록 나에게 맞춰지는 FridgeAI.",
    tagline: "사용할수록 취향을 기억해, 더 잘 맞는 추천을 해 드립니다.",
    agentName: "모든 AI 도우미",
    highlights: [
      {
        title: "취향 프로필",
        description: "알레르기, 매운맛, 조리 시간 선호를 저장합니다.",
      },
      {
        title: "피드백 학습",
        description: "추천에 대한 👍👎로 정확도를 높입니다.",
      },
      {
        title: "프라이버시",
        description: "취향 데이터는 내 계정에만 사용됩니다.",
      },
    ],
    stats: [],
    sections: [],
    geminiPrompt:
      "나는 한식·간단요리를 좋아하고 조리 시간은 30분 이하를 선호해. 이 취향으로 레시피를 추천해줘.",
  },
};

export const FEATURE_SLUGS = Object.keys(FEATURE_PAGES) as FeatureSlug[];

export function getFeaturePage(slug: string): FeaturePageConfig | undefined {
  if (slug in FEATURE_PAGES) {
    return FEATURE_PAGES[slug as FeatureSlug];
  }
  return undefined;
}

/** 홈 `features-section` 카드 순서와 동일 */
export const HOME_FEATURE_LINKS: {
  slug: FeatureSlug;
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    slug: "inventory",
    icon: Package,
    title: "재고 관리",
    description:
      "냉장고 식재료를 추가하고\n유통기한을 한눈에 확인합니다.",
  },
  {
    slug: "recipes",
    icon: ChefHat,
    title: "레시피 추천",
    description:
      "보유 재료로 만들 수 있는\n레시피를 AI가 추천합니다.",
  },
  {
    slug: "receipt",
    icon: Bell,
    title: "영수증 스캔",
    description:
      "영수증을 찍으면\n냉장고에 자동으로 채워집니다.",
  },
  {
    slug: "shopping",
    icon: BarChart3,
    title: "쇼핑 연결",
    description:
      "부족한 재료를\n바로 주문할 수 있습니다.",
  },
  {
    slug: "alerts",
    icon: Bell,
    title: "유통기한 알림",
    description:
      "임박한 재료를\n미리 알려드립니다.",
  },
  {
    slug: "analytics",
    icon: BarChart3,
    title: "소비 패턴 분석",
    description:
      "내 소비 습관을 분석해\n장보기를 더 똑똑하게.",
  },
  {
    slug: "personalization",
    icon: Clover,
    title: "취향 기억",
    description:
      "쓸수록 나에게 맞춰지는\n맞춤형 추천.",
  },
];
