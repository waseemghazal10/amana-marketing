"use client";
import { useState, useEffect, useMemo } from 'react';
import { fetchMarketingData } from '../../src/lib/api';
import { MarketingData } from '../../src/types/marketing';
import { Navbar } from '../../src/components/ui/navbar';
import { CardMetric } from '../../src/components/ui/card-metric';
import { Footer } from '../../src/components/ui/footer';
import { Mars, Venus, DollarSign, TrendingUp, Users } from 'lucide-react';


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
