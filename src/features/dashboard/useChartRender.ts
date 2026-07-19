import { useEffect, useRef } from "react";
import { drawChart } from "../../lib/chart";

export function useChartRender(labels: string[], values: number[]) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!labels.length) return;

    drawChart(ref.current, labels, values);
  }, [labels, values]);

  return ref;
}
