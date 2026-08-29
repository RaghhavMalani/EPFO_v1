import type { CorpusProjectionPoint } from "@/domain/pension";

function compactCurrency(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(paise / 100);
}

/** A hand-rolled SVG area/line chart of the retirement corpus projection. No chart library. */
export function RetirementChart({ points }: { points: CorpusProjectionPoint[] }) {
  const width = 760;
  const height = 240;
  const plotLeft = 56;
  const plotRight = 12;
  const plotTop = 16;
  const plotBottom = 30;
  const innerWidth = width - plotLeft - plotRight;
  const innerHeight = height - plotTop - plotBottom;

  const minAge = points[0].age;
  const maxAge = points.at(-1)!.age;
  const ageSpan = Math.max(1, maxAge - minAge);
  const maxBalance = Math.max(...points.map((point) => point.balancePaise), 1);

  const x = (age: number) => plotLeft + ((age - minAge) / ageSpan) * innerWidth;
  const y = (balance: number) => plotTop + innerHeight - (balance / maxBalance) * innerHeight;

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(point.age)},${y(point.balancePaise)}`).join(" ");
  const areaPath = `${linePath} L${x(maxAge)},${plotTop + innerHeight} L${x(minAge)},${plotTop + innerHeight} Z`;

  const gridFractions = [0, 0.25, 0.5, 0.75, 1];
  const ageStep = Math.max(1, Math.round(ageSpan / 6));
  const axisAges = points.filter((point) => (point.age - minAge) % ageStep === 0 || point.age === maxAge).map((point) => point.age);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="retirement-chart__svg"
      role="img"
      aria-label={`Projected retirement corpus rising from ${compactCurrency(points[0].balancePaise)} at age ${minAge} to ${compactCurrency(points.at(-1)!.balancePaise)} at age ${maxAge}.`}
    >
      {gridFractions.map((fraction) => (
        <g key={fraction}>
          <line
            x1={plotLeft}
            x2={width - plotRight}
            y1={plotTop + innerHeight - fraction * innerHeight}
            y2={plotTop + innerHeight - fraction * innerHeight}
            className="chart-grid"
          />
          <text x={plotLeft - 8} y={plotTop + innerHeight - fraction * innerHeight + 4} className="retirement-chart__y-label tabular">
            {compactCurrency(maxBalance * fraction)}
          </text>
        </g>
      ))}
      <path d={areaPath} className="retirement-chart__area" />
      <path d={linePath} className="retirement-chart__line" />
      {points.map((point) => (
        <circle key={point.age} cx={x(point.age)} cy={y(point.balancePaise)} r={3} className="retirement-chart__point" />
      ))}
      {axisAges.map((age) => (
        <text key={age} x={x(age)} y={height - 8} className="chart-label tabular">{age}</text>
      ))}
    </svg>
  );
}
