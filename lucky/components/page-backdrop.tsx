type Props = {
  /** public/ 아래 배경 사진 경로. 출처는 assets/attribution.md */
  src: string;
};

/** 기능 페이지 오른쪽 위에 사진을 희미하게 깔고 아래·왼쪽으로 사라지게 한다. 표·카드를 가리지 않도록 위쪽에만. */
export function PageBackdrop({ src }: Props) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 right-0 hidden h-[520px] w-[70%] bg-cover bg-center opacity-[0.10] [mask-image:radial-gradient(ellipse_at_top_right,black_25%,transparent_72%)] md:block dark:opacity-[0.06]"
      // 사진 경로가 페이지마다 달라 Tailwind 정적 클래스로 못 쓴다.
      style={{ backgroundImage: `url(${src})` }}
    />
  );
}
