"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface FridgeGameProps {
  onClose: () => void;
  origin?: { x: number; y: number };
}

// 냉장고 치수
const PAD = 16;
const GW = 460;
const GH = 210;
const FREEZE_H = 56; // 냉동실

const GROUND = GH - 30;
const GRAVITY = 1.2;
const JUMP_V = -20;
const GROUND_OBS = ["🥕", "🧅", "🥦", "🍳", "🧄", "🌽", "🍎", "🥚"];
const AIR_OBS    = ["🐟", "🍕", "🧇", "🥐", "🍗"];
const AIR_Y = GROUND - 52;

type Phase = "closed" | "opening" | "playing";
type Obstacle = { x: number; emoji: string; air: boolean };

// 냉장고 안 반찬통 (블러 배경용)
const SHELF_BLOCKS = [
  { x: 18,  y: 16, w: 54, h: 38, c: "rgba(147,197,253,0.5)" },
  { x: 82,  y: 24, w: 40, h: 30, c: "rgba(196,181,253,0.45)" },
  { x: 132, y: 12, w: 62, h: 42, c: "rgba(134,239,172,0.4)" },
  { x: 206, y: 22, w: 46, h: 32, c: "rgba(253,224,171,0.45)" },
  { x: 264, y: 14, w: 58, h: 40, c: "rgba(165,243,252,0.45)" },
  { x: 334, y: 20, w: 48, h: 34, c: "rgba(216,180,254,0.4)" },
  { x: 392, y: 16, w: 52, h: 38, c: "rgba(147,197,253,0.42)" },
  { x: 26,  y: 76, w: 46, h: 36, c: "rgba(254,202,202,0.42)" },
  { x: 84,  y: 82, w: 58, h: 30, c: "rgba(191,219,254,0.45)" },
  { x: 154, y: 72, w: 44, h: 40, c: "rgba(187,247,208,0.4)" },
  { x: 210, y: 80, w: 60, h: 32, c: "rgba(253,230,138,0.4)" },
  { x: 282, y: 74, w: 50, h: 38, c: "rgba(199,210,254,0.45)" },
  { x: 344, y: 84, w: 42, h: 28, c: "rgba(165,243,252,0.4)" },
  { x: 398, y: 78, w: 48, h: 34, c: "rgba(221,214,254,0.42)" },
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function makeInitState() {
  return {
    y: GROUND, vy: 0, onGround: true,
    obstacles: [] as Obstacle[],
    nextObstacleIn: randInt(300, 460),
    score: 0, speed: 4, frame: 0,
    dead: false, started: false,
  };
}

export function FridgeGame({ onClose, origin }: FridgeGameProps) {
  const [phase, setPhase] = useState<Phase>("closed");
  const [mounted, setMounted] = useState(false);
  const [vw, setVw] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gs = useRef(makeInitState());

  useEffect(() => {
    gs.current = makeInitState();
    setMounted(true);
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const openDoor = useCallback(() => {
    if (phase !== "closed") return;
    setPhase("opening");
    setTimeout(() => setPhase("playing"), 950);
  }, [phase]);

  const jump = useCallback(() => {
    const s = gs.current;
    if (s.dead) { gs.current = { ...makeInitState(), started: true }; return; }
    if (!s.started) s.started = true;
    if (s.onGround) { s.vy = JUMP_V; s.onGround = false; }
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let rafId = 0;

    const loop = () => {
      const s = gs.current;
      ctx.clearRect(0, 0, GW, GH);

      // 냉장고 내부 배경
      ctx.fillStyle = "#eef6ff";
      ctx.fillRect(0, 0, GW, GH);

      // 냉장고 안 반찬통 — 네모 블럭들, 블러로 흐릿하게
      ctx.save();
      ctx.filter = "blur(6px)";
      SHELF_BLOCKS.forEach(b => {
        ctx.fillStyle = b.c;
        ctx.fillRect(b.x, b.y, b.w, b.h);
      });
      // 선반 판
      ctx.fillStyle = "rgba(160,195,228,0.5)";
      [56, 116].forEach(yy => ctx.fillRect(-10, yy, GW + 20, 7));
      ctx.restore();

      // 바닥선
      ctx.strokeStyle = "#c7d8e8";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, GROUND + 20); ctx.lineTo(GW, GROUND + 20); ctx.stroke();

      if (!s.started) {
        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#6b7280";
        ctx.textAlign = "center";
        ctx.fillText("클릭 또는 ↑ / 스페이스로 시작!", GW / 2, GH / 2 - 8);
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#9ca3af";
        ctx.fillText("공중 장애물(🐟 등)은 점프 말고 바닥에서 피해!", GW / 2, GH / 2 + 10);
        ctx.font = "28px sans-serif"; ctx.textAlign = "left";
        ctx.fillText("🍀", 50, s.y);
        rafId = requestAnimationFrame(loop); return;
      }

      if (!s.dead) {
        s.vy += GRAVITY;
        s.y += s.vy;
        if (s.y >= GROUND) { s.y = GROUND; s.vy = 0; s.onGround = true; }

        s.frame++;
        s.score = Math.floor(s.frame * 0.12);
        // 50점마다 0.6씩 딱딱 올라감
        s.speed = 4.5 + Math.floor(s.score / 50) * 0.5;

        s.obstacles.forEach(o => o.x -= s.speed);
        s.obstacles = s.obstacles.filter(o => o.x > -40);
        s.nextObstacleIn -= s.speed;
        if (s.nextObstacleIn <= 0) {
          const canAir = s.score > 25 && Math.random() < 0.22;
          s.obstacles.push({
            x: GW + 10,
            emoji: canAir ? AIR_OBS[randInt(0, AIR_OBS.length - 1)] : GROUND_OBS[randInt(0, GROUND_OBS.length - 1)],
            air: canAir,
          });
          s.nextObstacleIn = randInt(240, 400);
        }

        for (const o of s.obstacles) {
          if (o.x < 84 && o.x > 42) {
            if (o.air) { if (s.y > GROUND - 78 && s.y < GROUND - 26) s.dead = true; }
            else { if (s.y > GROUND - 4) s.dead = true; }
          }
        }
      }

      ctx.font = "28px sans-serif"; ctx.textAlign = "left";
      ctx.fillText("🍀", 50, s.y);

      s.obstacles.forEach(o => {
        ctx.font = "24px sans-serif";
        ctx.fillText(o.emoji, o.x, o.air ? AIR_Y : GROUND + 2);
      });

      // 점수는 왼쪽 상단
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = "#374151";
      ctx.textAlign = "left";
      ctx.fillText(`${s.score}점`, 10, 18);

      if (s.dead) {
        ctx.fillStyle = "rgba(250,250,250,0.92)";
        ctx.fillRect(0, 0, GW, GH);
        ctx.font = "bold 20px sans-serif"; ctx.fillStyle = "#dc2626"; ctx.textAlign = "center";
        ctx.fillText("게임 오버!", GW / 2, GH / 2 - 12);
        ctx.font = "13px sans-serif"; ctx.fillStyle = "#4b5563";
        ctx.fillText(`점수: ${s.score}점 · 클릭하여 재시작`, GW / 2, GH / 2 + 12);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") { onClose(); return; }
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
      else if (e.code === "ArrowDown") {
        e.preventDefault();
        const s = gs.current;
        if (s.started && !s.dead && !s.onGround) s.vy = Math.max(s.vy, 12);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump, onClose]);

  if (!mounted) return null;

  const tx = origin ? `${Math.round(origin.x - window.innerWidth / 2)}px` : "0px";
  const ty = origin ? `${Math.round(origin.y - window.innerHeight / 2)}px` : "0px";
  const FW = GW + PAD * 2; // 냉장고 전체 너비
  // 모바일에서 뷰포트보다 큰 경우 축소. transform 이 아니라 zoom 을 쓴다 —
  // transform 은 레이아웃 박스를 그대로 두어 스크롤바가 생긴다.
  const zoom = vw ? Math.min(1, (vw - 24) / FW) : 1;

  return createPortal(
    <>
      <style>{`
        @keyframes fridgePopIn {
          from { transform: translate(var(--ftx,0), var(--fty,0)) scale(0.04); opacity: 0; }
          to   { transform: translate(0,0) scale(1); opacity: 1; }
        }
        @keyframes fridgeDoorSwing {
          0%   { transform: perspective(900px) rotateY(0deg);    opacity: 1; }
          75%  { transform: perspective(900px) rotateY(-116deg); opacity: 1; }
          100% { transform: perspective(900px) rotateY(-116deg); opacity: 0; pointer-events: none; }
        }
      `}</style>

      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
          overflow: "hidden",
        }}
        onClick={onClose}
      >
        <div
          style={{
            "--ftx": tx, "--fty": ty,
            animation: "fridgePopIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards",
          } as React.CSSProperties}
          onClick={e => e.stopPropagation()}
        >
          {/* ─── 냉장고 몸통 ─── */}
          <div style={{
            width: FW,
            zoom,
            background: "#f1f5f9",
            borderRadius: 20,
            border: "3px solid #94a3b8",
            boxShadow: "0 28px 70px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.7)",
            position: "relative",
          }}>

            {/* 냉동실 손잡이 */}
            <div style={{
              position: "absolute", right: 10,
              top: FREEZE_H / 2 - 14,
              width: 7, height: 28, borderRadius: 4,
              background: "linear-gradient(180deg,#94a3b8,#64748b,#94a3b8)",
              boxShadow: "inset 1px 0 2px rgba(255,255,255,0.4), 0 1px 4px rgba(0,0,0,0.2)",
            }} />
            {/* 냉장실 손잡이 */}
            <div style={{
              position: "absolute", right: 10,
              top: FREEZE_H + 36,
              width: 7, height: 62, borderRadius: 4,
              background: "linear-gradient(180deg,#94a3b8,#64748b,#94a3b8)",
              boxShadow: "inset 1px 0 2px rgba(255,255,255,0.4), 0 1px 4px rgba(0,0,0,0.2)",
            }} />

            {/* ── 냉동실 ── */}
            <div style={{
              height: FREEZE_H,
              background: "linear-gradient(180deg,#e2e8f0,#f1f5f9)",
              borderRadius: "17px 17px 0 0",
              borderBottom: "3px solid #94a3b8",
              display: "flex", alignItems: "center",
              padding: "0 14px",
              position: "relative",
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>
                ❄️ 냉장고 달리기
              </span>
              {/* X 버튼 */}
              <button
                onClick={onClose}
                style={{
                  marginLeft: "auto",
                  width: 26, height: 26, borderRadius: "50%",
                  background: "#dde3eb", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#64748b",
                }}
              >
                <X size={12} />
              </button>
            </div>

            {/* ── 냉장실 ── */}
            <div style={{ position: "relative", padding: PAD }}>
              {/* 게임 캔버스 */}
              {phase === "playing" ? (
                <canvas
                  ref={canvasRef}
                  width={GW}
                  height={GH}
                  onClick={jump}
                  style={{ display: "block", cursor: "pointer", borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
              ) : (
                <div style={{
                  width: GW, height: GH,
                  background: "#eef6ff",
                  borderRadius: 8, border: "1px solid #e2e8f0",
                }} />
              )}

              {/* 냉장실 문 — closed: 닫힘, opening: 열리는 중 */}
              {phase !== "playing" && (
                <div
                  onClick={openDoor}
                  style={{
                    position: "absolute",
                    top: PAD, left: PAD, right: PAD, bottom: PAD,
                    background: "linear-gradient(155deg, #f8fafc 0%, #e2e8f0 100%)",
                    borderRadius: 8,
                    transformOrigin: "left center",
                    cursor: phase === "closed" ? "pointer" : "default",
                    animation: phase === "opening"
                      ? "fridgeDoorSwing 0.65s cubic-bezier(0.4,0,0.2,1) forwards"
                      : undefined,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: phase === "closed" ? "inset -3px 0 8px rgba(0,0,0,0.06)" : undefined,
                  }}
                >
                  {/* 문 손잡이 */}
                  <div style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    width: 5, height: 56, borderRadius: 3,
                    background: "linear-gradient(180deg,#94a3b8,#64748b,#94a3b8)",
                    boxShadow: "1px 0 4px rgba(0,0,0,0.15)",
                  }} />
                </div>
              )}

              {/* 말풍선 — closed일 때만 */}
              {phase === "closed" && (
                <div style={{
                  position: "absolute",
                  left: "50%", top: "38%",
                  transform: "translate(-50%, -50%)",
                  background: "#fff",
                  border: "2px solid #e2e8f0",
                  borderRadius: 14,
                  padding: "10px 18px",
                  fontSize: 13, fontWeight: 700, color: "#374151",
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  pointerEvents: "none",
                  zIndex: 5,
                }}>
                  🍀 냉장고를 열어봐!
                  {/* 말풍선 꼬리 (아래) */}
                  <div style={{
                    position: "absolute", bottom: -9, left: "50%",
                    transform: "translateX(-50%)",
                    width: 0, height: 0,
                    borderLeft: "8px solid transparent",
                    borderRight: "8px solid transparent",
                    borderTop: "9px solid #fff",
                  }} />
                  <div style={{
                    position: "absolute", bottom: -12, left: "50%",
                    transform: "translateX(-50%)",
                    width: 0, height: 0,
                    borderLeft: "9px solid transparent",
                    borderRight: "9px solid transparent",
                    borderTop: "10px solid #e2e8f0",
                    zIndex: -1,
                  }} />
                </div>
              )}
            </div>

            {/* 냉장고 발받침 */}
            <div style={{
              height: 10, marginTop: -3,
              background: "#94a3b8",
              borderRadius: "0 0 12px 12px",
            }} />
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
