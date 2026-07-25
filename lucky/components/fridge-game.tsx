"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";

interface FridgeGameProps {
  onClose: () => void;
}

const GW = 480;
const GH = 180;
const GROUND = GH - 32;
const GRAVITY = 0.55;
const JUMP_V = -12;
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
    const s = gs.current;

    const loop = () => {
      ctx.clearRect(0, 0, GW, GH);
      ctx.fillStyle = "#f0fdf4";
      ctx.fillRect(0, 0, GW, GH);

      ctx.strokeStyle = "#86efac";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND + 24); ctx.lineTo(GW, GROUND + 24);
      ctx.stroke();

      if (!s.started) {
        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#16a34a";
        ctx.textAlign = "center";
        ctx.fillText("클릭 또는 스페이스바로 시작!", GW / 2, GH / 2);
        ctx.font = "30px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("🧊", 50, s.y + 2);
        s.raf = requestAnimationFrame(loop);
        return;
      }

      if (!s.dead) {
        s.vy += GRAVITY;
        s.y += s.vy;
        if (s.y >= GROUND) { s.y = GROUND; s.vy = 0; s.onGround = true; }

        s.frame++;
        if (s.frame % Math.max(55 - Math.floor(s.score / 4), 26) === 0) {
          s.obstacles.push({ x: GW + 10, emoji: OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)] });
        }
        s.obstacles = s.obstacles.filter(o => o.x > -40);
        s.obstacles.forEach(o => o.x -= s.speed);

        if (s.frame % 6 === 0) {
          s.score++;
          s.speed = SPEED_INIT + s.score * 0.03;
          setScore(s.score);
        }

        for (const o of s.obstacles) {
          if (o.x < 100 && o.x > 52 && s.y > GROUND - 6) {
            s.dead = true; setDead(true);
          }
        }
      }

      ctx.font = "30px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("🧊", 50, s.y + 2);

      s.obstacles.forEach(o => {
        ctx.font = "26px sans-serif";
        ctx.fillText(o.emoji, o.x, GROUND + 2);
      });

      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = "#15803d";
      ctx.textAlign = "right";
      ctx.fillText(`${s.score}점`, GW - 10, 18);

      if (s.dead) {
        ctx.fillStyle = "rgba(240,253,244,0.88)";
        ctx.fillRect(0, 0, GW, GH);
        ctx.font = "bold 20px sans-serif";
        ctx.fillStyle = "#dc2626";
        ctx.textAlign = "center";
        ctx.fillText("게임 오버!", GW / 2, GH / 2 - 10);
        ctx.font = "13px sans-serif";
        ctx.fillStyle = "#166534";
        ctx.fillText(`점수: ${s.score}점 · 클릭하여 재시작`, GW / 2, GH / 2 + 14);
      }

      s.raf = requestAnimationFrame(loop);
    };

    s.raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(s.raf);
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); jump(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

  return (
    <>
      <style>{`
        @keyframes fridgePopIn {
          from { transform: scale(0.2); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes fridgeDoorOpen {
          from { transform: perspective(800px) rotateY(0deg); }
          to   { transform: perspective(800px) rotateY(-118deg); }
        }
      `}</style>

      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      >
        {/* 냉장고 전체 — scale 애니메이션 */}
        <div
          style={{ animation: "fridgePopIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
          onClick={e => e.stopPropagation()}
        >
          {/* 냉장고 본체 */}
          <div style={{
            width: GW + 32,
            background: "linear-gradient(150deg,#d1fae5,#a7f3d0)",
            borderRadius: 24,
            border: "3px solid #6ee7b7",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35), inset 0 2px 6px rgba(255,255,255,0.5)",
            padding: 14,
            position: "relative",
          }}>
            {/* 닫기 */}
            <button
              onClick={onClose}
              style={{
                position: "absolute", top: -12, right: -12, zIndex: 10,
                width: 28, height: 28, borderRadius: "50%",
                background: "#fff", border: "1px solid #e5e7eb",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>

            {/* 상단 손잡이 */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <div style={{ width: 56, height: 7, background: "#6ee7b7", borderRadius: 4, boxShadow: "inset 0 2px 3px rgba(0,0,0,0.1)" }} />
            </div>

            <p style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "#15803d", marginBottom: 8 }}>
              🧊 냉장고 달리기
            </p>

            {/* 게임 영역 + 문 */}
            <div style={{ position: "relative", borderRadius: 14, overflow: "hidden" }}>
              {/* 내부 */}
              <div style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: 14 }}>
                {phase === "playing" ? (
                  <canvas
                    ref={canvasRef}
                    width={GW}
                    height={GH}
                    onClick={jump}
                    style={{ display: "block", cursor: "pointer", borderRadius: 12 }}
                  />
                ) : (
                  <div style={{ width: GW, height: GH, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 40 }}>🧊</span>
                  </div>
                )}
              </div>

              {/* 냉장고 문 — 왼쪽으로 열림 */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(135deg,#6ee7b7,#10b981)",
                borderRadius: 14,
                transformOrigin: "left center",
                animation: "fridgeDoorOpen 0.55s 0.35s cubic-bezier(0.4,0,0.2,1) forwards",
                display: "flex", alignItems: "center", justifyContent: "flex-end",
                paddingRight: 18,
              }}>
                <div style={{ width: 7, height: 52, background: "#fff", borderRadius: 4, boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }} />
              </div>
            </div>

            <p style={{ textAlign: "center", fontSize: 11, color: "#86efac", marginTop: 8 }}>
              스페이스바 또는 클릭으로 점프
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
