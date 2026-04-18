// Realistic Pakistan-based mock data for FairGig.

export const PLATFORMS = [
  "Foodpanda",
  "Careem",
  "InDrive",
  "Bykea",
  "Yango",
  "Cheetay",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export type EarningStatus = "verified" | "flagged" | "pending";

export type Earning = {
  id: string;
  workerName: string;
  city: string;
  platform: Platform;
  date: string; // ISO
  hours: number;
  gross: number; // PKR
  deductions: number;
  net: number;
  status: EarningStatus;
  hasScreenshot: boolean;
};

const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan"];
const WORKERS = [
  "Asim Raza",
  "Bilal Ahmed",
  "Faisal Khan",
  "Hamza Sheikh",
  "Imran Malik",
  "Junaid Iqbal",
  "Kashif Mehmood",
  "Naveed Akhtar",
  "Saad Hussain",
  "Usman Tariq",
];

function rand(seed: number) {
  // deterministic pseudo-random
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export const EARNINGS: Earning[] = Array.from({ length: 28 }).map((_, i) => {
  const platform = PLATFORMS[Math.floor(rand(i + 1) * PLATFORMS.length)];
  const hours = 4 + Math.round(rand(i + 7) * 8);
  const grossPerHour = 280 + Math.round(rand(i + 3) * 220);
  const gross = hours * grossPerHour;
  const deductions = Math.round(gross * (0.18 + rand(i + 9) * 0.12));
  const status: EarningStatus =
    rand(i + 11) > 0.78 ? "flagged" : rand(i + 13) > 0.55 ? "verified" : "pending";
  const date = new Date();
  date.setDate(date.getDate() - i);
  return {
    id: `EARN-${1000 + i}`,
    workerName: WORKERS[i % WORKERS.length],
    city: CITIES[i % CITIES.length],
    platform,
    date: date.toISOString(),
    hours,
    gross,
    deductions,
    net: gross - deductions,
    status,
    hasScreenshot: rand(i + 17) > 0.2,
  };
});

// Worker dashboard: trend data
export const WEEKLY_TREND = [
  { week: "W-7", earnings: 18400, hours: 38 },
  { week: "W-6", earnings: 21200, hours: 42 },
  { week: "W-5", earnings: 19800, hours: 40 },
  { week: "W-4", earnings: 24500, hours: 46 },
  { week: "W-3", earnings: 22100, hours: 44 },
  { week: "W-2", earnings: 17200, hours: 39 },
  { week: "W-1", earnings: 15800, hours: 41 },
  { week: "Now", earnings: 14200, hours: 40 },
];

export const HOURLY_RATE_TREND = WEEKLY_TREND.map((w) => ({
  week: w.week,
  rate: Math.round(w.earnings / w.hours),
  cityMedian: 480,
}));

export const PLATFORM_COMMISSION = [
  { platform: "Foodpanda", commission: 28 },
  { platform: "Careem", commission: 22 },
  { platform: "InDrive", commission: 12 },
  { platform: "Bykea", commission: 18 },
  { platform: "Yango", commission: 20 },
];

export const COMMISSION_TREND = [
  { month: "Jan", Foodpanda: 18, Careem: 18, InDrive: 10 },
  { month: "Feb", Foodpanda: 20, Careem: 19, InDrive: 10 },
  { month: "Mar", Foodpanda: 22, Careem: 20, InDrive: 11 },
  { month: "Apr", Foodpanda: 24, Careem: 21, InDrive: 11 },
  { month: "May", Foodpanda: 26, Careem: 21, InDrive: 12 },
  { month: "Jun", Foodpanda: 28, Careem: 22, InDrive: 12 },
];

export const CITY_INCOME = [
  { city: "Karachi", median: 22500 },
  { city: "Lahore", median: 21000 },
  { city: "Islamabad", median: 24800 },
  { city: "Rawalpindi", median: 19500 },
  { city: "Faisalabad", median: 17200 },
  { city: "Multan", median: 16400 },
];

// Community / grievance posts
export type Complaint = {
  id: string;
  author: string;
  city: string;
  platform: Platform;
  title: string;
  body: string;
  tag: "rate-cut" | "ban" | "payment-issue" | "delay" | "harassment";
  upvotes: number;
  comments: number;
  status: "under-review" | "escalated" | "resolved";
  createdAt: string;
};

export const COMPLAINTS: Complaint[] = [
  {
    id: "C-2041",
    author: "Bilal Ahmed",
    city: "Lahore",
    platform: "Foodpanda",
    title: "Per-order pay reduced from Rs 95 to Rs 70 without notice",
    body: "Yesterday the base fare quietly dropped. Made 14 deliveries in 6 hours and got Rs 980 only.",
    tag: "rate-cut",
    upvotes: 312,
    comments: 47,
    status: "escalated",
    createdAt: "2025-04-12",
  },
  {
    id: "C-2040",
    author: "Faisal Khan",
    city: "Karachi",
    platform: "Careem",
    title: "Account suspended after one customer complaint, no explanation",
    body: "Been driving for 3 years with 4.9 rating. Ban with no appeal channel.",
    tag: "ban",
    upvotes: 256,
    comments: 38,
    status: "under-review",
    createdAt: "2025-04-11",
  },
  {
    id: "C-2039",
    author: "Saad Hussain",
    city: "Islamabad",
    platform: "Bykea",
    title: "Weekly payment delayed by 9 days",
    body: "Rs 18,400 still pending. Support keeps saying 'processing'.",
    tag: "payment-issue",
    upvotes: 189,
    comments: 22,
    status: "under-review",
    createdAt: "2025-04-10",
  },
  {
    id: "C-2038",
    author: "Usman Tariq",
    city: "Rawalpindi",
    platform: "InDrive",
    title: "Long-distance rides paying below fuel cost",
    body: "Drove 22km for Rs 380 net. Petrol alone was Rs 420.",
    tag: "rate-cut",
    upvotes: 144,
    comments: 19,
    status: "resolved",
    createdAt: "2025-04-08",
  },
];

// Vulnerability detection
export type RiskWorker = {
  id: string;
  name: string;
  city: string;
  platform: Platform;
  drop: number; // percent
  risk: "low" | "medium" | "high";
  weeklyEarnings: number;
};

export const RISK_WORKERS: RiskWorker[] = [
  { id: "W-1042", name: "Asim Raza", city: "Karachi", platform: "Foodpanda", drop: 38, risk: "high", weeklyEarnings: 9800 },
  { id: "W-1078", name: "Hamza Sheikh", city: "Lahore", platform: "Foodpanda", drop: 32, risk: "high", weeklyEarnings: 11200 },
  { id: "W-1101", name: "Imran Malik", city: "Islamabad", platform: "Careem", drop: 24, risk: "medium", weeklyEarnings: 14800 },
  { id: "W-1156", name: "Junaid Iqbal", city: "Multan", platform: "Bykea", drop: 21, risk: "medium", weeklyEarnings: 12100 },
  { id: "W-1187", name: "Kashif Mehmood", city: "Faisalabad", platform: "Yango", drop: 18, risk: "low", weeklyEarnings: 13900 },
  { id: "W-1203", name: "Naveed Akhtar", city: "Lahore", platform: "InDrive", drop: 15, risk: "low", weeklyEarnings: 15400 },
];

export const INCOME_DISTRIBUTION = [
  { bucket: "<10k", workers: 142 },
  { bucket: "10–15k", workers: 318 },
  { bucket: "15–20k", workers: 521 },
  { bucket: "20–25k", workers: 467 },
  { bucket: "25–30k", workers: 289 },
  { bucket: "30k+", workers: 134 },
];

export const VOLATILITY = [
  { week: "W-8", index: 12 },
  { week: "W-7", index: 14 },
  { week: "W-6", index: 17 },
  { week: "W-5", index: 22 },
  { week: "W-4", index: 28 },
  { week: "W-3", index: 31 },
  { week: "W-2", index: 36 },
  { week: "W-1", index: 41 },
];

export function formatPKR(n: number) {
  return "Rs " + n.toLocaleString("en-PK");
}
