"use client";
import { useState, useEffect, useMemo } from 'react';
import { fetchMarketingData } from '../../src/lib/api';
import { MarketingData } from '../../src/types/marketing';
import { Navbar } from '../../src/components/ui/navbar';
import { Footer } from '../../src/components/ui/footer';
import { CardMetric } from '../../src/components/ui/card-metric';
import { Table } from '../../src/components/ui/table';
import { BarChart as UiBarChart } from '../../src/components/ui/bar-chart';
import { Monitor, Smartphone, Tablet, DollarSign, TrendingUp, MousePointer, Activity } from 'lucide-react';

export default function DeviceView() {
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

  // Aggregate device performance from all campaigns
  const deviceData = useMemo(() => {
    const deviceMap = new Map<string, { 
      spend: number; 
      revenue: number; 
      impressions: number; 
      clicks: number; 
      conversions: number;
      ctr: number;
      conversion_rate: number;
      roas: number;
      traffic_percentage: number;
    }>();
    
    if (!marketingData?.campaigns) return { 
      devices: [], 
      totalSpend: 0, 
      totalRevenue: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalConversions: 0
    };

    let totalSpend = 0;
    let totalRevenue = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;

    for (const campaign of marketingData.campaigns) {
      if (!Array.isArray(campaign.device_performance)) continue;
      
      for (const device of campaign.device_performance) {
        const deviceName = device.device;
        const spend = Number(device.spend) || 0;
        const revenue = Number(device.revenue) || 0;
        const impressions = Number(device.impressions) || 0;
        const clicks = Number(device.clicks) || 0;
        const conversions = Number(device.conversions) || 0;

        totalSpend += spend;
        totalRevenue += revenue;
        totalImpressions += impressions;
        totalClicks += clicks;
        totalConversions += conversions;

        const curr = deviceMap.get(deviceName) || { 
          spend: 0, 
          revenue: 0, 
          impressions: 0, 
          clicks: 0, 
          conversions: 0,
          ctr: 0,
          conversion_rate: 0,
          roas: 0,
          traffic_percentage: 0
        };
        
        curr.spend += spend;
        curr.revenue += revenue;
        curr.impressions += impressions;
        curr.clicks += clicks;
        curr.conversions += conversions;
        
        deviceMap.set(deviceName, curr);
      }
    }

    // Calculate derived metrics and convert to array
    const devices = Array.from(deviceMap.entries()).map(([device, data]) => {
      const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
      const conversion_rate = data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0;
      const roas = data.spend > 0 ? data.revenue / data.spend : 0;
      const traffic_percentage = totalImpressions > 0 ? (data.impressions / totalImpressions) * 100 : 0;
      
      return {
        device,
        spend: data.spend,
        revenue: data.revenue,
        impressions: data.impressions,
        clicks: data.clicks,
        conversions: data.conversions,
        ctr,
        conversion_rate,
        roas,
        traffic_percentage
      };
    }).sort((a, b) => b.revenue - a.revenue);

    return { 
      devices, 
      totalSpend, 
      totalRevenue,
      totalImpressions,
      totalClicks,
      totalConversions
    };
  }, [marketingData]);

  // Prepare data for bar charts
  const revenueChartData = useMemo(() => {
    return deviceData.devices.map(d => ({
      label: d.device,
      value: d.revenue
    }));
  }, [deviceData.devices]);

  const spendChartData = useMemo(() => {
    return deviceData.devices.map(d => ({
      label: d.device,
      value: d.spend
    }));
  }, [deviceData.devices]);

  const trafficChartData = useMemo(() => {
    return deviceData.devices.map(d => ({
      label: d.device,
      value: d.traffic_percentage
    }));
  }, [deviceData.devices]);

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
                <h1 className="text-3xl md:text-5xl font-bold">Device Performance</h1>
              )}
            </div>
          </div>
        </section>

        <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {/* Summary metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <CardMetric
              title="Total Spend"
              value={`$${Math.round(deviceData.totalSpend).toLocaleString()}`}
              icon={<DollarSign className="h-5 w-5" />}
            />
            
            <CardMetric
              title="Total Revenue"
              value={`$${Math.round(deviceData.totalRevenue).toLocaleString()}`}
              icon={<TrendingUp className="h-5 w-5" />}
              className="text-green-400"
            />
            
            <CardMetric
              title="Total Clicks"
              value={deviceData.totalClicks.toLocaleString()}
              icon={<MousePointer className="h-5 w-5" />}
              className="text-blue-400"
            />
            
            <CardMetric
              title="Total Conversions"
              value={deviceData.totalConversions.toLocaleString()}
              icon={<Activity className="h-5 w-5" />}
              className="text-purple-400"
            />
          </div>

          {/* Device-specific cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {deviceData.devices.map((device) => (
              <div key={device.device} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{device.device}</h3>
                  {device.device === 'Mobile' && <Smartphone className="h-6 w-6 text-blue-400" />}
                  {device.device === 'Desktop' && <Monitor className="h-6 w-6 text-green-400" />}
                  {device.device === 'Tablet' && <Tablet className="h-6 w-6 text-purple-400" />}
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Traffic Share</span>
                    <span className="text-sm font-semibold text-white">{device.traffic_percentage.toFixed(1)}%</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Revenue</span>
                    <span className="text-sm font-semibold text-green-400">${Math.round(device.revenue).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">ROAS</span>
                    <span className="text-sm font-semibold text-blue-400">{device.roas.toFixed(2)}x</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Conv. Rate</span>
                    <span className="text-sm font-semibold text-purple-400">{device.conversion_rate.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bar Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <UiBarChart
              title="Revenue by Device"
              data={revenueChartData}
              height={300}
              formatValue={(val: number) => `$${Math.round(val).toLocaleString()}`}
            />
            
            <UiBarChart
              title="Spend by Device"
              data={spendChartData}
              height={300}
              formatValue={(val: number) => `$${Math.round(val).toLocaleString()}`}
            />
          </div>

          <div className="mb-6">
            <UiBarChart
              title="Traffic Share by Device"
              data={trafficChartData}
              height={300}
              formatValue={(val: number) => `${val.toFixed(1)}%`}
            />
          </div>

          {/* Device Performance Table */}
          <div className="mb-6">
            <Table
              title="Device Performance Details"
              showIndex={true}
              maxHeight="400px"
              columns={[
                { key: 'device', header: 'Device', width: '15%', sortable: true, sortType: 'string' },
                { key: 'impressions', header: 'Impressions', width: '12%', align: 'right', sortable: true, sortType: 'number', render: (v) => v.toLocaleString() },
                { key: 'clicks', header: 'Clicks', width: '10%', align: 'right', sortable: true, sortType: 'number', render: (v) => v.toLocaleString() },
                { key: 'conversions', header: 'Conversions', width: '11%', align: 'right', sortable: true, sortType: 'number' },
                { key: 'spend', header: 'Spend', width: '12%', align: 'right', sortable: true, sortType: 'number', render: (v) => `$${Math.round(v).toLocaleString()}` },
                { key: 'revenue', header: 'Revenue', width: '12%', align: 'right', sortable: true, sortType: 'number', render: (v) => <span className="text-green-400 font-medium">${Math.round(v).toLocaleString()}</span> },
                { key: 'ctr', header: 'CTR', width: '9%', align: 'right', sortable: true, sortType: 'number', render: (v) => `${v.toFixed(2)}%` },
                { key: 'conversion_rate', header: 'Conv. Rate', width: '10%', align: 'right', sortable: true, sortType: 'number', render: (v) => `${v.toFixed(2)}%` },
                { key: 'roas', header: 'ROAS', width: '9%', align: 'right', sortable: true, sortType: 'number', render: (v) => <span className="text-blue-400 font-medium">{v.toFixed(2)}x</span> },
              ]}
              data={deviceData.devices}
              defaultSort={{ key: 'revenue', direction: 'desc' }}
              emptyMessage="No device data available"
            />
          </div>

          {/* Additional note */}
          <div className="text-gray-400 text-sm">
            Data aggregated from device_performance across all campaigns. Compare Desktop vs Mobile vs Tablet performance.
          </div>
        </div>
        
        <Footer />
      </div>
    </div>
  );
}
