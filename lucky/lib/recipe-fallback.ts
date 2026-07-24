import type { MealSuggestion, RecipeDetail, RecipeSummary, SuggestedRecipe } from "@/app/api/gemini/recipes/route";

// AI 호출이 실패했을 때 에러 대신 보여줄 "손맛" 레시피들.
type Meal = "아침" | "점심" | "저녁";

type FallbackRecipe = {
  name: string;
  time: string;
  difficulty: string;
  tags: string[];
  meals: Meal[];
  servings: string;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  tips: string;
};

const PANTRY = ["소금", "간장", "설탕", "참기름", "식용유", "다진 마늘", "후추", "고춧가루"];

const RECIPES: FallbackRecipe[] = [
  {
    name: "계란볶음밥",
    time: "15분",
    difficulty: "쉬움",
    tags: ["밥", "달걀", "양파", "대파"],
    meals: ["아침", "점심"],
    servings: "1인분",
    ingredients: [
      { name: "밥", amount: "1공기" },
      { name: "달걀", amount: "2개" },
      { name: "양파", amount: "1/4개" },
      { name: "대파", amount: "약간" },
      { name: "간장", amount: "1큰술" },
    ],
    steps: [
      "양파와 대파를 잘게 썬다.",
      "팬에 식용유를 두르고 대파를 먼저 볶아 파기름을 낸다.",
      "양파를 넣고 투명해질 때까지 볶는다.",
      "달걀을 풀어 넣고 반쯤 익으면 밥을 넣어 함께 볶는다.",
      "간장을 팬 가장자리에 둘러 넣고 센 불에서 1분 더 볶는다.",
    ],
    tips: "밥은 찬밥일수록 고슬고슬하게 볶아집니다.",
  },
  {
    name: "계란말이",
    time: "15분",
    difficulty: "쉬움",
    tags: ["달걀", "양파", "당근", "대파"],
    meals: ["아침", "점심"],
    servings: "2인분",
    ingredients: [
      { name: "달걀", amount: "4개" },
      { name: "양파", amount: "1/4개" },
      { name: "당근", amount: "약간" },
      { name: "소금", amount: "한 꼬집" },
    ],
    steps: [
      "양파와 당근을 아주 잘게 다진다.",
      "달걀을 풀고 다진 채소와 소금을 넣어 섞는다.",
      "약불로 달군 팬에 기름을 얇게 두르고 달걀물의 1/3을 붓는다.",
      "가장자리가 익으면 한쪽부터 말고, 남은 달걀물을 나눠 부으며 반복한다.",
      "한 김 식힌 뒤 먹기 좋은 두께로 썬다.",
    ],
    tips: "약불에서 천천히 말아야 갈라지지 않습니다.",
  },
  {
    name: "프렌치토스트",
    time: "10분",
    difficulty: "쉬움",
    tags: ["식빵", "달걀", "우유", "버터"],
    meals: ["아침"],
    servings: "1인분",
    ingredients: [
      { name: "식빵", amount: "2장" },
      { name: "달걀", amount: "1개" },
      { name: "우유", amount: "100ml" },
      { name: "설탕", amount: "1작은술" },
    ],
    steps: [
      "달걀, 우유, 설탕을 잘 섞어 달걀물을 만든다.",
      "식빵을 달걀물에 30초씩 앞뒤로 충분히 적신다.",
      "약불 팬에 버터를 녹이고 식빵을 올린다.",
      "앞뒤로 2분씩, 노릇해질 때까지 굽는다.",
    ],
    tips: "우유가 없으면 물 반 컵에 설탕을 조금 더 넣어도 됩니다.",
  },
  {
    name: "김치볶음밥",
    time: "15분",
    difficulty: "쉬움",
    tags: ["밥", "김치", "달걀", "대파"],
    meals: ["점심", "저녁"],
    servings: "1인분",
    ingredients: [
      { name: "밥", amount: "1공기" },
      { name: "김치", amount: "1컵" },
      { name: "달걀", amount: "1개" },
      { name: "설탕", amount: "1작은술" },
    ],
    steps: [
      "김치를 잘게 썰고, 김치국물도 2큰술 정도 준비한다.",
      "팬에 기름을 두르고 김치를 3분간 볶는다.",
      "설탕을 넣어 신맛을 잡고 김치국물을 부어 조린다.",
      "밥을 넣고 눌러가며 볶은 뒤, 달걀프라이를 올린다.",
    ],
    tips: "김치를 충분히 볶아야 군내가 사라집니다.",
  },
  {
    name: "된장찌개",
    time: "25분",
    difficulty: "보통",
    tags: ["된장", "두부", "애호박", "양파", "감자", "대파"],
    meals: ["점심", "저녁"],
    servings: "2인분",
    ingredients: [
      { name: "된장", amount: "2큰술" },
      { name: "두부", amount: "1/2모" },
      { name: "애호박", amount: "1/3개" },
      { name: "양파", amount: "1/2개" },
      { name: "다진 마늘", amount: "1작은술" },
    ],
    steps: [
      "냄비에 물 500ml를 붓고 된장을 풀어 끓인다.",
      "끓어오르면 감자, 양파를 넣고 5분간 끓인다.",
      "애호박과 다진 마늘을 넣고 3분 더 끓인다.",
      "두부를 넣고 2분, 마지막에 대파를 올려 불을 끈다.",
    ],
    tips: "쌀뜨물로 끓이면 국물이 훨씬 구수해집니다.",
  },
  {
    name: "김치찌개",
    time: "30분",
    difficulty: "보통",
    tags: ["김치", "돼지고기", "두부", "양파", "대파"],
    meals: ["점심", "저녁"],
    servings: "2인분",
    ingredients: [
      { name: "김치", amount: "2컵" },
      { name: "돼지고기", amount: "150g" },
      { name: "두부", amount: "1/2모" },
      { name: "고춧가루", amount: "1큰술" },
    ],
    steps: [
      "냄비에 기름을 두르고 돼지고기를 볶는다.",
      "고기 겉면이 익으면 김치를 넣고 5분간 함께 볶는다.",
      "물 500ml와 김치국물을 붓고 15분간 끓인다.",
      "고춧가루로 색을 내고 두부와 대파를 넣어 5분 더 끓인다.",
    ],
    tips: "묵은지일수록 맛이 깊어집니다. 신맛이 강하면 설탕 한 꼬집.",
  },
  {
    name: "양파달걀덮밥",
    time: "20분",
    difficulty: "쉬움",
    tags: ["밥", "달걀", "양파", "대파"],
    meals: ["점심"],
    servings: "1인분",
    ingredients: [
      { name: "밥", amount: "1공기" },
      { name: "달걀", amount: "2개" },
      { name: "양파", amount: "1/2개" },
      { name: "간장", amount: "2큰술" },
      { name: "설탕", amount: "1작은술" },
    ],
    steps: [
      "양파를 얇게 채 썬다.",
      "팬에 물 100ml, 간장, 설탕을 넣고 끓인다.",
      "양파를 넣고 숨이 죽을 때까지 3분간 조린다.",
      "달걀을 풀어 원을 그리며 붓고, 뚜껑을 덮어 1분간 반숙으로 익힌다.",
      "밥 위에 국물째 얹는다.",
    ],
    tips: "달걀은 젓지 말고 그대로 굳혀야 예쁘게 올라갑니다.",
  },
  {
    name: "콩나물국",
    time: "20분",
    difficulty: "쉬움",
    tags: ["콩나물", "대파", "다진 마늘"],
    meals: ["아침"],
    servings: "2인분",
    ingredients: [
      { name: "콩나물", amount: "200g" },
      { name: "대파", amount: "1/2대" },
      { name: "다진 마늘", amount: "1작은술" },
      { name: "소금", amount: "적당량" },
    ],
    steps: [
      "콩나물을 흐르는 물에 씻어 건진다.",
      "냄비에 물 700ml와 콩나물을 넣고 뚜껑을 덮어 끓인다.",
      "끓기 시작하면 뚜껑을 연 채 5분간 더 끓인다.",
      "다진 마늘과 소금으로 간하고 대파를 넣어 마무리한다.",
    ],
    tips: "끓는 도중에 뚜껑을 여닫으면 비린내가 납니다. 처음부터 열거나 계속 덮거나 하나만.",
  },
  {
    name: "어묵볶음",
    time: "15분",
    difficulty: "쉬움",
    tags: ["어묵", "양파", "당근", "대파"],
    meals: ["점심", "저녁"],
    servings: "2인분",
    ingredients: [
      { name: "어묵", amount: "3장" },
      { name: "양파", amount: "1/2개" },
      { name: "간장", amount: "1.5큰술" },
      { name: "설탕", amount: "1작은술" },
    ],
    steps: [
      "어묵을 먹기 좋은 크기로, 양파와 당근은 채 썬다.",
      "끓는 물에 어묵을 30초 데쳐 기름기를 뺀다.",
      "팬에 기름을 두르고 양파, 당근을 볶는다.",
      "어묵과 간장, 설탕을 넣고 물기가 날아갈 때까지 볶는다.",
      "불을 끄고 참기름을 한 바퀴 두른다.",
    ],
    tips: "마지막에 참기름은 불을 끄고 넣어야 향이 삽니다.",
  },
  {
    name: "감자채볶음",
    time: "15분",
    difficulty: "쉬움",
    tags: ["감자", "양파", "당근", "피망"],
    meals: ["아침", "점심"],
    servings: "2인분",
    ingredients: [
      { name: "감자", amount: "2개" },
      { name: "양파", amount: "1/2개" },
      { name: "소금", amount: "적당량" },
    ],
    steps: [
      "감자를 얇게 채 썰어 찬물에 5분간 담가 전분기를 뺀다.",
      "물기를 완전히 털어낸다.",
      "팬에 기름을 두르고 양파를 먼저 볶는다.",
      "감자를 넣고 소금 간을 한 뒤 투명해질 때까지 5분간 볶는다.",
    ],
    tips: "전분기를 빼야 서로 들러붙지 않고 아삭합니다.",
  },
  {
    name: "두부김치",
    time: "20분",
    difficulty: "보통",
    tags: ["두부", "김치", "돼지고기", "양파"],
    meals: ["저녁"],
    servings: "2인분",
    ingredients: [
      { name: "두부", amount: "1모" },
      { name: "김치", amount: "1.5컵" },
      { name: "돼지고기", amount: "100g" },
      { name: "설탕", amount: "1작은술" },
    ],
    steps: [
      "두부를 1cm 두께로 썰어 끓는 소금물에 3분간 데친다.",
      "팬에 돼지고기를 볶다가 김치를 넣는다.",
      "설탕과 참기름을 넣고 5분간 볶는다.",
      "접시에 두부를 두르고 가운데에 볶은 김치를 담는다.",
    ],
    tips: "두부는 데치면 부치는 것보다 담백하고 빨라요.",
  },
  {
    name: "상추겉절이",
    time: "10분",
    difficulty: "쉬움",
    tags: ["상추", "양파", "고춧가루", "대파"],
    meals: ["점심", "저녁"],
    servings: "2인분",
    ingredients: [
      { name: "상추", amount: "20장" },
      { name: "고춧가루", amount: "1큰술" },
      { name: "간장", amount: "1큰술" },
      { name: "식초", amount: "1작은술" },
    ],
    steps: [
      "상추를 씻어 물기를 털고 손으로 큼직하게 뜯는다.",
      "고춧가루, 간장, 식초, 설탕, 참기름을 섞어 양념장을 만든다.",
      "먹기 직전에 상추와 양념장을 살살 버무린다.",
    ],
    tips: "미리 버무리면 숨이 죽어요. 상에 내기 직전에 무치세요.",
  },
  {
    name: "미역국",
    time: "30분",
    difficulty: "보통",
    tags: ["미역", "소고기", "다진 마늘"],
    meals: ["아침", "점심"],
    servings: "2인분",
    ingredients: [
      { name: "건미역", amount: "한 줌" },
      { name: "소고기", amount: "100g" },
      { name: "국간장", amount: "1큰술" },
      { name: "참기름", amount: "1큰술" },
    ],
    steps: [
      "건미역을 찬물에 15분간 불린 뒤 물기를 짠다.",
      "냄비에 참기름을 두르고 소고기와 미역을 5분간 볶는다.",
      "물 800ml를 붓고 센 불에서 끓인다.",
      "끓어오르면 중불로 줄여 15분간 더 끓이고 국간장으로 간한다.",
    ],
    tips: "미역을 충분히 볶아야 국물이 뽀얗게 우러납니다.",
  },
  {
    name: "우유크림파스타",
    time: "25분",
    difficulty: "보통",
    tags: ["파스타", "우유", "양파", "베이컨", "버섯"],
    meals: ["저녁"],
    servings: "1인분",
    ingredients: [
      { name: "스파게티면", amount: "100g" },
      { name: "우유", amount: "200ml" },
      { name: "양파", amount: "1/2개" },
      { name: "베이컨", amount: "2줄" },
    ],
    steps: [
      "끓는 소금물에 면을 8분간 삶고, 면수 반 컵을 남겨둔다.",
      "팬에 베이컨을 볶아 기름을 내고 양파를 넣어 볶는다.",
      "우유를 붓고 약불에서 저어가며 3분간 졸인다.",
      "삶은 면과 면수를 넣고 소스가 걸쭉해질 때까지 섞는다.",
      "소금, 후추로 간한다.",
    ],
    tips: "면수가 소스를 걸쭉하게 만들어 줍니다. 버리지 마세요.",
  },
];

// AI가 자리를 비웠을 때 사용자에게 보여줄 능청스러운 안내 문구.
const NOTES = [
  "AI 셰프가 잠깐 자리를 비워서, 대신 냉장고를 직접 뒤져 왔어요 🧑‍🍳",
  "AI가 국 끓이다 넘쳐서 잠시 자리 비움. 손맛으로 골라 봤습니다 🍲",
  "오늘은 AI 대신 손맛이 출동했습니다. 실패 없는 것들로만 골랐어요 🥄",
  "AI가 장 보러 나간 사이, 있는 재료로 먼저 차려 봤어요 🛒",
  "레시피 담당 AI가 앞치마를 못 찾는 중… 일단 기본기부터 꺼내 왔습니다 👩‍🍳",
];

export function fallbackNote() {
  return NOTES[Math.floor(Math.random() * NOTES.length)];
}

function score(recipe: FallbackRecipe, ingredients: string[]) {
  return recipe.tags.filter((tag) =>
    ingredients.some((ing) => ing.includes(tag) || tag.includes(ing)),
  ).length;
}

function pick<T>(items: T[], count: number) {
  return [...items].sort(() => Math.random() - 0.5).slice(0, count);
}

function toSummary(recipe: FallbackRecipe): RecipeSummary {
  return {
    name: recipe.name,
    time: recipe.time,
    difficulty: recipe.difficulty,
    ingredients: recipe.tags.slice(0, 4).join(", "),
  };
}

export function fallbackRecipes(ingredients: string[]): RecipeSummary[] {
  const scored = RECIPES.map((recipe) => ({ recipe, hit: score(recipe, ingredients) }));
  const matched = scored.filter((s) => s.hit > 0).sort((a, b) => b.hit - a.hit);
  const rest = pick(scored.filter((s) => s.hit === 0), 4);
  return [...matched, ...rest].slice(0, 4).map((s) => toSummary(s.recipe));
}

export function fallbackMeals(ingredients: string[] = []): MealSuggestion[] {
  const meals: Meal[] = ["아침", "점심", "저녁"];
  return meals.map((meal) => {
    const pool = RECIPES.filter((r) => r.meals.includes(meal));
    const sorted = ingredients.length
      ? [...pool].sort((a, b) => score(b, ingredients) - score(a, ingredients)).slice(0, 3)
      : pool;
    return {
      meal,
      recipes: pick(sorted, 2).map((r) => ({ name: r.name, time: r.time, difficulty: r.difficulty })),
    };
  });
}

export function fallbackSuggestions(): SuggestedRecipe[] {
  return pick(RECIPES, 4).map((r) => ({
    name: r.name,
    time: r.time,
    difficulty: r.difficulty,
    shopping: r.ingredients.filter((i) => !PANTRY.includes(i.name)).slice(0, 4).map((i) => i.name),
  }));
}

export function fallbackDetail(name: string, ingredients: string[] = []): RecipeDetail {
  const known = RECIPES.find((r) => r.name === name);
  if (known) {
    return {
      name: known.name,
      time: known.time,
      difficulty: known.difficulty,
      servings: known.servings,
      ingredients: known.ingredients,
      steps: known.steps,
      tips: known.tips,
    };
  }

  // AI가 지어낸 이름이라 상세를 모를 때: 있는 재료로 즉흥 조리법을 안내한다.
  const base = ingredients.length ? ingredients.slice(0, 5) : ["있는 재료"];
  return {
    name,
    time: "20분",
    difficulty: "쉬움",
    servings: "1~2인분",
    ingredients: [
      ...base.map((ing) => ({ name: ing, amount: "적당량" })),
      { name: "소금 · 간장 · 참기름", amount: "입맛대로" },
    ],
    steps: [
      "재료를 먹기 좋은 크기로 썬다.",
      "단단한 재료(양파, 당근, 감자)부터 기름에 볶는다.",
      "익기 쉬운 재료를 넣고 2~3분 더 볶거나 끓인다.",
      "간장과 소금으로 간을 맞춘다.",
      "불을 끄고 참기름을 한 바퀴 둘러 마무리한다.",
    ],
    tips: `AI가 자리를 비운 사이라 ${name}의 정식 레시피 대신 기본 조리 순서를 적어 뒀어요. 잠시 후 다시 눌러 보면 AI가 돌아와 있을지도 몰라요.`,
  };
}
