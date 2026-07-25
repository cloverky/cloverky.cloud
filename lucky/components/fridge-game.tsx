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
const GRAVITY = 1.5;
const JUMP_V = -16;
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
    nextObstacleIn: randInt(300, 460),
    score: 0, speed: 4, frame: 0,
    dead: false, started: false,
  };
}

export function FridgeGame({ onClose, origin }: FridgeGameProps) {
  const [phase, setPhase] = useState<Phase>("opening");
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gs = useRef(makeInitState());

  useEffect(() => { gs.current = makeInitState(); setMounted(true); }, []);
  useEffect(() => {
    const t = setTimeout(() => setPhase("playing"), 950);
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

      ctx.strokeStyle = "#f0f0f0";
      ctx.lineWidth = 1;
      for (let yy = 50; yy < GH - 40; yy += 50) {
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(GW, yy); ctx.stroke();
      }
      ctx.strokeStyle = "#d1d5db";
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
        s.speed = 6 + s.score * 0.012;

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
                  background: "#fafafa",
                  borderRadius: 8, border: "1px solid #e2e8f0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 48 }}>🍀</span>
                </div>
              )}

              {/* 냉장실 문 — 열림 */}
              <div style={{
                position: "absolute",
                top: PAD, left: PAD, right: PAD, bottom: PAD,
                background: "linear-gradient(155deg, #f8fafc 0%, #e2e8f0 100%)",
                borderRadius: 8,
                transformOrigin: "left center",
                animation: "fridgeDoorSwing 0.6s 0.28s cubic-bezier(0.4,0,0.2,1) forwards",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 52, opacity: 0.25 }}>🧊</span>
                {/* 문 손잡이 */}
                <div style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  width: 5, height: 56, borderRadius: 3,
                  background: "linear-gradient(180deg,#94a3b8,#64748b,#94a3b8)",
                  boxShadow: "1px 0 4px rgba(0,0,0,0.15)",
                }} />
              </div>
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
