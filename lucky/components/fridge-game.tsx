"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface FridgeGameProps {
  onClose: () => void;
  origin?: { x: number; y: number };
}

const GW = 480;
const GH = 190;
const GROUND = GH - 32;
const GRAVITY = 1.2;
const JUMP_V = -15;
const GROUND_OBS = ["🥕", "🧅", "🥦", "🍳", "🧄", "🌽", "🍎", "🥚"];
const AIR_OBS    = ["🐟", "🍕", "🧇", "🥐", "🍗"];
const AIR_Y = GROUND - 52;

type Phase = "opening" | "playing";
type Obstacle = { x: number; emoji: string; air: boolean };

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeInitState() {
  return {
    y: GROUND, vy: 0, onGround: true,
    obstacles: [] as Obstacle[],
    nextObstacleIn: randInt(350, 500),
    score: 0, speed: 3, frame: 0,
    dead: false, started: false,
  };
}

export function FridgeGame({ onClose, origin }: FridgeGameProps) {
  const [phase, setPhase] = useState<Phase>("opening");
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gs = useRef(makeInitState());

  useEffect(() => {
    gs.current = makeInitState();
    setMounted(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPhase("playing"), 900);
    return () => clearTimeout(t);
  }, []);

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

      // 게임 배경 — 연한 흰색
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(0, 0, GW, GH);

      // 연한 선반 라인
      ctx.strokeStyle = "#ececec";
      ctx.lineWidth = 1;
      for (let yy = 55; yy < GH - 40; yy += 50) {
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(GW, yy); ctx.stroke();
      }

      // 바닥선
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, GROUND + 22); ctx.lineTo(GW, GROUND + 22); ctx.stroke();

      if (!s.started) {
        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#6b7280";
        ctx.textAlign = "center";
        ctx.fillText("클릭 또는 스페이스바로 시작!", GW / 2, GH / 2 - 8);
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#9ca3af";
        ctx.fillText("공중 장애물(🐟 등)은 점프하지 말고 바닥에서 피해!", GW / 2, GH / 2 + 12);
        ctx.font = "28px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("🧊", 50, s.y);
        rafId = requestAnimationFrame(loop);
        return;
      }

      if (!s.dead) {
        s.vy += GRAVITY;
        s.y += s.vy;
        if (s.y >= GROUND) { s.y = GROUND; s.vy = 0; s.onGround = true; }

        s.frame++;
        // cap 없이 계속 증가 (로그 스케일)
        s.speed = 3 + Math.log(s.frame + 1) * 1.6;
        s.score = Math.floor(s.frame * 0.15);

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
          s.nextObstacleIn = randInt(250, 420);
        }

        for (const o of s.obstacles) {
          if (o.x < 84 && o.x > 42) {
            if (o.air) {
              if (s.y > GROUND - 78 && s.y < GROUND - 26) s.dead = true;
            } else {
              if (s.y > GROUND - 4) s.dead = true;
            }
          }
        }
      }

      ctx.font = "28px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("🧊", 50, s.y);

      s.obstacles.forEach(o => {
        ctx.font = "24px sans-serif";
        ctx.fillText(o.emoji, o.x, o.air ? AIR_Y : GROUND + 2);
      });

      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = "#374151";
      ctx.textAlign = "right";
      ctx.fillText(`${s.score}점`, GW - 10, 18);

      if (s.dead) {
        ctx.fillStyle = "rgba(250,250,250,0.92)";
        ctx.fillRect(0, 0, GW, GH);
        ctx.font = "bold 20px sans-serif";
        ctx.fillStyle = "#dc2626";
        ctx.textAlign = "center";
        ctx.fillText("게임 오버!", GW / 2, GH / 2 - 12);
        ctx.font = "13px sans-serif";
        ctx.fillStyle = "#4b5563";
        ctx.fillText(`점수: ${s.score}점 · 클릭하여 재시작`, GW / 2, GH / 2 + 12);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        const s = gs.current;
        if (s.started && !s.dead && !s.onGround) s.vy = Math.max(s.vy, 10);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

  if (!mounted) return null;

  // 클릭된 아이콘 위치에서 모달이 커지는 효과
  const tx = origin ? `${Math.round(origin.x - window.innerWidth / 2)}px` : "0px";
  const ty = origin ? `${Math.round(origin.y - window.innerHeight / 2)}px` : "0px";

  return createPortal(
    <>
      <style>{`
        @keyframes fridgePopIn {
          from { transform: translate(var(--ftx,0), var(--fty,0)) scale(0.08); opacity: 0; }
          to   { transform: translate(0,0) scale(1); opacity: 1; }
        }
        @keyframes freezerDoorOpen {
          from { transform: perspective(900px) rotateY(0deg); }
          to   { transform: perspective(900px) rotateY(-110deg); }
        }
      `}</style>

      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
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
          {/* 냉장고 외관 */}
          <div style={{
            background: "#f1f5f9",
            borderRadius: 14,
            border: "2px solid #94a3b8",
            boxShadow: "0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.7)",
            padding: "8px 10px 4px",
            position: "relative",
          }}>
            {/* 냉동실 칸 (타이틀) */}
            <div style={{
              background: "#e2e8f0",
              border: "1.5px solid #cbd5e1",
              borderRadius: 8,
              padding: "8px 36px 8px 12px",
              marginBottom: 6,
              position: "relative",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.08)",
            }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#334155" }}>
                ❄️ 냉장고 달리기
              </p>
              {/* 냉동실 손잡이 */}
              <div style={{
                position: "absolute", right: 10, top: "50%",
                transform: "translateY(-50%)",
                width: 5, height: 28,
                background: "linear-gradient(180deg,#94a3b8,#64748b,#94a3b8)",
                borderRadius: 3,
              }} />
              {/* X */}
              <button
                onClick={onClose}
                style={{
                  position: "absolute", top: -10, right: -10, zIndex: 10,
                  width: 24, height: 24, borderRadius: "50%",
                  background: "#fff", border: "1.5px solid #cbd5e1",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#64748b",
                }}
              >
                <X size={11} />
              </button>
            </div>

            {/* 냉장실 칸 (게임) */}
            <div style={{
              border: "1.5px solid #cbd5e1",
              borderRadius: 8,
              overflow: "hidden",
              position: "relative",
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.08)",
            }}>
              {phase === "playing" ? (
                <canvas
                  ref={canvasRef}
                  width={GW}
                  height={GH}
                  onClick={jump}
                  style={{ display: "block", cursor: "pointer" }}
                />
              ) : (
                <div style={{ width: GW, height: GH, background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 44 }}>🧊</span>
                </div>
              )}

              {/* 냉장실 문 — 열림 */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(160deg,#f8fafc,#e2e8f0)",
                transformOrigin: "left center",
                animation: "freezerDoorOpen 0.55s 0.3s cubic-bezier(0.4,0,0.2,1) forwards",
                display: "flex", alignItems: "center", justifyContent: "flex-end",
                paddingRight: 14,
              }}>
                <div style={{
                  width: 6, height: 64,
                  background: "linear-gradient(180deg,#cbd5e1,#94a3b8,#cbd5e1)",
                  borderRadius: 3, boxShadow: "2px 0 6px rgba(0,0,0,0.15)",
                }} />
              </div>
            </div>

            {/* 냉장고 발받침 */}
            <div style={{
              margin: "4px -2px -2px",
              height: 10,
              background: "#cbd5e1",
              borderRadius: "0 0 10px 10px",
              border: "2px solid #94a3b8",
              borderTop: "none",
            }} />
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
