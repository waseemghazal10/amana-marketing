"use client";
import { useState, useEffect, useMemo } from 'react';
import { fetchMarketingData } from '../../src/lib/api';
import { MarketingData } from '../../src/types/marketing';
import { Navbar } from '../../src/components/ui/navbar';
import { Footer } from '../../src/components/ui/footer';
import { LineChart } from '../../src/components/ui/line-chart';
import { CardMetric } from '../../src/components/ui/card-metric';
import { Calendar, DollarSign, TrendingUp, Activity } from 'lucide-react';

export default function WeeklyView() {
  const [marketingData, setMarketingData] = useState<MarketingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchMarketingData();
        setMarketingData(data);
      } catch (err) {
        console.error('Failed loading marketing data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Aggregate weekly performance from all campaigns
  const weeklyData = useMemo(() => {
    const weekMap = new Map<string, { spend: number; revenue: number; impressions: number; clicks: number; conversions: number }>();
    
    if (!marketingData?.campaigns) return { weeks: [], totalSpend: 0, totalRevenue: 0 };

    let totalSpend = 0;
    let totalRevenue = 0;

    for (const campaign of marketingData.campaigns) {
      if (!Array.isArray(campaign.weekly_performance)) continue;
      
      for (const week of campaign.weekly_performance) {
        const weekLabel = week.week_start;
        const spend = Number(week.spend) || 0;
        const revenue = Number(week.revenue) || 0;
        const impressions = Number(week.impressions) || 0;
        const clicks = Number(week.clicks) || 0;
        const conversions = Number(week.conversions) || 0;

        totalSpend += spend;
        totalRevenue += revenue;

        const curr = weekMap.get(weekLabel) || { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
        curr.spend += spend;
        curr.revenue += revenue;
        curr.impressions += impressions;
        curr.clicks += clicks;
        curr.conversions += conversions;
        weekMap.set(weekLabel, curr);
      }
    }

    // Convert to sorted array
    const weeks = Array.from(weekMap.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week.localeCompare(b.week));

    return { weeks, totalSpend, totalRevenue };
  }, [marketingData]);

  // Prepare line chart data
  const chartSeries = useMemo(() => {
    return [
      {
        name: 'Revenue',
        data: weeklyData.weeks.map(w => ({ label: w.week, value: w.revenue })),
        color: '#10B981'
      },
      {
        name: 'Spend',
        data: weeklyData.weeks.map(w => ({ label: w.week, value: w.spend })),
        color: '#3B82F6'
      }
    ];
  }, [weeklyData.weeks]);

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-900">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Navbar />
      
      <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out">
        <section className="bg-gradient-to-r from-gray-800 to-gray-700 text-white py-12">
          <div className="px-6 lg:px-8">
            <div className="text-center">
              {error ? (
                <div className="bg-red-900 border border-red-700 text-red-200 px-3 sm:px-4 py-3 rounded mb-4 max-w-2xl mx-auto text-sm sm:text-base">
                  Error loading data: {error}
                </div>
              ) : (
                <h1 className="text-3xl md:text-5xl font-bold">Weekly Performance</h1>
              )}
            </div>
          </div>
        </section>

        <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {/* Summary metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <CardMetric
              title="Total Weeks"
              value={weeklyData.weeks.length}
              icon={<Calendar className="h-5 w-5" />}
            />
            
            <CardMetric
              title="Total Spend"
              value={`$${Math.round(weeklyData.totalSpend).toLocaleString()}`}
              icon={<DollarSign className="h-5 w-5" />}
            />
            
            <CardMetric
              title="Total Revenue"
              value={`$${Math.round(weeklyData.totalRevenue).toLocaleString()}`}
              icon={<TrendingUp className="h-5 w-5" />}
              className="text-green-400"
            />
            
            <CardMetric
              title="Average ROAS"
              value={weeklyData.totalSpend > 0 ? `${(weeklyData.totalRevenue / weeklyData.totalSpend).toFixed(2)}x` : 'N/A'}
              icon={<Activity className="h-5 w-5" />}
              className="text-blue-400"
            />
          </div>

          {/* Line chart: Revenue and Spend by Week */}
          <div className="mb-6">
            <LineChart
              title="Revenue and Spend by Week"
              series={chartSeries}
              height={400}
              formatValue={(val) => `$${Math.round(val).toLocaleString()}`}
              formatLabel={(label) => {
                // Format date label (YYYY-MM-DD to MM/DD)
                const date = new Date(label);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
          </div>

          {/* Additional note */}
          <div className="text-gray-400 text-sm">
            Data aggregated from weekly_performance across all campaigns. Each point represents the sum of spend and revenue for that week.
          </div>
        </div>
        
        <Footer />
      </div>
    </div>
  );
}
