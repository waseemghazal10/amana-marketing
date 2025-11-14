interface LineChartDataPoint {
  label: string;
  value: number;
}

interface LineChartSeries {
  name: string;
  data: LineChartDataPoint[];
  color: string;
}

interface LineChartProps {
  title: string;
  series: LineChartSeries[];
  className?: string;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  formatValue?: (value: number) => string;
  formatLabel?: (label: string) => string;
}

export function LineChart({ 
  title, 
  series,
  className = "", 
  height = 300,
  showLegend = true,
  showGrid = true,
  formatValue = (value) => value.toLocaleString(),
  formatLabel = (label) => label
}: LineChartProps) {
  if (!series || series.length === 0 || series.every(s => s.data.length === 0)) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  // Find max value across all series for scaling
  const maxValue = Math.max(
    ...series.flatMap(s => s.data.map(d => d.value))
  );

  // Get all unique labels (assuming all series share the same labels)
  const labels = series[0]?.data.map(d => d.label) || [];
  
  const chartHeight = height - 80; // Reserve space for labels and legend
  const chartWidth = 100; // percentage
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };

  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-6">{title}</h3>
      
      <div className="relative" style={{ height: `${height}px` }}>
        <svg 
          width="100%" 
          height={chartHeight}
          className="overflow-visible"
          viewBox={`0 0 800 ${chartHeight}`}
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {showGrid && [0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={padding.left}
              y1={padding.top + (1 - ratio) * (chartHeight - padding.top - padding.bottom)}
              x2={800 - padding.right}
              y2={padding.top + (1 - ratio) * (chartHeight - padding.top - padding.bottom)}
              stroke="#374151"
              strokeWidth="1"
              opacity="0.3"
            />
          ))}

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <text
              key={ratio}
              x={padding.left - 10}
              y={padding.top + (1 - ratio) * (chartHeight - padding.top - padding.bottom)}
              fill="#9CA3AF"
              fontSize="11"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {formatValue(maxValue * ratio)}
            </text>
          ))}

          {/* Draw each series */}
          {series.map((s, seriesIndex) => {
            const points = s.data.map((d, i) => {
              const x = padding.left + (i / Math.max(s.data.length - 1, 1)) * (800 - padding.left - padding.right);
              const y = padding.top + (1 - (d.value / maxValue)) * (chartHeight - padding.top - padding.bottom);
              return { x, y, value: d.value };
            });

            // Create path for the line
            const pathD = points.map((p, i) => 
              `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
            ).join(' ');

            return (
              <g key={seriesIndex}>
                {/* Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Data points */}
                {points.map((p, i) => (
                  <g key={i}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      fill={s.color}
                      stroke="#1F2937"
                      strokeWidth="2"
                      className="hover:r-6 transition-all cursor-pointer"
                    />
                    {/* Tooltip on hover - simplified for SVG */}
                    <title>{`${s.name}: ${formatValue(p.value)}`}</title>
                  </g>
                ))}
              </g>
            );
          })}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between px-4 mt-2">
          {labels.map((label, i) => (
            <div 
              key={i}
              className="text-xs text-gray-400 text-center"
              style={{ 
                flex: 1,
                maxWidth: `${100 / labels.length}%`
              }}
            >
              {formatLabel(label)}
            </div>
          ))}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex flex-wrap gap-4 justify-center mt-4">
            {series.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-sm text-gray-300">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
