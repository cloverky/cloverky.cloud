"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface FridgeGameProps {
  onClose: () => void;
}

const GW = 480;
const GH = 180;
const GROUND = GH - 30;
const GRAVITY = 1.2;
const JUMP_V = -15;
const OBSTACLES = ["🥕", "🧅", "🥦", "🍳", "🧄", "🌽", "🍎", "🥚"];

type Phase = "opening" | "playing";

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeInitState() {
  return {
    y: GROUND, vy: 0, onGround: true,
    obstacles: [] as { x: number; emoji: string }[],
    nextObstacleIn: randInt(280, 420),
    score: 0,
    speed: 3,
    frame: 0,
    dead: false,
    started: false,
  };
}

export function FridgeGame({ onClose }: FridgeGameProps) {
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
    if (s.dead) {
      gs.current = { ...makeInitState(), started: true };
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
    let rafId = 0;

    const loop = () => {
      const s = gs.current;

      ctx.clearRect(0, 0, GW, GH);
      ctx.fillStyle = "#f0fdf4";
      ctx.fillRect(0, 0, GW, GH);

      ctx.strokeStyle = "#86efac";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND + 22); ctx.lineTo(GW, GROUND + 22);
      ctx.stroke();

      if (!s.started) {
        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#16a34a";
        ctx.textAlign = "center";
        ctx.fillText("클릭 또는 스페이스바로 시작!", GW / 2, GH / 2);
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
        // 속도: 처음 3 → 점점 빨라져 최대 10
        s.speed = Math.min(3 + s.frame * 0.004, 10);
        s.score = Math.floor(s.frame * 0.15);

        s.obstacles.forEach(o => o.x -= s.speed);
        s.obstacles = s.obstacles.filter(o => o.x > -40);

        s.nextObstacleIn -= s.speed;
        if (s.nextObstacleIn <= 0) {
          s.obstacles.push({ x: GW + 10, emoji: OBSTACLES[randInt(0, OBSTACLES.length - 1)] });
          s.nextObstacleIn = randInt(200, 380);
        }

        for (const o of s.obstacles) {
          if (o.x < 84 && o.x > 42 && s.y > GROUND - 4) {
            s.dead = true;
          }
        }
      }

      ctx.font = "28px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("🧊", 50, s.y);

      s.obstacles.forEach(o => {
        ctx.font = "24px sans-serif";
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
        ctx.fillText("게임 오버!", GW / 2, GH / 2 - 12);
        ctx.font = "13px sans-serif";
        ctx.fillStyle = "#166534";
        ctx.fillText(`점수: ${s.score}점 · 클릭하여 재시작`, GW / 2, GH / 2 + 12);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); jump(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

  if (!mounted) return null;

  return createPortal(
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

      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      >
        <div
          style={{ animation: "fridgePopIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            width: GW + 32,
            background: "linear-gradient(150deg,#d1fae5,#a7f3d0)",
            borderRadius: 24,
            border: "3px solid #6ee7b7",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35), inset 0 2px 6px rgba(255,255,255,0.5)",
            padding: 14,
            position: "relative",
          }}>
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

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <div style={{ width: 56, height: 7, background: "#6ee7b7", borderRadius: 4 }} />
            </div>

            <p style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "#15803d", marginBottom: 8 }}>
              🧊 냉장고 달리기
            </p>

            <div style={{ position: "relative", borderRadius: 14, overflow: "hidden" }}>
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

              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(135deg,#6ee7b7,#10b981)",
                borderRadius: 14,
                transformOrigin: "left center",
                animation: "fridgeDoorOpen 0.55s 0.35s cubic-bezier(0.4,0,0.2,1) forwards",
                display: "flex", alignItems: "center", justifyContent: "flex-end",
                paddingRight: 18,
              }}>
                <div style={{ width: 7, height: 52, background: "#fff", borderRadius: 4 }} />
              </div>
            </div>

            <p style={{ textAlign: "center", fontSize: 11, color: "#86efac", marginTop: 8 }}>
              스페이스바 또는 클릭으로 점프
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
