export function drawChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  values: number[],
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.offsetWidth || canvas.parentElement?.clientWidth || 500;
  const H = 200;

  const dpr = window.devicePixelRatio || 1;

  canvas.width = W * dpr;
  canvas.height = H * dpr;

  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  const PAD = {
    top: 16,
    right: 16,
    bottom: 32,
    left: 58,
  };

  const gW = W - PAD.left - PAD.right;
  const gH = H - PAD.top - PAD.bottom;

  ctx.clearRect(0, 0, W, H);

  const maxVal = Math.max(...values, 1);

  const n = labels.length;

  const stepX = n > 1 ? gW / (n - 1) : gW;

  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + gH - (gH / 4) * i;

    ctx.strokeStyle = "#2A2A2A";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + gW, y);
    ctx.stroke();

    const v = (maxVal / 4) * i;

    ctx.fillStyle = "#606060";
    ctx.font = "10px DM Sans,sans-serif";
    ctx.textAlign = "right";

    ctx.fillText(
      v >= 1e6
        ? `${(v / 1e6).toFixed(1)}jt`
        : v >= 1e3
        ? `${(v / 1e3).toFixed(0)}k`
        : v.toFixed(0),
      PAD.left - 4,
      y + 4,
    );
  }

  if (n < 2) return;

  const grad = ctx.createLinearGradient(
    0,
    PAD.top,
    0,
    PAD.top + gH,
  );

  grad.addColorStop(0, "rgba(240,240,240,0.10)");
  grad.addColorStop(1, "rgba(240,240,240,0.00)");

  ctx.beginPath();

  values.forEach((v, i) => {
    const x = PAD.left + i * stepX;
    const y = PAD.top + gH - (v / maxVal) * gH;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.lineTo(PAD.left + (n - 1) * stepX, PAD.top + gH);
  ctx.lineTo(PAD.left, PAD.top + gH);

  ctx.closePath();

  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = "#F0F0F0";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";

  ctx.beginPath();

  values.forEach((v, i) => {
    const x = PAD.left + i * stepX;
    const y = PAD.top + gH - (v / maxVal) * gH;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  values.forEach((v, i) => {
    const x = PAD.left + i * stepX;
    const y = PAD.top + gH - (v / maxVal) * gH;

    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);

    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    ctx.fillStyle = "#606060";
    ctx.font = "10px DM Sans,sans-serif";
    ctx.textAlign = "center";

    ctx.fillText(labels[i], x, H - 6);
  });
}
