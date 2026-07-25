"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Refrigerator, X } from "lucide-react";

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
    nextObstacleIn: randInt(320, 480),
    score: 0, speed: 4, frame: 0,
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
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(0, 0, GW, GH);

      ctx.strokeStyle = "#efefef";
      ctx.lineWidth = 1;
      for (let yy = 52; yy < GH - 40; yy += 50) {
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(GW, yy); ctx.stroke();
      }

      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, GROUND + 22); ctx.lineTo(GW, GROUND + 22); ctx.stroke();

      if (!s.started) {
        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#6b7280";
        ctx.textAlign = "center";
        ctx.fillText("클릭 또는 ↑ / 스페이스로 시작!", GW / 2, GH / 2 - 8);
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#9ca3af";
        ctx.fillText("공중 장애물(🐟 등)은 점프하지 말고 바닥에서 피해!", GW / 2, GH / 2 + 10);
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
        // score 기반 속도 증가 — 처음 느리고 계속 빨라짐
        s.score = Math.floor(s.frame * 0.15);
        s.speed = 4 + s.score * 0.012;

        s.obstacles.forEach(o => o.x -= s.speed);
        s.obstacles = s.obstacles.filter(o => o.x > -40);

        s.nextObstacleIn -= s.speed;
        if (s.nextObstacleIn <= 0) {
          const canAir = s.score > 25 && Math.random() < 0.22;
          s.obstacles.push({
            x: GW + 10,
            emoji: canAir
              ? AIR_OBS[randInt(0, AIR_OBS.length - 1)]
              : GROUND_OBS[randInt(0, GROUND_OBS.length - 1)],
            air: canAir,
          });
          s.nextObstacleIn = randInt(240, 400);
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
        e.preventDefault(); jump();
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

  const tx = origin ? `${Math.round(origin.x - window.innerWidth / 2)}px` : "0px";
  const ty = origin ? `${Math.round(origin.y - window.innerHeight / 2)}px` : "0px";

  return createPortal(
    <>
      <style>{`
        @keyframes fridgePopIn {
          from { transform: translate(var(--ftx,0), var(--fty,0)) scale(0.05); opacity: 0; }
          to   { transform: translate(0,0) scale(1); opacity: 1; }
        }
        @keyframes fridgeDoorOpen {
          from { transform: perspective(900px) rotateY(0deg); }
          to   { transform: perspective(900px) rotateY(-112deg); }
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
          {/* 모달 카드 */}
          <div style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
            overflow: "hidden",
          }}>
            {/* 헤더: 냉장고 아이콘이 커진 느낌 */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px",
              background: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
            }}>
              <Refrigerator size={32} strokeWidth={1.5} style={{ color: "#6366f1", flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>냉장고 달리기</span>
              <button
                onClick={onClose}
                style={{
                  marginLeft: "auto",
                  width: 26, height: 26, borderRadius: "50%",
                  background: "#f3f4f6", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#6b7280",
                }}
              >
                <X size={13} />
              </button>
            </div>

            {/* 게임 영역 + 냉장고 문 애니메이션 */}
            <div style={{ position: "relative" }}>
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
                  <Refrigerator size={64} strokeWidth={1} style={{ color: "#d1d5db" }} />
                </div>
              )}

              {/* 냉장고 문 열림 */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(160deg, #f3f4f6, #e5e7eb)",
                transformOrigin: "left center",
                animation: "fridgeDoorOpen 0.55s 0.3s cubic-bezier(0.4,0,0.2,1) forwards",
                display: "flex", alignItems: "center", justifyContent: "flex-end",
                paddingRight: 16,
              }}>
                <Refrigerator size={80} strokeWidth={1} style={{ color: "#d1d5db", position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} />
                {/* 손잡이 */}
                <div style={{
                  width: 5, height: 56, borderRadius: 3,
                  background: "linear-gradient(180deg,#9ca3af,#6b7280,#9ca3af)",
                  boxShadow: "1px 0 4px rgba(0,0,0,0.15)",
                  zIndex: 1,
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
