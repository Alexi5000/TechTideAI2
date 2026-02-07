/**
 * Matrix Rain Background Effect
 *
 * Canvas-based falling green characters inspired by The Matrix.
 * Performance-optimized: pauses when tab is hidden, respects reduced motion.
 */

import { useEffect, useRef } from "react";

export interface MatrixRainProps {
  opacity?: number;
  speed?: number;
  fontSize?: number;
  color?: string;
}

const CHARS =
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function MatrixRain({
  opacity = 0.06,
  speed = 1,
  fontSize = 14,
  color = "#00ff41",
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let columns = 0;
    let drops: number[] = [];
    let animationId = 0;
    let paused = false;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      const newCols = Math.floor(canvas!.width / fontSize);
      if (newCols !== columns) {
        const old = drops;
        drops = Array.from({ length: newCols }, (_, i): number =>
          i < old.length ? (old[i] ?? 0) : Math.random() * (canvas!.height / fontSize),
        );
        columns = newCols;
      }
    }

    function draw() {
      if (paused) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      ctx!.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      ctx!.fillStyle = color;
      ctx!.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)] ?? "0";
        const drop = drops[i] ?? 0;
        ctx!.fillText(char, i * fontSize, drop * fontSize);

        if (drop * fontSize > canvas!.height && Math.random() > 0.975) {
          drops[i] = 0;
        } else {
          drops[i] = drop + speed;
        }
      }

      animationId = requestAnimationFrame(draw);
    }

    function onVisibility() {
      paused = document.hidden;
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [speed, fontSize, color]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ opacity, zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
