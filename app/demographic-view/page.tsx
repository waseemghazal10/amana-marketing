"use client";
import { useState, useEffect, useMemo } from 'react';
import { fetchMarketingData } from '../../src/lib/api';
import { MarketingData } from '../../src/types/marketing';
import { Navbar } from '../../src/components/ui/navbar';
import { CardMetric } from '../../src/components/ui/card-metric';
import { Footer } from '../../src/components/ui/footer';
import { Mars, Venus, DollarSign, TrendingUp, Users } from 'lucide-react';
import { BarChart as UiBarChart } from '../../src/components/ui/bar-chart';
import { Table } from '../../src/components/ui/table';


export default function DemographicView() {
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

  // Aggregate demographic metrics for Male / Female
  const { male, female } = useMemo(() => {
    const totals = {
      male: { clicks: 0, spend: 0, revenue: 0 },
      female: { clicks: 0, spend: 0, revenue: 0 },
    };

    if (!marketingData?.campaigns) return totals;

    for (const campaign of marketingData.campaigns) {
      const spend = Number(campaign.spend) || 0;
      const revenue = Number(campaign.revenue) || 0;

      if (Array.isArray(campaign.demographic_breakdown) && campaign.demographic_breakdown.length > 0) {
        for (const demo of campaign.demographic_breakdown) {
          const gender = String(demo.gender || '').toLowerCase();
          const pct = Number(demo.percentage_of_audience) || 0;

          // clicks provided per breakdown when available
          const clicks = Number(demo.performance?.clicks) || 0;

          const allocSpend = (pct / 100) * spend;
          const allocRevenue = (pct / 100) * revenue;

          if (gender.includes('male')) {
            totals.male.clicks += clicks;
            totals.male.spend += allocSpend;
            totals.male.revenue += allocRevenue;
          } else if (gender.includes('female')) {
            totals.female.clicks += clicks;
            totals.female.spend += allocSpend;
            totals.female.revenue += allocRevenue;
          }
        }
      }
    }

    return totals;
  }, [marketingData]);

  // Aggregate spend/revenue by age group (across all genders)
  const ageSpendRevenue = useMemo(() => {
    const map = new Map<string, { spend: number; revenue: number }>();
    if (!marketingData?.campaigns) return map;

    for (const campaign of marketingData.campaigns) {
      const spend = Number(campaign.spend) || 0;
      const revenue = Number(campaign.revenue) || 0;
      if (!Array.isArray(campaign.demographic_breakdown)) continue;

      for (const demo of campaign.demographic_breakdown) {
        const age = demo.age_group?.trim();
        if (!age) continue;
        const pct = Number(demo.percentage_of_audience) || 0;
        const allocSpend = (pct / 100) * spend;
        const allocRevenue = (pct / 100) * revenue;
        const curr = map.get(age) || { spend: 0, revenue: 0 };
        curr.spend += allocSpend;
        curr.revenue += allocRevenue;
        map.set(age, curr);
      }
    }

    return map;
  }, [marketingData]);

  // Aggregate performance by age group separated by gender
  const { maleAgeRows, femaleAgeRows } = useMemo(() => {
    const maleMap = new Map<string, { impressions: number; clicks: number; conversions: number }>();
    const femaleMap = new Map<string, { impressions: number; clicks: number; conversions: number }>();

    if (marketingData?.campaigns) {
      for (const campaign of marketingData.campaigns) {
        if (!Array.isArray(campaign.demographic_breakdown)) continue;
        for (const demo of campaign.demographic_breakdown) {
          const gender = String(demo.gender || '').toLowerCase();
          const age = demo.age_group?.trim();
          if (!age) continue;

          const imp = Number(demo.performance?.impressions) || 0;
          const clk = Number(demo.performance?.clicks) || 0;
          const conv = Number(demo.performance?.conversions) || 0;

          if (gender.includes('male')) {
            const curr = maleMap.get(age) || { impressions: 0, clicks: 0, conversions: 0 };
            curr.impressions += imp;
            curr.clicks += clk;
            curr.conversions += conv;
            maleMap.set(age, curr);
          } else if (gender.includes('female')) {
            const curr = femaleMap.get(age) || { impressions: 0, clicks: 0, conversions: 0 };
            curr.impressions += imp;
            curr.clicks += clk;
            curr.conversions += conv;
            femaleMap.set(age, curr);
          }
        }
      }
    }

    const toRows = (m: Map<string, { impressions: number; clicks: number; conversions: number }>) => {
      const rows = Array.from(m.entries()).map(([age_group, v]) => {
        const ctr = v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0;
        const conversion_rate = v.clicks > 0 ? (v.conversions / v.clicks) * 100 : 0;
        return {
          age_group,
          impressions: v.impressions,
          clicks: v.clicks,
          conversions: v.conversions,
          ctr,
          conversion_rate,
        };
      });
      rows.sort((a, b) => {
        const sa = parseInt((a.age_group.match(/\d+/)?.[0] || '999'), 10);
        const sb = parseInt((b.age_group.match(/\d+/)?.[0] || '999'), 10);
        return sa - sb;
      });
      return rows;
    };

    return { maleAgeRows: toRows(maleMap), femaleAgeRows: toRows(femaleMap) };
  }, [marketingData]);

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
                <h1 className="text-3xl md:text-5xl font-bold">Demographic View</h1>
              )}
            </div>
          </div>
        </section>

        <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {/* Metrics grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <CardMetric
              title="Total Clicks by Males"
              value={male.clicks}
              icon={<Mars className="h-5 w-5" />}
            />

            <CardMetric
              title="Total Spend by Males"
              value={`$${Math.round(male.spend).toLocaleString()}`}
              icon={<DollarSign className="h-5 w-5" />}
            />

            <CardMetric
              title="Total Revenue by Males"
              value={`$${Math.round(male.revenue).toLocaleString()}`}
              icon={<TrendingUp className="h-5 w-5" />}
            />

            <CardMetric
              title="Total Clicks by Females"
              value={female.clicks}
              icon={<Venus className="h-5 w-5" />}
            />

            <CardMetric
              title="Total Spend by Females"
              value={`$${Math.round(female.spend).toLocaleString()}`}
              icon={<DollarSign className="h-5 w-5" />}
            />

            <CardMetric
              title="Total Revenue by Females"
              value={`$${Math.round(female.revenue).toLocaleString()}`}
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </div>

          {/* Bar charts: Spend and Revenue by Age Group */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <UiBarChart
              title="Total Spend by Age Group"
              data={Array.from(ageSpendRevenue.entries()).map(([age, v]) => ({
                label: age,
                value: Math.round(v.spend),
                color: '#3B82F6',
              })).sort((a, b) => parseInt((a.label.match(/\d+/)?.[0] || '999')) - parseInt((b.label.match(/\d+/)?.[0] || '999')))}
              formatValue={(val) => `$${val.toLocaleString()}`}
            />

            <UiBarChart
              title="Total Revenue by Age Group"
              data={Array.from(ageSpendRevenue.entries()).map(([age, v]) => ({
                label: age,
                value: Math.round(v.revenue),
                color: '#10B981',
              })).sort((a, b) => parseInt((a.label.match(/\d+/)?.[0] || '999')) - parseInt((b.label.match(/\d+/)?.[0] || '999')))}
              formatValue={(val) => `$${val.toLocaleString()}`}
            />
          </div>

          {/* Tables: Performance by Age Group (Male / Female) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <Table
              title="Campaign Performance by Male Age Groups"
              showIndex={true}
              maxHeight="360px"
              columns={[
                { key: 'age_group', header: 'Age Group', width: '18%', sortable: true, sortType: 'string' },
                { key: 'impressions', header: 'Impressions', width: '16%', align: 'right', sortable: true, sortType: 'number' },
                { key: 'clicks', header: 'Clicks', width: '14%', align: 'right', sortable: true, sortType: 'number' },
                { key: 'conversions', header: 'Conversions', width: '16%', align: 'right', sortable: true, sortType: 'number' },
                { key: 'ctr', header: 'CTR', width: '12%', align: 'right', sortable: true, sortType: 'number', render: (v) => `${v.toFixed(2)}%` },
                { key: 'conversion_rate', header: 'Conversion Rate', width: '18%', align: 'right', sortable: true, sortType: 'number', render: (v) => `${v.toFixed(2)}%` },
              ]}
              data={maleAgeRows}
              defaultSort={{ key: 'impressions', direction: 'desc' }}
            />

            <Table
              title="Campaign Performance by Female Age Groups"
              showIndex={true}
              maxHeight="360px"
              columns={[
                { key: 'age_group', header: 'Age Group', width: '18%', sortable: true, sortType: 'string' },
                { key: 'impressions', header: 'Impressions', width: '16%', align: 'right', sortable: true, sortType: 'number' },
                { key: 'clicks', header: 'Clicks', width: '14%', align: 'right', sortable: true, sortType: 'number' },
                { key: 'conversions', header: 'Conversions', width: '16%', align: 'right', sortable: true, sortType: 'number' },
                { key: 'ctr', header: 'CTR', width: '12%', align: 'right', sortable: true, sortType: 'number', render: (v) => `${v.toFixed(2)}%` },
                { key: 'conversion_rate', header: 'Conversion Rate', width: '18%', align: 'right', sortable: true, sortType: 'number', render: (v) => `${v.toFixed(2)}%` },
              ]}
              data={femaleAgeRows}
              defaultSort={{ key: 'impressions', direction: 'desc' }}
            />
          </div>

          {/* Small summary */}
          <div className="text-gray-400 text-sm">
            Data is aggregated from campaign demographic breakdowns. Spend and revenue are allocated proportionally by the demographic percentage where explicit per-demographic spend/revenue is not available.
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
