"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface FridgeGameProps {
  onClose: () => void;
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
      ctx.fillStyle = "#f0f9ff";
      ctx.fillRect(0, 0, GW, GH);

      // 선반 느낌 가로선
      ctx.strokeStyle = "#bae6fd";
      ctx.lineWidth = 1;
      for (let yy = 50; yy < GH - 40; yy += 48) {
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(GW, yy); ctx.stroke();
      }

      // 바닥선
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, GROUND + 22); ctx.lineTo(GW, GROUND + 22); ctx.stroke();

      if (!s.started) {
        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#0369a1";
        ctx.textAlign = "center";
        ctx.fillText("클릭 또는 스페이스바로 시작!", GW / 2, GH / 2 - 10);
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#7dd3fc";
        ctx.fillText("🐟 같은 공중 장애물은 점프하지 말고 피해!", GW / 2, GH / 2 + 10);
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
        s.speed = Math.min(3 + s.frame * 0.004, 10);
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
      ctx.fillStyle = "#0284c7";
      ctx.textAlign = "right";
      ctx.fillText(`${s.score}점`, GW - 10, 18);

      if (s.dead) {
        ctx.fillStyle = "rgba(240,249,255,0.9)";
        ctx.fillRect(0, 0, GW, GH);
        ctx.font = "bold 20px sans-serif";
        ctx.fillStyle = "#dc2626";
        ctx.textAlign = "center";
        ctx.fillText("게임 오버!", GW / 2, GH / 2 - 12);
        ctx.font = "13px sans-serif";
        ctx.fillStyle = "#0369a1";
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

  return createPortal(
    <>
      <style>{`
        @keyframes fridgePopIn {
          from { transform: scale(0.15) translateY(40px); opacity: 0; }
          to   { transform: scale(1)    translateY(0);    opacity: 1; }
        }
        @keyframes fridgeDoorOpen {
          from { transform: perspective(900px) rotateY(0deg);    }
          to   { transform: perspective(900px) rotateY(-115deg); }
        }
      `}</style>

      {/* 오버레이 */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(15,23,42,0.65)", backdropFilter: "blur(6px)",
        }}
        onClick={onClose}
      >
        {/* 팝인 래퍼 */}
        <div
          style={{ animation: "fridgePopIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards", display: "flex" }}
          onClick={e => e.stopPropagation()}
        >
          {/* 냉장고 본체 */}
          <div style={{
            background: "#f8fafc",
            borderRadius: 20,
            border: "2px solid #cbd5e1",
            boxShadow: "0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.8)",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* X 버튼 */}
            <button
              onClick={onClose}
              style={{
                position: "absolute", top: 10, right: 10, zIndex: 20,
                width: 26, height: 26, borderRadius: "50%",
                background: "#e2e8f0", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#64748b",
              }}
            >
              <X size={13} />
            </button>

            {/* 냉동실 헤더 */}
            <div style={{
              background: "linear-gradient(180deg, #e2e8f0, #f1f5f9)",
              borderBottom: "2px solid #cbd5e1",
              padding: "12px 42px 10px 16px",
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#334155", margin: 0 }}>
                🧊 냉장고 달리기
              </p>
            </div>

            {/* 냉장실 — 게임 영역 + 문 */}
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
                <div style={{
                  width: GW, height: GH,
                  background: "#f0f9ff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 44 }}>🧊</span>
                </div>
              )}

              {/* 냉장고 문 — 열림 */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(160deg, #f1f5f9, #e2e8f0)",
                transformOrigin: "left center",
                animation: "fridgeDoorOpen 0.6s 0.3s cubic-bezier(0.4,0,0.2,1) forwards",
                display: "flex", alignItems: "center", justifyContent: "flex-end",
                paddingRight: 16,
                borderTop: "1px solid #cbd5e1",
              }}>
                {/* 문 손잡이 */}
                <div style={{
                  width: 6, height: 60,
                  background: "linear-gradient(180deg,#94a3b8,#64748b,#94a3b8)",
                  borderRadius: 3,
                  boxShadow: "2px 0 6px rgba(0,0,0,0.2)",
                }} />
              </div>
            </div>

            {/* 하단 발판 */}
            <div style={{
              background: "linear-gradient(180deg,#f1f5f9,#e2e8f0)",
              borderTop: "2px solid #cbd5e1",
              padding: "7px 0",
              textAlign: "center",
            }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                스페이스바 / 클릭 점프 · 공중 장애물은 바닥에서 피해
              </span>
            </div>
          </div>

          {/* 오른쪽 손잡이 */}
          <div style={{
            width: 14, display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "center",
            paddingLeft: 4,
          }}>
            <div style={{
              width: 8, height: 80,
              background: "linear-gradient(180deg,#94a3b8,#64748b,#94a3b8)",
              borderRadius: 4,
              boxShadow: "2px 0 8px rgba(0,0,0,0.2)",
            }} />
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
