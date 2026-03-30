'use client';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  DailyBarTrendItem,
  BarStatusDistribution,
  DailyCountItem,
  TopBookmarkedBar,
} from '@/types';

const DONUT_COLORS = ['var(--chart-3)', 'var(--chart-1)', 'var(--chart-5)'];

/** 최근 30일 바 등록/심사 추이 라인 차트 */
export function BarRegistrationTrendChart({
  data,
}: {
  data: DailyBarTrendItem[];
}) {
  const formatted = data.map((d) => ({
    ...d,
    date: formatDate(d.date),
  }));

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="text-sm sm:text-base">Bar Registration Trend</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 pt-0 sm:p-6 sm:pt-0">
        <div className="h-[200px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.06)" vertical={false} />
              <XAxis dataKey="date" fontSize={10} interval="preserveStartEnd" tick={{ fill: 'hsl(40 10% 62%)' }} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} allowDecimals={false} tick={{ fill: 'hsl(40 10% 62%)' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(30 15% 12%)', border: '1px solid hsl(0 0% 100% / 0.1)', borderRadius: '8px', color: 'hsl(40 10% 92%)', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', color: 'hsl(40 10% 62%)' }} />
              <Line
                type="monotone"
                dataKey="registered"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                name="Registered"
                animationDuration={1200}
                animationEasing="ease-in-out"
              />
              <Line
                type="monotone"
                dataKey="reviewed"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                name="Reviewed"
                animationDuration={1200}
                animationBegin={300}
                animationEasing="ease-in-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/** 바 상태 분포 도넛 차트 */
export function BarStatusDonutChart({
  data,
}: {
  data: BarStatusDistribution;
}) {
  const total = data.pending + data.approved + data.rejected;
  const chartData = [
    { name: 'Pending', value: data.pending },
    { name: 'Approved', value: data.approved },
    { name: 'Rejected', value: data.rejected },
  ];

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="text-sm sm:text-base">Bar Status Distribution</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-3 pt-0 sm:p-6 sm:pt-0">
        <div className="relative mx-auto aspect-square w-[240px] flex-1 sm:w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="30%"
                outerRadius="48%"
                dataKey="value"
                paddingAngle={2}
                animationDuration={1000}
                animationBegin={200}
                animationEasing="ease-out"
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'hsl(30 15% 12%)', border: '1px solid hsl(0 0% 100% / 0.1)', borderRadius: '8px', color: 'hsl(40 10% 92%)', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="font-display text-lg font-semibold tracking-tight sm:text-xl">{total}</p>
              <p className="text-[9px] text-muted-foreground sm:text-[10px]">Total</p>
            </div>
          </div>
        </div>
        {/* Legend */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:gap-x-4">
          {chartData.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-1 sm:gap-1.5">
              <span
                className="inline-block size-2.5 rounded-sm sm:size-3"
                style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
              />
              <span className="text-[10px] text-muted-foreground sm:text-xs">{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** 최근 30일 유저 가입 추이 에리어 차트 */
export function UserSignupTrendChart({ data }: { data: DailyCountItem[] }) {
  const formatted = data.map((d) => ({
    ...d,
    date: formatDate(d.date),
  }));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="text-sm sm:text-base">User Signup Trend</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        <div className="h-[200px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formatted}>
              <defs>
                <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.06)" vertical={false} />
              <XAxis dataKey="date" fontSize={10} interval="preserveStartEnd" tick={{ fill: 'hsl(40 10% 62%)' }} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} allowDecimals={false} tick={{ fill: 'hsl(40 10% 62%)' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(30 15% 12%)', border: '1px solid hsl(0 0% 100% / 0.1)', borderRadius: '8px', color: 'hsl(40 10% 92%)', fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--chart-1)"
                fill="url(#signupGradient)"
                strokeWidth={2}
                name="Signups"
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/** 인기 바 Top 10 수평 바 차트 */
export function TopBookmarkedBarsChart({
  data,
}: {
  data: TopBookmarkedBar[];
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="text-sm sm:text-base">Most Bookmarked Bars Top 10</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        <div className="h-[200px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.06)" vertical={false} />
              <XAxis type="number" fontSize={10} allowDecimals={false} tick={{ fill: 'hsl(40 10% 62%)' }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="barName"
                fontSize={10}
                width={80}
                tick={{ width: 75, fill: 'hsl(40 10% 62%)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(30 15% 12%)', border: '1px solid hsl(0 0% 100% / 0.1)', borderRadius: '8px', color: 'hsl(40 10% 92%)', fontSize: '12px' }}
                formatter={(value: unknown) => [String(value), 'Bookmarks']}
                labelFormatter={(label: unknown) => {
                  const labelStr = String(label);
                  const item = data.find((d) => d.barName === labelStr);
                  return item ? `${labelStr} (${item.city})` : labelStr;
                }}
              />
              <Bar
                dataKey="bookmarkCount"
                fill="var(--chart-1)"
                radius={[0, 4, 4, 0]}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/** MM/DD 포맷으로 변환한다 */
function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${month}/${day}`;
}
