"use client";
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { fetchMarketingData } from '../../src/lib/api';
import { MarketingData } from '../../src/types/marketing';
import { Navbar } from '../../src/components/ui/navbar';
import { Footer } from '../../src/components/ui/footer';
import { CardMetric } from '../../src/components/ui/card-metric';
import { Table } from '../../src/components/ui/table';
import { MapPin, DollarSign, TrendingUp, Activity, Globe } from 'lucide-react';

const BubbleMap = dynamic(
  () => import('../../src/components/ui/bubble-map').then(mod => ({ default: mod.BubbleMap })),
  { ssr: false, loading: () => <div className="h-96 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400">Loading map...</div> }
);

export default function RegionView() {
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

  // Aggregate regional performance from all campaigns
  const regionalData = useMemo(() => {
    const regionMap = new Map<string, { 
      country: string; 
      spend: number; 
      revenue: number; 
      impressions: number; 
      clicks: number; 
      conversions: number;
      ctr: number;
      conversion_rate: number;
      roas: number;
    }>();
    
    if (!marketingData?.campaigns) return { regions: [], totalRegions: 0, totalSpend: 0, totalRevenue: 0 };

    let totalSpend = 0;
    let totalRevenue = 0;

    for (const campaign of marketingData.campaigns) {
      if (!Array.isArray(campaign.regional_performance)) continue;
      
      for (const region of campaign.regional_performance) {
        const regionKey = region.region;
        const spend = Number(region.spend) || 0;
        const revenue = Number(region.revenue) || 0;
        const impressions = Number(region.impressions) || 0;
        const clicks = Number(region.clicks) || 0;
        const conversions = Number(region.conversions) || 0;

        totalSpend += spend;
        totalRevenue += revenue;

        const curr = regionMap.get(regionKey) || { 
          country: region.country,
          spend: 0, 
          revenue: 0, 
          impressions: 0, 
          clicks: 0, 
          conversions: 0,
          ctr: 0,
          conversion_rate: 0,
          roas: 0
        };
        
        curr.spend += spend;
        curr.revenue += revenue;
        curr.impressions += impressions;
        curr.clicks += clicks;
        curr.conversions += conversions;
        
        regionMap.set(regionKey, curr);
      }
    }

    // Calculate derived metrics and convert to array
    const regions = Array.from(regionMap.entries()).map(([region, data]) => {
      const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
      const conversion_rate = data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0;
      const roas = data.spend > 0 ? data.revenue / data.spend : 0;
      
      return {
        region,
        country: data.country,
        spend: data.spend,
        revenue: data.revenue,
        impressions: data.impressions,
        clicks: data.clicks,
        conversions: data.conversions,
        ctr,
        conversion_rate,
        roas
      };
    }).sort((a, b) => b.revenue - a.revenue);

    return { regions, totalRegions: regions.length, totalSpend, totalRevenue };
  }, [marketingData]);

  // Prepare bubble map data for revenue
  const revenueMapData = useMemo(() => {
    return regionalData.regions.map(r => ({
      region: r.region,
      country: r.country,
      value: r.revenue,
      lat: 0, // Will be calculated by component
      lng: 0
    }));
  }, [regionalData.regions]);

  // Prepare bubble map data for spend
  const spendMapData = useMemo(() => {
    return regionalData.regions.map(r => ({
      region: r.region,
      country: r.country,
      value: r.spend,
      lat: 0,
      lng: 0
    }));
  }, [regionalData.regions]);

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
                <h1 className="text-3xl md:text-5xl font-bold">Regional Performance</h1>
              )}
            </div>
          </div>
        </section>

        <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {/* Summary metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <CardMetric
              title="Total Regions"
              value={regionalData.totalRegions}
              icon={<Globe className="h-5 w-5" />}
            />
            
            <CardMetric
              title="Total Spend"
              value={`$${Math.round(regionalData.totalSpend).toLocaleString()}`}
              icon={<DollarSign className="h-5 w-5" />}
            />
            
            <CardMetric
              title="Total Revenue"
              value={`$${Math.round(regionalData.totalRevenue).toLocaleString()}`}
              icon={<TrendingUp className="h-5 w-5" />}
              className="text-green-400"
            />
            
            <CardMetric
              title="Average ROAS"
              value={regionalData.totalSpend > 0 ? `${(regionalData.totalRevenue / regionalData.totalSpend).toFixed(2)}x` : 'N/A'}
              icon={<Activity className="h-5 w-5" />}
              className="text-blue-400"
            />
          </div>

          {/* Bubble Map */}
          <div className="mb-6">
            <BubbleMap
              title="Revenue by Region"
              data={revenueMapData}
              height={500}
              bubbleColor="#10B981"
              formatValue={(val) => `$${Math.round(val).toLocaleString()}`}
            />
          </div>

          {/* Regional Performance Table */}
          <div className="mb-6">
            <Table
              title="Regional Performance Details"
              showIndex={true}
              maxHeight="400px"
              columns={[
                { key: 'region', header: 'Region', width: '12%', sortable: true, sortType: 'string' },
                { key: 'country', header: 'Country', width: '10%', sortable: true, sortType: 'string' },
                { key: 'impressions', header: 'Impressions', width: '11%', align: 'right', sortable: true, sortType: 'number', render: (v) => v.toLocaleString() },
                { key: 'clicks', header: 'Clicks', width: '9%', align: 'right', sortable: true, sortType: 'number', render: (v) => v.toLocaleString() },
                { key: 'conversions', header: 'Conversions', width: '10%', align: 'right', sortable: true, sortType: 'number' },
                { key: 'spend', header: 'Spend', width: '11%', align: 'right', sortable: true, sortType: 'number', render: (v) => `$${Math.round(v).toLocaleString()}` },
                { key: 'revenue', header: 'Revenue', width: '11%', align: 'right', sortable: true, sortType: 'number', render: (v) => <span className="text-green-400 font-medium">${Math.round(v).toLocaleString()}</span> },
                { key: 'ctr', header: 'CTR', width: '8%', align: 'right', sortable: true, sortType: 'number', render: (v) => `${v.toFixed(2)}%` },
                { key: 'conversion_rate', header: 'Conv. Rate', width: '9%', align: 'right', sortable: true, sortType: 'number', render: (v) => `${v.toFixed(2)}%` },
                { key: 'roas', header: 'ROAS', width: '9%', align: 'right', sortable: true, sortType: 'number', render: (v) => <span className="text-blue-400 font-medium">{v.toFixed(1)}x</span> },
              ]}
              data={regionalData.regions}
              defaultSort={{ key: 'revenue', direction: 'desc' }}
              emptyMessage="No regional data available"
            />
          </div>

          {/* Additional note */}
          <div className="text-gray-400 text-sm">
            Data aggregated from regional_performance across all campaigns. Bubble size represents the magnitude of the metric value.
          </div>
        </div>
        
        <Footer />
      </div>
    </div>
  );
}
