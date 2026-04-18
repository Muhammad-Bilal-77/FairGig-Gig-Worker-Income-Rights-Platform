import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
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
  formatPKR,
} from "@/lib/mock-data";
import { api } from "@/lib/api-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader } from "lucide-react";

export const Route = createFileRoute("/app/worker/analytics")({
  head: () => ({ meta: [{ title: "Analytics — FairGig" }] }),
  component: Analytics,
});

interface Shift {
  id: string;
  platform: string;
  shift_date: string;
  hours_worked: number;
  gross_earned: number;
  platform_deduction: number;
  net_received: number;
  city_zone?: string;
  worker_category?: string;
}

interface MedianData {
  city_zone: string;
  platform: string;
  worker_category: string;
  median_hourly_rate: number;
  median_deduction_rate: number;
  your_hourly_rate?: number;
  percentile_vs_median?: string;
}

function Analytics() {
  const [timePeriod, setTimePeriod] = useState<"4w" | "8w" | "6m">("8w");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [medianData, setMedianData] = useState<MedianData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range based on time period
  const dateRange = useMemo(() => {
    const today = new Date();
    const endDate = new Date(today);
    const startDate = new Date(today);

    if (timePeriod === "4w") {
      startDate.setDate(startDate.getDate() - 28);
    } else if (timePeriod === "8w") {
      startDate.setDate(startDate.getDate() - 56);
    } else if (timePeriod === "6m") {
      startDate.setMonth(startDate.getMonth() - 6);
    }

    return {
      from: startDate.toISOString().split("T")[0],
      to: endDate.toISOString().split("T")[0],
    };
  }, [timePeriod]);

  // Load shifts and median data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log("📊 Loading analytics data for:", dateRange);

        // Fetch shifts for date range
        try {
          const shiftsResponse = await api.earnings.listShifts({
            from_date: dateRange.from,
            to_date: dateRange.to,
            platform: platformFilter === "all" ? undefined : platformFilter,
            limit: 100, // Backend max is 100
          });

          if (!shiftsResponse || !shiftsResponse.data) {
            console.warn("⚠️ Invalid shifts response structure:", shiftsResponse);
            setShifts([]);
          } else {
            console.log(`✅ Loaded ${shiftsResponse.data.length} shifts`);
            setShifts(shiftsResponse.data);
          }

          // Fetch ALL median data for all cities (for comparison charts)
          try {
            const medianResponse = await api.earnings.getMedian({});
            console.log("✅ Median API response:", medianResponse);
            console.log("✅ Loaded median data for all cities:", medianResponse.data?.length || 0);
            if (medianResponse?.data && Array.isArray(medianResponse.data)) {
              setMedianData(medianResponse.data);
            } else {
              console.warn("⚠️ Median response data is not an array:", medianResponse?.data);
            }
          } catch (medianErr: any) {
            console.warn("⚠️ Could not load median data:", medianErr.message);
            console.warn("⚠️ Median error details:", medianErr);
            // Continue without median data - basic charts will still work
          }
        } catch (shiftsErr: any) {
          console.error("❌ Error loading shifts:", shiftsErr);
          const errorMsg = shiftsErr?.message || shiftsErr?.error || JSON.stringify(shiftsErr);
          throw new Error(`Failed to load shifts: ${errorMsg}`);
        }
      } catch (err: any) {
        console.error("❌ Error loading analytics:", err);
        const errorMsg = err?.message || err?.error || String(err);
        setError(errorMsg || "Failed to load analytics data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dateRange, platformFilter]);

  // Calculate weekly earnings trend
  const weeklyTrend = useMemo(() => {
    if (shifts.length === 0) return [];

    const weeks: { [key: string]: { earnings: number; hours: number; shifts: number } } = {};

    shifts.forEach((shift) => {
      const date = new Date(shift.shift_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weeks[weekKey]) {
        weeks[weekKey] = { earnings: 0, hours: 0, shifts: 0 };
      }

      weeks[weekKey].earnings += shift.net_received;
      weeks[weekKey].hours += shift.hours_worked;
      weeks[weekKey].shifts += 1;
    });

    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        earnings: Math.round(data.earnings),
        hourlyRate: data.hours > 0 ? Math.round(data.earnings / data.hours) : 0,
      }));
  }, [shifts]);

  // Calculate hourly rate trend vs city median
  const hourlyRateTrend = useMemo(() => {
    if (shifts.length === 0) return [];

    const weeks: { [key: string]: { hourlyRate: number; count: number; cityZone: string } } = {};

    shifts.forEach((shift) => {
      const date = new Date(shift.shift_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weeks[weekKey]) {
        weeks[weekKey] = { hourlyRate: 0, count: 0, cityZone: shift.city_zone || "Unknown" };
      }

      if (shift.hours_worked > 0) {
        const hourlyRate = shift.net_received / shift.hours_worked;
        weeks[weekKey].hourlyRate += hourlyRate;
        weeks[weekKey].count += 1;
      }
    });

    // Find median for user's primary city zone
    const userCityZone = shifts[0]?.city_zone;
    console.log("📍 User city zone:", userCityZone);
    console.log("📊 Available medians:", medianData.length);
    console.log("📊 All median data:", JSON.stringify(medianData.slice(0, 3)));
    
    // Get all medians for this city and average them
    let userCityMedian = 0;
    if (medianData.length > 0) {
      const cityMedians = medianData.filter((m) => m.city_zone === userCityZone);
      console.log(`🏙️ Medians for ${userCityZone}:`, cityMedians.length, cityMedians);
      
      if (cityMedians.length > 0) {
        userCityMedian = cityMedians.reduce((sum, m) => sum + (m.median_hourly_rate || 0), 0) / cityMedians.length;
      } else {
        // Fallback: use average of all medians if city not found
        const allRates = medianData.map((m) => m.median_hourly_rate || 0).filter((r) => r > 0);
        if (allRates.length > 0) {
          userCityMedian = allRates.reduce((a, b) => a + b, 0) / allRates.length;
          console.warn(`⚠️ City ${userCityZone} not found in medians, using average: ${userCityMedian}`);
        }
      }
    }
    
    console.log("📊 Final city median:", userCityMedian);

    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        rate: data.count > 0 ? Math.round(data.hourlyRate / data.count) : 0,
        cityMedian: Math.round(userCityMedian),
      }));
  }, [shifts, medianData]);

  // Calculate platform commission rates
  const platformCommission = useMemo(() => {
    if (shifts.length === 0) return [];

    const platforms: { [key: string]: { gross: number; deduction: number } } = {};

    shifts.forEach((shift) => {
      if (!platforms[shift.platform]) {
        platforms[shift.platform] = { gross: 0, deduction: 0 };
      }
      platforms[shift.platform].gross += shift.gross_earned;
      platforms[shift.platform].deduction += shift.platform_deduction;
    });

    return Object.entries(platforms).map(([platform, data]) => ({
      platform,
      commission: data.gross > 0 ? Math.round((data.deduction / data.gross) * 100 * 100) / 100 : 0,
    }));
  }, [shifts]);

  // Calculate city income (show median income by city zone)
  const cityIncome = useMemo(() => {
    if (medianData.length === 0) return [];

    // Group by city_zone and get average median rate
    const cityMap: { [key: string]: { hourlyRate: number; count: number } } = {};

    medianData.forEach((row) => {
      if (!cityMap[row.city_zone]) {
        cityMap[row.city_zone] = { hourlyRate: 0, count: 0 };
      }
      cityMap[row.city_zone].hourlyRate += row.median_hourly_rate;
      cityMap[row.city_zone].count += 1;
    });

    // Convert to chart format - show average median hourly rate per city
    return Object.entries(cityMap)
      .map(([city, data]) => {
        const avgHourlyRate = data.count > 0 ? data.hourlyRate / data.count : 0;
        const monthlyIncome = Math.round(avgHourlyRate * 160); // ~160 hours per month
        return {
          city: city.substring(0, 15), // Truncate long city names
          median: monthlyIncome,
        };
      })
      .sort((a, b) => b.median - a.median) // Sort by highest income
      .slice(0, 8); // Top 8 cities for readability
  }, [medianData]);

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="Analytics" description="Loading your analytics..." />
        <div className="flex items-center justify-center gap-2 py-12">
          <Loader className="h-5 w-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading analytics data...</span>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader title="Analytics" description="Unable to load analytics" />
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Error loading analytics</p>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        description={`Showing ${shifts.length} shifts from ${dateRange.from} to ${dateRange.to}`}
        actions={
          <>
            <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as any)}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4w">Last 4 weeks</SelectItem>
                <SelectItem value="8w">Last 8 weeks</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                <SelectItem value="Foodpanda">Foodpanda</SelectItem>
                <SelectItem value="Careem">Careem</SelectItem>
                <SelectItem value="Bykea">Bykea</SelectItem>
                <SelectItem value="InDrive">InDrive</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {shifts.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-6 text-center">
          <p className="text-muted-foreground">No shifts found for the selected period</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Weekly earnings" subtitle="Net received per week">
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={weeklyTrend} margin={{ left: -10, right: 5, top: 10 }}>
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

          <Card title="Hourly rate vs city median" subtitle="You vs median hourly rate">
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={hourlyRateTrend} margin={{ left: -10, right: 5, top: 10 }}>
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

          <Card title="Platform commission rate" subtitle="Current effective commission %">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={platformCommission} margin={{ left: -10, right: 5, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="platform" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={chartTooltip} formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="commission" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Median income by city" subtitle="Monthly net income estimate (PKR)">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={cityIncome} margin={{ left: -10, right: 5, top: 10 }}>
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
      )}
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
