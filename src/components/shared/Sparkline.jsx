export default function Sparkline({ values, color }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values),
    max = Math.max(...values),
    range = max - min || 1;
  const w = 64,
    h = 24;
  const pts = values
    .map(
      (v, i) =>
        `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`
    )
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
      />
    </svg>
  );
}
