"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";

interface FridgeGameProps {
  onClose: () => void;
}

const GW = 520;
const GH = 200;
const GROUND = GH - 36;
const GRAVITY = 0.6;
const JUMP_V = -13;
const SPEED_INIT = 5;
const OBSTACLES = ["🥕", "🧅", "🥦", "🍳", "🧄", "🌽", "🍎", "🥚"];

type Phase = "opening" | "playing";

export function FridgeGame({ onClose }: FridgeGameProps) {
  const [phase, setPhase] = useState<Phase>("opening");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gs = useRef({
    y: GROUND, vy: 0, onGround: true,
    obstacles: [] as { x: number; emoji: string }[],
    score: 0, speed: SPEED_INIT, frame: 0,
    dead: false, started: false, raf: 0,
  });
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);

  // 문 열린 뒤 게임 시작
  useEffect(() => {
    const t = setTimeout(() => setPhase("playing"), 900);
    return () => clearTimeout(t);
  }, []);

  const jump = useCallback(() => {
    const s = gs.current;
    if (s.dead) {
      s.y = GROUND; s.vy = 0; s.onGround = true;
      s.obstacles = []; s.score = 0; s.speed = SPEED_INIT;
      s.frame = 0; s.dead = false; s.started = true;
      setDead(false); setScore(0);
      return;
    }
    if (!s.started) s.started = true;
    if (s.onGround) { s.vy = JUMP_V; s.onGround = false; }
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const loop = () => {
      const s = gs.current;
      ctx.clearRect(0, 0, GW, GH);

      // 배경
      ctx.fillStyle = "#f0fdf4";
      ctx.fillRect(0, 0, GW, GH);

      // 땅
      ctx.strokeStyle = "#86efac";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND + 26); ctx.lineTo(GW, GROUND + 26);
      ctx.stroke();

      if (!s.started) {
        ctx.font = "15px sans-serif";
        ctx.fillStyle = "#16a34a";
        ctx.textAlign = "center";
        ctx.fillText("스페이스바 또는 클릭으로 시작!", GW / 2, GH / 2 - 8);
        ctx.font = "34px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("🧊", 55, s.y + 4);
        s.raf = requestAnimationFrame(loop);
        return;
      }

      if (!s.dead) {
        s.vy += GRAVITY;
        s.y += s.vy;
        if (s.y >= GROUND) { s.y = GROUND; s.vy = 0; s.onGround = true; }

        s.frame++;
        if (s.frame % Math.max(58 - Math.floor(s.score / 4), 28) === 0) {
          s.obstacles.push({ x: GW + 10, emoji: OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)] });
        }
        s.obstacles = s.obstacles.filter(o => o.x > -40);
        s.obstacles.forEach(o => o.x -= s.speed);

        if (s.frame % 6 === 0) {
          s.score++;
          s.speed = SPEED_INIT + s.score * 0.035;
          setScore(s.score);
        }

        for (const o of s.obstacles) {
          if (o.x < 108 && o.x > 60 && s.y > GROUND - 8) {
            s.dead = true; setDead(true);
          }
        }
      }

      ctx.font = "34px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("🧊", 55, s.y + 4);

      s.obstacles.forEach(o => {
        ctx.font = "28px sans-serif";
        ctx.fillText(o.emoji, o.x, GROUND + 4);
      });

      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = "#15803d";
      ctx.textAlign = "right";
      ctx.fillText(`${s.score}점`, GW - 10, 20);

      if (s.dead) {
        ctx.fillStyle = "rgba(240,253,244,0.85)";
        ctx.fillRect(0, 0, GW, GH);
        ctx.font = "bold 22px sans-serif";
        ctx.fillStyle = "#dc2626";
        ctx.textAlign = "center";
        ctx.fillText("게임 오버!", GW / 2, GH / 2 - 12);
        ctx.font = "13px sans-serif";
        ctx.fillStyle = "#166534";
        ctx.fillText(`점수: ${s.score}점 — 클릭하여 재시작`, GW / 2, GH / 2 + 14);
      }

      s.raf = requestAnimationFrame(loop);
    };

    s.raf = requestAnimationFrame(loop);
    const s = gs.current;
    return () => cancelAnimationFrame(s.raf);
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); jump(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* 냉장고 컨테이너 — scale-up 애니메이션 */}
      <div
        style={{
          animation: "fridgePopIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
        className="relative"
      >
        {/* 냉장고 본체 */}
        <div
          style={{
            width: 560,
            background: "linear-gradient(160deg,#d1fae5 0%,#a7f3d0 100%)",
            borderRadius: 28,
            border: "3px solid #6ee7b7",
            boxShadow: "0 24px 60px rgba(0,0,0,0.3), inset 0 2px 6px rgba(255,255,255,0.6)",
            padding: "16px 16px 14px",
            perspective: 1000,
          }}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute -right-3 -top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* 냉장고 상단 손잡이 */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <div style={{ width: 60, height: 8, background: "#6ee7b7", borderRadius: 4, boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)" }} />
          </div>

          {/* 문 + 내부 — 3D flip */}
          <div style={{ position: "relative", transformStyle: "preserve-3d" }}>
            {/* 냉장고 내부 (게임 영역) */}
            <div
              style={{
                background: "#f0fdf4",
                borderRadius: 16,
                border: "2px solid #86efac",
                overflow: "hidden",
                height: GH + 32,
              }}
            >
              <div style={{ padding: "8px 8px 0" }}>
                <p style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "#16a34a", marginBottom: 6 }}>
                  🧊 냉장고 달리기
                </p>
                {phase === "playing" ? (
                  <canvas
                    ref={canvasRef}
                    width={GW}
                    height={GH}
                    onClick={jump}
                    style={{ display: "block", borderRadius: 10, border: "1px solid #bbf7d0", cursor: "pointer", maxWidth: "100%" }}
                  />
                ) : (
                  <div style={{ width: GW, height: GH, borderRadius: 10, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 36 }}>🧊</span>
                  </div>
                )}
                <p style={{ textAlign: "center", fontSize: 11, color: "#86efac", marginTop: 6 }}>
                  스페이스바 또는 클릭으로 점프
                </p>
              </div>
            </div>

            {/* 냉장고 문 — 왼쪽에서 열리는 3D 애니메이션 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 16,
                background: "linear-gradient(135deg,#6ee7b7 0%,#34d399 50%,#10b981 100%)",
                border: "2px solid #34d399",
                transformOrigin: "left center",
                animation: "fridgeDoorOpen 0.55s 0.35s cubic-bezier(0.4,0,0.2,1) forwards",
                backfaceVisibility: "hidden",
                boxShadow: "inset -4px 0 12px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: 20,
              }}
            >
              {/* 문 손잡이 */}
              <div style={{ width: 8, height: 60, background: "#fff", borderRadius: 4, boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }} />
            </div>
          </div>

          {/* 하단 냉동칸 손잡이 */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
            <div style={{ width: 40, height: 6, background: "#6ee7b7", borderRadius: 3 }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fridgePopIn {
          from { transform: scale(0.15) translateY(40px); opacity: 0; }
          to   { transform: scale(1)    translateY(0);    opacity: 1; }
        }
        @keyframes fridgeDoorOpen {
          from { transform: perspective(900px) rotateY(0deg); }
          to   { transform: perspective(900px) rotateY(-115deg); }
        }
      `}</style>
    </div>
  );
}
