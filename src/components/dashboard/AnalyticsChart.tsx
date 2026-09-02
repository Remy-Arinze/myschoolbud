'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartData {
  name: string;
  value?: number;
  [key: string]: any;
}

interface AnalyticsChartProps {
  title: string;
  description?: string;
  data: Array<Record<string, any> & { name: string }>;
  type?: 'line' | 'bar' | 'area' | 'pie' | 'donut' | 'horizontal';
  dataKeys: string[];
  colors?: string[];
  isLoading?: boolean;
}

export function AnalyticsChart({
  title,
  description,
  data,
  type = 'line',
  dataKeys,
  colors = ['#3b82f6', '#10b981', '#f59e0b'],
  isLoading = false,
}: AnalyticsChartProps) {
  const chartConfig = {
    text: {
      fill: 'currentColor',
      fontSize: 10,
      opacity: 0.5,
    },
    grid: {
      stroke: 'currentColor',
      opacity: 0.1,
    },
  };

  const renderChart = () => {
    switch (type) {
      case 'pie':
      case 'donut':
        // For pie/donut charts, transform the data
        // If multiple dataKeys, show distribution between them
        // If single dataKey, show distribution across data points
        let pieData;
        if (dataKeys.length > 1) {
          // Multiple keys: aggregate each key across all data points
          pieData = dataKeys.map((key, index) => {
            const total = data.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
            return {
              name: key.charAt(0).toUpperCase() + key.slice(1),
              value: total,
              color: colors[index % colors.length],
            };
          });
        } else {
          // Single key: show distribution across data points
          const key = dataKeys[0];
          pieData = data.map((item, index) => ({
            name: item.name || `Item ${index + 1}`,
            value: Number(item[key]) || 0,
            color: colors[index % colors.length],
          }));
        }

        // Calculate total for percentages
        const pieTotal = pieData.reduce((sum, item) => sum + item.value, 0);

        // Custom label to show percentage inside the chart
        const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
          if (percent < 0.05) return null; // Don't show label for very small slices
          const RADIAN = Math.PI / 180;
          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
          const x = cx + radius * Math.cos(-midAngle * RADIAN);
          const y = cy + radius * Math.sin(-midAngle * RADIAN);

          return (
            <text
              x={x}
              y={y}
              fill="white"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fontWeight="bold"
            >
              {`${(percent * 100).toFixed(0)}%`}
            </text>
          );
        };

        return (
          <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Pie
              data={pieData}
              cx="35%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={type === 'donut' ? 70 : 85}
              innerRadius={type === 'donut' ? 35 : 0}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => {
                const percent = ((value / pieTotal) * 100).toFixed(1);
                return [`${value} (${percent}%)`, props.payload.name];
              }}
              contentStyle={{
                backgroundColor: '#0f1b3d',
                border: '1px solid #1a2f5c',
                borderRadius: '8px',
                color: '#94a3b8',
                padding: '8px 12px',
              }}
            />
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{
                paddingLeft: '10px',
                fontSize: '11px',
                lineHeight: '1.6',
                width: 'auto',
                maxWidth: '50%'
              }}
              iconSize={10}
              formatter={(value, entry: any) => {
                const percent = pieTotal > 0 ? ((entry.payload.value / pieTotal) * 100).toFixed(1) : '0';
                return (
                  <span style={{ fontSize: '11px', color: 'var(--light-text-primary)' }}>
                    {value} <span style={{ color: 'var(--light-text-secondary)', marginLeft: '4px' }}>({percent}%)</span>
                  </span>
                );
              }}
            />
          </PieChart>
        );
      case 'horizontal':
        return (
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis type="number" {...chartConfig} />
            <YAxis dataKey="name" type="category" {...chartConfig} width={80} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f1b3d',
                border: '1px solid #1a2f5c',
                borderRadius: '8px',
              }}
            />
            <Legend />
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[0, 4, 4, 0]}
              />
            ))}
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              {dataKeys.map((key, index) => {
                const color = colors[index % colors.length];
                return (
                  <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.05} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--light-card)',
                border: '1px solid var(--light-border)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--light-text-primary)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: '#9ca3af', fontSize: 11, marginBottom: '4px' }}
              cursor={{ stroke: colors[0], strokeWidth: 1, strokeDasharray: '5 5' }}
            />
            {dataKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2.5}
                fill={`url(#gradient-${key})`}
                dot={false}
                activeDot={{ r: 5, fill: colors[index % colors.length], strokeWidth: 2, stroke: '#151a23' }}
              />
            ))}
          </AreaChart>
        );
      default:
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="name" {...chartConfig} />
            <YAxis {...chartConfig} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f1b3d',
                border: '1px solid #1a2f5c',
                borderRadius: '8px',
              }}
            />
            <Legend />
            {dataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[index % colors.length], r: 4 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-1" style={{ fontSize: 'var(--text-section-title)' }}>
          {title}
        </CardTitle>
        {description && (
          <p className="text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] mt-1" style={{ fontSize: 'var(--text-body)' }}>
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent className="overflow-hidden">
        <div className="w-full" style={{ minHeight: '260px', maxHeight: '260px' }}>
          {isLoading ? (
            <div className="flex h-[260px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              {renderChart()}
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

