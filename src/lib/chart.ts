export type DrawChartOptions = {
  activeIndex?: number | null;
};

export function getChartPadding(width: number) {
  return width <= 520
    ? { top: 16, right: 12, bottom: 34, left: 46 }
    : { top: 18, right: 18, bottom: 36, left: 54 };
}

function niceStep(maxValue: number) {
  if (maxValue <= 0) return 1;

  const rawStep = maxValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;

  const niceNormalized =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 5
            ? 5
            : 10;

  return niceNormalized * magnitude;
}

function formatCompact(value: number) {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1)} M`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)} jt`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)} rb`;
  }

  return value.toFixed(0);
}

export function drawChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  values: number[],
  options: DrawChartOptions = {},
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = Math.max(
    canvas.offsetWidth || canvas.parentElement?.clientWidth || 500,
    240,
  );
  const H = Math.max(canvas.offsetHeight || 210, 170);
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const safeValues = values.map((value) => Math.max(0, Number(value) || 0));
  const n = Math.min(labels.length, safeValues.length);
  const pad = getChartPadding(W);
  const graphWidth = Math.max(W - pad.left - pad.right, 1);
  const graphHeight = Math.max(H - pad.top - pad.bottom, 1);
  const rawMax = Math.max(...safeValues.slice(0, n), 0);
  const tickStep = niceStep(rawMax);
  const scaleMax = rawMax > 0 ? tickStep * 4 : 4;
  const stepX = n > 1 ? graphWidth / (n - 1) : 0;

  const pointAt = (index: number) => {
    const value = safeValues[index] ?? 0;
    return {
      x: n > 1 ? pad.left + index * stepX : pad.left + graphWidth / 2,
      y: pad.top + graphHeight - (value / scaleMax) * graphHeight,
    };
  };

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + graphHeight - (graphHeight / 4) * i;
    const value = tickStep * i;

    ctx.strokeStyle = i === 0 ? "#D8D8DC" : "#ECECEF";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + graphWidth, y);
    ctx.stroke();

    ctx.fillStyle = "#8A8A92";
    ctx.font = "500 10px DM Sans, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatCompact(value), pad.left - 8, y);
  }

  if (n === 0) return;

  if (n > 1 && rawMax > 0) {
    const gradient = ctx.createLinearGradient(
      0,
      pad.top,
      0,
      pad.top + graphHeight,
    );
    gradient.addColorStop(0, "rgba(24,24,27,0.14)");
    gradient.addColorStop(0.72, "rgba(24,24,27,0.035)");
    gradient.addColorStop(1, "rgba(24,24,27,0)");

    ctx.beginPath();
    safeValues.slice(0, n).forEach((_, index) => {
      const point = pointAt(index);
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(pointAt(n - 1).x, pad.top + graphHeight);
    ctx.lineTo(pointAt(0).x, pad.top + graphHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  if (n > 1) {
    ctx.strokeStyle = "#202024";
    ctx.lineWidth = 2.25;
    ctx.beginPath();
    safeValues.slice(0, n).forEach((_, index) => {
      const point = pointAt(index);
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }

  const activeIndex =
    options.activeIndex != null &&
    options.activeIndex >= 0 &&
    options.activeIndex < n
      ? options.activeIndex
      : null;

  if (activeIndex != null) {
    const activePoint = pointAt(activeIndex);

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(32,32,36,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(activePoint.x, pad.top);
    ctx.lineTo(activePoint.x, pad.top + graphHeight);
    ctx.stroke();
    ctx.restore();
  }

  safeValues.slice(0, n).forEach((_, index) => {
    const point = pointAt(index);
    const isActive = index === activeIndex;

    if (isActive) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(32,32,36,0.1)";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(point.x, point.y, isActive ? 4.5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? "#202024" : "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = "#202024";
    ctx.lineWidth = 1.75;
    ctx.stroke();

    ctx.fillStyle = index === n - 1 ? "#3F3F46" : "#7A7A82";
    ctx.font = `${index === n - 1 ? "600" : "500"} 10.5px DM Sans, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(labels[index] ?? "", point.x, H - 8);
  });
}
