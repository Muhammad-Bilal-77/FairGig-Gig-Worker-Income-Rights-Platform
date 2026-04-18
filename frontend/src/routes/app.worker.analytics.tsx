import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/AppShell";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  WEEKLY_TREND,
  HOURLY_RATE_TREND,
  PLATFORM_COMMISSION,
  CITY_INCOME,
  formatPKR,
} from "@/lib/mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/worker/analytics")({
  head: () => ({ meta: [{ title: "Analytics — FairGig" }] }),
  component: Analytics,
});

function Analytics() {
  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        description="Spot trends, compare to your city, and understand commission impact."
        actions={
          <>
            <Select defaultValue="8w">
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4w">Last 4 weeks</SelectItem>
                <SelectItem value="8w">Last 8 weeks</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                <SelectItem value="fp">Foodpanda</SelectItem>
                <SelectItem value="cr">Careem</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Weekly earnings" subtitle="Net received per week">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={WEEKLY_TREND} margin={{ left: -10, right: 5, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={chartTooltip}
                  formatter={(v: number) => formatPKR(v)}
                />
                <Line
                  type="monotone"
                  dataKey="earnings"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 0, fill: "var(--primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Hourly rate vs city median" subtitle="You vs Karachi median">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={HOURLY_RATE_TREND} margin={{ left: -10, right: 5, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltip} formatter={(v: number) => `Rs ${v}/hr`} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Line type="monotone" dataKey="rate" name="You" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="cityMedian" name="City median" stroke="var(--success)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Platform commission rate" subtitle="Current effective commission">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={PLATFORM_COMMISSION} margin={{ left: -10, right: 5, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="platform" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={chartTooltip} formatter={(v: number) => `${v}%`} />
                <Bar dataKey="commission" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Median income by city" subtitle="Monthly net income (PKR)">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={CITY_INCOME} margin={{ left: -10, right: 5, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="city" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={chartTooltip} formatter={(v: number) => formatPKR(v)} />
                <Bar dataKey="median" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

const chartTooltip = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-elegant">
      <h3 className="font-semibold">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}
