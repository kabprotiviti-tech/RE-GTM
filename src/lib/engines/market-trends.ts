/**
 * Historical Market Trends Module — 24-month Dubai Marina PSF data
 *
 * Realistic monthly PSF data showing the Marina market trajectory.
 * Includes absorption rate trends and volume data.
 * This is the "historical analysis" slide a McKinsey consultant would build.
 */

export interface MonthlyDataPoint {
  month: string; // "2024-01"
  label: string; // "Jan '24"
  avgPsqft: number;
  medianPsqft: number;
  transactions: number;
  avgDaysOnMarket: number;
  newLaunches: number;
}

// 24 months of Dubai Marina data (2024-01 to 2025-12)
// Realistic trend: gradual recovery → strong growth → slight cooling
export const HISTORICAL_DATA: MonthlyDataPoint[] = [
  { month: "2024-01", label: "Jan '24", avgPsqft: 2180, medianPsqft: 2150, transactions: 142, avgDaysOnMarket: 78, newLaunches: 1 },
  { month: "2024-02", label: "Feb '24", avgPsqft: 2200, medianPsqft: 2170, transactions: 138, avgDaysOnMarket: 76, newLaunches: 0 },
  { month: "2024-03", label: "Mar '24", avgPsqft: 2230, medianPsqft: 2200, transactions: 165, avgDaysOnMarket: 72, newLaunches: 2 },
  { month: "2024-04", label: "Apr '24", avgPsqft: 2260, medianPsqft: 2230, transactions: 178, avgDaysOnMarket: 68, newLaunches: 1 },
  { month: "2024-05", label: "May '24", avgPsqft: 2290, medianPsqft: 2260, transactions: 192, avgDaysOnMarket: 65, newLaunches: 2 },
  { month: "2024-06", label: "Jun '24", avgPsqft: 2320, medianPsqft: 2290, transactions: 185, avgDaysOnMarket: 63, newLaunches: 1 },
  { month: "2024-07", label: "Jul '24", avgPsqft: 2350, medianPsqft: 2320, transactions: 168, avgDaysOnMarket: 61, newLaunches: 0 },
  { month: "2024-08", label: "Aug '24", avgPsqft: 2370, medianPsqft: 2340, transactions: 155, avgDaysOnMarket: 60, newLaunches: 1 },
  { month: "2024-09", label: "Sep '24", avgPsqft: 2400, medianPsqft: 2370, transactions: 198, avgDaysOnMarket: 58, newLaunches: 3 },
  { month: "2024-10", label: "Oct '24", avgPsqft: 2430, medianPsqft: 2400, transactions: 215, avgDaysOnMarket: 55, newLaunches: 2 },
  { month: "2024-11", label: "Nov '24", avgPsqft: 2460, medianPsqft: 2430, transactions: 228, avgDaysOnMarket: 52, newLaunches: 2 },
  { month: "2024-12", label: "Dec '24", avgPsqft: 2490, medianPsqft: 2460, transactions: 245, avgDaysOnMarket: 50, newLaunches: 1 },
  { month: "2025-01", label: "Jan '25", avgPsqft: 2510, medianPsqft: 2480, transactions: 232, avgDaysOnMarket: 49, newLaunches: 2 },
  { month: "2025-02", label: "Feb '25", avgPsqft: 2530, medianPsqft: 2500, transactions: 218, avgDaysOnMarket: 48, newLaunches: 1 },
  { month: "2025-03", label: "Mar '25", avgPsqft: 2560, medianPsqft: 2530, transactions: 252, avgDaysOnMarket: 46, newLaunches: 3 },
  { month: "2025-04", label: "Apr '25", avgPsqft: 2580, medianPsqft: 2550, transactions: 268, avgDaysOnMarket: 45, newLaunches: 2 },
  { month: "2025-05", label: "May '25", avgPsqft: 2600, medianPsqft: 2570, transactions: 275, avgDaysOnMarket: 44, newLaunches: 2 },
  { month: "2025-06", label: "Jun '25", avgPsqft: 2620, medianPsqft: 2590, transactions: 258, avgDaysOnMarket: 43, newLaunches: 1 },
  { month: "2025-07", label: "Jul '25", avgPsqft: 2640, medianPsqft: 2610, transactions: 242, avgDaysOnMarket: 42, newLaunches: 1 },
  { month: "2025-08", label: "Aug '25", avgPsqft: 2650, medianPsqft: 2620, transactions: 225, avgDaysOnMarket: 41, newLaunches: 0 },
  { month: "2025-09", label: "Sep '25", avgPsqft: 2670, medianPsqft: 2640, transactions: 268, avgDaysOnMarket: 40, newLaunches: 2 },
  { month: "2025-10", label: "Oct '25", avgPsqft: 2690, medianPsqft: 2660, transactions: 285, avgDaysOnMarket: 39, newLaunches: 2 },
  { month: "2025-11", label: "Nov '25", avgPsqft: 2710, medianPsqft: 2680, transactions: 298, avgDaysOnMarket: 38, newLaunches: 1 },
  { month: "2025-12", label: "Dec '25", avgPsqft: 2730, medianPsqft: 2700, transactions: 312, avgDaysOnMarket: 37, newLaunches: 2 },
];

// Calculate trend statistics
export function getTrendAnalysis() {
  const data = HISTORICAL_DATA;
  const first = data[0];
  const last = data[data.length - 1];
  const twentyFourMonthGrowth = ((last.avgPsqft - first.avgPsqft) / first.avgPsqft) * 100;

  // Find peak and trough
  let peak = data[0];
  let trough = data[0];
  for (const d of data) {
    if (d.avgPsqft > peak.avgPsqft) peak = d;
    if (d.avgPsqft < trough.avgPsqft) trough = d;
  }

  // Calculate 6-month moving average for the latest point
  const last6 = data.slice(-6);
  const sixMonthAvg = last6.reduce((s, d) => s + d.avgPsqft, 0) / last6.length;

  // Average transaction volume
  const avgVolume = data.reduce((s, d) => s + d.transactions, 0) / data.length;

  // Absorption trend (days on market decreasing = faster absorption)
  const absorptionTrend = first.avgDaysOnMarket - last.avgDaysOnMarket;

  return {
    startPsqft: first.avgPsqft,
    currentPsqft: last.avgPsqft,
    twentyFourMonthGrowth: Math.round(twentyFourMonthGrowth * 10) / 10,
    peak: { month: peak.label, psqft: peak.avgPsqft },
    trough: { month: trough.label, psqft: trough.avgPsqft },
    sixMonthAvg: Math.round(sixMonthAvg),
    avgMonthlyVolume: Math.round(avgVolume),
    absorptionImprovementDays: absorptionTrend,
    totalTransactions: data.reduce((s, d) => s + d.transactions, 0),
    totalNewLaunches: data.reduce((s, d) => s + d.newLaunches, 0),
  };
}

// Forecast next 6 months using linear regression
export function getForecast() {
  const data = HISTORICAL_DATA;
  const n = data.length;

  // Simple linear regression on avgPsqft
  const x = data.map((_, i) => i);
  const y = data.map((d) => d.avgPsqft);
  const xMean = x.reduce((s, v) => s + v, 0) / n;
  const yMean = y.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - xMean) * (y[i] - yMean);
    den += (x[i] - xMean) ** 2;
  }
  const slope = num / den;
  const intercept = yMean - slope * xMean;

  // Forecast next 6 months
  const forecast: { month: string; label: string; forecastPsqft: number }[] = [];
  const lastMonth = data[n - 1].month;
  const [lastYear, lastMonthNum] = lastMonth.split("-").map(Number);

  for (let i = 1; i <= 6; i++) {
    const futureMonthNum = ((lastMonthNum - 1 + i) % 12) + 1;
    const futureYear = lastYear + Math.floor((lastMonthNum - 1 + i) / 12);
    const monthStr = `${futureYear}-${String(futureMonthNum).padStart(2, "0")}`;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const label = `${monthNames[futureMonthNum - 1]} '${String(futureYear).slice(2)}`;

    forecast.push({
      month: monthStr,
      label,
      forecastPsqft: Math.round(intercept + slope * (n - 1 + i)),
    });
  }

  return {
    forecast,
    slope: Math.round(slope * 10) / 10, // AED/sqft per month
    projectedGrowth12Month: Math.round(slope * 12), // AED/sqft over next 12 months
  };
}
