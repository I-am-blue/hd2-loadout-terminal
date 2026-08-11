import { useEffect, useRef } from "react";
import { DIMENSIONS, DIMENSION_LABELS, type DimensionMap } from "../types";

export function RadarChart({ values, critical = [] }: { values: DimensionMap; critical?: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const cx = rect.width / 2;
    const cy = rect.height / 2 + 4;
    const radius = Math.min(rect.width, rect.height) * 0.33;
    const point = (index: number, factor: number) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / DIMENSIONS.length;
      return [cx + Math.cos(angle) * radius * factor, cy + Math.sin(angle) * radius * factor] as const;
    };

    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 4; ring += 1) {
      ctx.beginPath();
      DIMENSIONS.forEach((_, index) => {
        const [x, y] = point(index, ring / 4);
        index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = ring === 4 ? "rgba(173, 194, 187, .25)" : "rgba(173, 194, 187, .10)";
      ctx.stroke();
    }
    DIMENSIONS.forEach((_, index) => {
      const [x, y] = point(index, 1);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "rgba(173, 194, 187, .12)";
      ctx.stroke();
    });

    ctx.beginPath();
    DIMENSIONS.forEach((dimension, index) => {
      const [x, y] = point(index, values[dimension] / 100);
      index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    const gradient = ctx.createRadialGradient(cx, cy, 8, cx, cy, radius);
    gradient.addColorStop(0, "rgba(241, 201, 74, .38)");
    gradient.addColorStop(1, "rgba(205, 225, 92, .12)");
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = "#f1c94a";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "600 12px 'Microsoft YaHei UI', 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    DIMENSIONS.forEach((dimension, index) => {
      const [x, y] = point(index, 1.28);
      ctx.fillStyle = critical.includes(dimension) ? "#f1c94a" : "#93a19d";
      ctx.fillText(`${DIMENSION_LABELS[dimension]} ${values[dimension]}`, x, y);
    });
  }, [critical, values]);

  return <canvas className="radar-chart" ref={canvasRef} role="img" aria-label="八维战术能力雷达图" />;
}
