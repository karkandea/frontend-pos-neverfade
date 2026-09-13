export type DrawChartOptions = {
  activeIndex?: number | null;
};

export type ChartGeometry = {
  padding: ReturnType<typeof getChartPadding>;
  graphWidth: number;
  graphHeight: number;
  stepX: number;
  scaleMax: number;
};

export function getChartPadding(width: number) {
  return width <= 520
    ? { top: 18, right: 10, bottom: 30, left: 42 }
    : { top: 18, right: 14, bottom: 32, left: 50 };
}

function niceStep(maxValue: number) {
  if (maxValue <= 0) return 1;

  const rawStep = maxValue / 3;
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
    return `${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1)}M`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}jt`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}rb`;
  }

  return value.toFixed(0);
}

export function getChartGeometry(
  width: number,
  height: number,
  values: number[],
): ChartGeometry {
  const padding = getChartPadding(width);
  const graphWidth = Math.max(width - padding.left - padding.right, 1);
  const graphHeight = Math.max(height - padding.top - padding.bottom, 1);
  const safeValues = values.map((value) => Math.max(0, Number(value) || 0));
  const rawMax = Math.max(...safeValues, 0);
  const tickStep = niceStep(rawMax);
  const scaleMax = rawMax > 0 ? tickStep * 3 : 3;
  const stepX = safeValues.length > 1 ? graphWidth / (safeValues.length - 1) : 0;

  return { padding, graphWidth, graphHeight, stepX, scaleMax };
}

export function drawChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  values: number[],
  options: DrawChartOptions = {},
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = Math.max(
    canvas.offsetWidth || canvas.parentElement?.clientWidth || 500,
    240,
  );
  const height = Math.max(canvas.offsetHeight || 190, 160);
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const safeValues = values.map((value) => Math.max(0, Number(value) || 0));
  const count = Math.min(labels.length, safeValues.length);
  const geometry = getChartGeometry(width, height, safeValues.slice(0, count));
  const { padding, graphWidth, graphHeight, stepX, scaleMax } = geometry;
  const tickStep = scaleMax / 3;

  const pointAt = (index: number) => {
    const value = safeValues[index] ?? 0;
    return {
      x: count > 1 ? padding.left + index * stepX : padding.left + graphWidth / 2,
      y: padding.top + graphHeight - (value / scaleMax) * graphHeight,
    };
  };

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let index = 0; index <= 3; index += 1) {
    const y = padding.top + graphHeight - (graphHeight / 3) * index;
    const value = tickStep * index;

    ctx.strokeStyle = index === 0 ? "#D5D5D7" : "#EEEEF0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + graphWidth, y);
    ctx.stroke();

    ctx.fillStyle = "#96969B";
    ctx.font = "500 9.5px DM Sans, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatCompact(value), padding.left - 7, y);
  }

  if (count === 0) return;

  if (count > 1) {
    ctx.strokeStyle = "#19191B";
    ctx.lineWidth = 1.65;
    ctx.beginPath();

    safeValues.slice(0, count).forEach((_, index) => {
      const point = pointAt(index);
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });

    ctx.stroke();
  }

  const activeIndex =
    options.activeIndex != null &&
    options.activeIndex >= 0 &&
    options.activeIndex < count
      ? options.activeIndex
      : null;

  if (activeIndex != null) {
    const point = pointAt(activeIndex);

    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = "rgba(25,25,27,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(point.x, padding.top);
    ctx.lineTo(point.x, padding.top + graphHeight);
    ctx.stroke();
    ctx.restore();
  }

  safeValues.slice(0, count).forEach((_, index) => {
    const point = pointAt(index);
    const isActive = index === activeIndex;

    if (isActive) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(point.x, point.y, isActive ? 3.3 : 2.4, 0, Math.PI * 2);
    ctx.fillStyle = "#19191B";
    ctx.fill();

    ctx.fillStyle = index === count - 1 ? "#4A4A4F" : "#85858B";
    ctx.font = `${index === count - 1 ? "600" : "500"} 9.5px DM Sans, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(labels[index] ?? "", point.x, height - 7);
  });
}
