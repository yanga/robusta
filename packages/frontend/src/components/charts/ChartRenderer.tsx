import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ChartConfig } from "@datachat/shared-types";

const COLORS = [
  "#D4A84B", // warm amber
  "#6B9B37", // forest green
  "#8D6E4C", // coffee brown
  "#F0B712", // golden yellow
  "#4CAF50", // bright green
  "#C2703E", // burnt sienna
  "#A0845C", // latte
  "#3E7A2E", // deep green
];

interface ChartRendererProps {
  config: ChartConfig;
  fullscreen?: boolean;
}

export function ChartRenderer({ config, fullscreen }: ChartRendererProps) {
  const { type, data, dataKeys, xAxis, yAxis } = config;
  const xField = xAxis?.field || Object.keys(data[0] || {})[0];
  const chartHeight = fullscreen ? "100%" : 300;

  if (type === "pie") {
    const valueKey = dataKeys[0]?.field || Object.keys(data[0] || {})[1];
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            labelLine={false}
            outerRadius={90}
            dataKey={valueKey}
            nameKey={xField}
            label={({ name, percent }) =>
              percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
            }
            fontSize={11}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, padding: "4px 10px", borderRadius: 6 }}
            itemStyle={{ fontSize: 12, padding: 0 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "horizontal-bar") {
    return (
      <ResponsiveContainer width="100%" height={fullscreen ? "100%" : Math.max(300, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis dataKey={xField} type="category" width={150} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontSize: 12, padding: "4px 10px", borderRadius: 6 }}
            itemStyle={{ fontSize: 12, padding: 0 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
          {dataKeys.map((dk, i) => (
            <Bar
              key={dk.field}
              dataKey={dk.field}
              name={dk.label || dk.field}
              fill={COLORS[i % COLORS.length]}
              radius={[0, 4, 4, 0]}
              barSize={18}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const tooltipStyle = {
    contentStyle: { fontSize: 12, padding: "4px 10px", borderRadius: 6 },
    itemStyle: { fontSize: 12, padding: 0 },
  };
  const legendStyle = { wrapperStyle: { fontSize: 11 }, iconSize: 8 };

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey={xField} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} label={yAxis?.label ? { value: yAxis.label, angle: -90, position: "insideLeft", fontSize: 11 } : undefined} />
          <Tooltip {...tooltipStyle} />
          <Legend {...legendStyle} />
          {dataKeys.map((dk, i) => (
            <Line
              key={dk.field}
              type="monotone"
              dataKey={dk.field}
              name={dk.label || dk.field}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey={xField} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip {...tooltipStyle} />
          <Legend {...legendStyle} />
          {dataKeys.map((dk, i) => (
            <Area
              key={dk.field}
              type="monotone"
              dataKey={dk.field}
              name={dk.label || dk.field}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Default: bar chart
  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey={xField} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} label={yAxis?.label ? { value: yAxis.label, angle: -90, position: "insideLeft", fontSize: 11 } : undefined} />
        <Tooltip {...tooltipStyle} />
        <Legend {...legendStyle} />
        {dataKeys.map((dk, i) => (
          <Bar
            key={dk.field}
            dataKey={dk.field}
            name={dk.label || dk.field}
            fill={COLORS[i % COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
