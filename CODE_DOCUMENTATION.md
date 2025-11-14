# Amana Marketing Dashboard - Code Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Component Breakdown](#component-breakdown)
4. [Page Implementations](#page-implementations)
5. [Data Flow](#data-flow)

---

## Project Overview

The Amana Marketing Dashboard is a Next.js 15 application that visualizes marketing campaign data across multiple dimensions (demographics, regions, devices, time). It uses React 19, TypeScript, and Tailwind CSS for a modern, responsive user experience.

---

## Architecture

### Tech Stack
- **Next.js 15**: App Router for file-based routing and server-side rendering
- **React 19**: Client components for interactivity
- **TypeScript**: Type safety across the application
- **Tailwind CSS**: Utility-first styling
- **React-Leaflet**: Interactive maps for geographic data
- **Lucide React**: Icon library

### Project Structure
```
app/
├── campaign-view/      # Campaign performance page
├── demographic-view/   # Age/gender analysis page
├── weekly-view/        # Time-series analysis page
├── region-view/        # Geographic performance page
├── device-view/        # Device comparison page
└── api/
    └── marketing-data/ # Proxy API route

src/
├── components/ui/      # Reusable UI components
├── lib/               # Utility functions
└── types/             # TypeScript definitions
```

---

## Component Breakdown

### 1. Navbar Component (`src/components/ui/navbar.tsx`)

#### Purpose
Provides persistent navigation across all pages with collapsible sidebar functionality.

#### Key Features
```typescript
const navigationItems: NavigationItem[] = [
  { id: "overview", name: "Overview", icon: Home, href: "/" },
  { id: "campaign-view", name: "Campaign View", icon: Target, href: "/campaign-view" },
  // ... more items
];
```

**How it works:**
- **State Management**: Uses `useState` for sidebar open/collapsed states and `usePathname` to track current route
- **Responsive Design**: Mobile hamburger menu converts to persistent sidebar on desktop (lg breakpoint)
- **Auto-highlighting**: Compares current pathname against navigation items to highlight active page
- **Collapse Feature**: Desktop users can minimize sidebar to icon-only view for more screen space

```typescript
useEffect(() => {
  setActiveItem(getActiveItem(pathname));
}, [pathname]);
```
This effect watches for route changes and updates the active navigation item automatically.

---

### 2. CardMetric Component (`src/components/ui/card-metric.tsx`)

#### Purpose
Displays key performance indicators in a consistent card format.

#### How it works
```typescript
export function CardMetric({ 
  title, 
  value, 
  icon, 
  subtitle, 
  trend, 
  className = "" 
}: CardMetricProps)
```

- **Icon Display**: Optional icon prop renders in the top-right corner
- **Trend Indicator**: Shows positive/negative change with colored arrows
- **Flexible Styling**: Accepts custom className for color variations (e.g., `text-green-400` for revenue)

**Visual Hierarchy:**
1. Title (small, gray) - metric name
2. Value (large, white) - the actual number
3. Subtitle (small, blue) - additional context
4. Trend (conditional) - percentage change with arrow

---

### 3. Table Component (`src/components/ui/table.tsx`)

#### Purpose
Renders sortable, paginated data tables with search functionality.

#### Key Features

**Sorting Logic:**
```typescript
const sortedData = useMemo(() => {
  if (!sortConfig.key) return searchedData;
  
  return [...searchedData].sort((a, b) => {
    const column = columns.find(col => col.key === sortConfig.key);
    if (!column?.sortType) return 0;
    
    // Numerical sorting
    if (column.sortType === 'number') {
      const diff = Number(a[sortConfig.key]) - Number(b[sortConfig.key]);
      return sortConfig.direction === 'asc' ? diff : -diff;
    }
    // String sorting
    // ...
  });
}, [searchedData, sortConfig, columns]);
```

**How it works:**
1. **Search**: Filters data based on searchable columns
2. **Sort**: Uses `useMemo` to efficiently sort data only when dependencies change
3. **Pagination**: Slices sorted data into pages of 10 rows
4. **Column Configuration**: Each column defines its type, alignment, and render function

**Render Props Pattern:**
```typescript
render: (v) => <span className="text-green-400">${v.toLocaleString()}</span>
```
This allows custom formatting per column while maintaining table structure.

---

### 4. BarChart Component (`src/components/ui/bar-chart.tsx`)

#### Purpose
Visualizes data as vertical bars with dynamic scaling.

#### How it works

**Dynamic Scaling:**
```typescript
const maxValue = Math.max(...data.map(item => item.value));
const barHeight = maxValue > 0 ? (item.value / maxValue) * (height - 60) : 0;
```
- Finds the maximum value in dataset
- Calculates each bar's height as a percentage of max value
- Reserves 60px for labels and spacing

**Responsive Layout:**
```typescript
<div className="flex items-end justify-between h-full gap-2">
  {data.map((item, index) => (
    <div className="flex flex-col items-center flex-1">
      {/* Bar */}
      <div style={{ height: `${barHeight}px` }} />
      {/* Label */}
    </div>
  ))}
</div>
```
- **Flexbox**: Distributes bars evenly across container width
- **items-end**: Aligns bars to bottom (bars grow upward)
- **flex-1**: Each bar takes equal width

---

### 5. LineChart Component (`src/components/ui/line-chart.tsx`)

#### Purpose
Displays time-series data as connected line graphs.

#### How it works

**SVG Path Generation:**
```typescript
const maxValue = Math.max(...datasets.flatMap(d => d.data.map(p => p.value)));

datasets.map(dataset => {
  const path = dataset.data.map((point, i) => {
    const x = (i / (dataset.data.length - 1)) * (width - 100) + 50;
    const y = height - 60 - (point.value / maxValue) * (height - 120);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
});
```

**SVG Commands:**
- **M** (MoveTo): Positions at first point without drawing
- **L** (LineTo): Draws straight line to next point
- **Coordinate System**: 
  - X: Evenly distributed based on data point count
  - Y: Inverted (SVG y=0 is top, we want low values at bottom)

**Multi-Series Support:**
```typescript
datasets.map((dataset, idx) => (
  <g key={idx}>
    <path d={path} stroke={dataset.color} fill="none" />
    {dataset.data.map((point, i) => (
      <circle cx={x} cy={y} r="4" fill={dataset.color} />
    ))}
  </g>
))
```
Each dataset gets its own `<g>` group with unique color for the line and points.

---

### 6. BubbleMap Component (`src/components/ui/bubble-map.tsx`)

#### Purpose
Renders an interactive world map with sized bubbles representing data values.

#### How it works

**Coordinate Mapping:**
```typescript
const getRegionCoordinates = (region: string, country: string) => {
  const locationMap: Record<string, { lat: number; lng: number }> = {
    'Dubai': { lat: 25.2048, lng: 55.2708 },
    'Doha': { lat: 25.2854, lng: 51.5310 },
    // ... more cities
  };
  
  // Try exact match first
  if (locationMap[region]) return locationMap[region];
  
  // Fallback to country defaults
  if (countryDefaults[country]) return countryDefaults[country];
  
  // Ultimate fallback
  return { lat: 0, lng: 0 };
};
```
This cascading lookup ensures every region gets valid coordinates.

**Bubble Sizing:**
```typescript
const maxValue = Math.max(...data.map(d => d.value));
const minValue = Math.min(...data.map(d => d.value));
const valueRange = maxValue - minValue || 1;

const bubbles = data.map(item => {
  const coords = getRegionCoordinates(item.region, item.country);
  const normalizedValue = (item.value - minValue) / valueRange;
  const radius = minBubbleSize + (normalizedValue * (maxBubbleSize - minBubbleSize));
  
  return { ...item, lat: coords.lat, lng: coords.lng, radius };
});
```

**Normalization Process:**
1. Calculate range (max - min)
2. Normalize each value to 0-1 scale
3. Map normalized value to pixel radius range (e.g., 10-50px)
4. Larger values = bigger bubbles

**React-Leaflet Integration:**
```typescript
<MapContainer center={[20, 0]} zoom={2}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  
  {bubbles.map((bubble, index) => (
    <CircleMarker
      center={[bubble.lat, bubble.lng]}
      radius={bubble.radius}
      pathOptions={{ fillColor: bubbleColor, fillOpacity: 0.7 }}
    >
      <Popup>
        <div>{bubble.region}: {formatValue(bubble.value)}</div>
      </Popup>
    </CircleMarker>
  ))}
</MapContainer>
```

**Client-Side Rendering:**
```typescript
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setIsClient(true);
}, []);

if (!isClient) return <div>Loading map...</div>;
```
Leaflet requires browser APIs (window, document), so we wait for hydration before rendering the map.

---

## Page Implementations

### 1. Demographic View (`app/demographic-view/page.tsx`)

#### Purpose
Analyzes campaign performance by age group and gender.

#### Data Aggregation Logic

**Male/Female Totals:**
```typescript
const maleClicks = useMemo(() => {
  let total = 0;
  for (const campaign of marketingData.campaigns) {
    for (const demo of campaign.demographic_breakdown) {
      if (demo.gender === 'Male') {
        const percentage = demo.percentage_of_audience / 100;
        total += campaign.clicks * percentage;
      }
    }
  }
  return Math.round(total);
}, [marketingData]);
```

**Why this calculation?**
- `demographic_breakdown` contains percentages, not absolute numbers
- We multiply campaign-level metrics by percentage to get segment values
- Example: If campaign has 1000 clicks and Males are 30% of audience, males contributed ~300 clicks

**Age Group Aggregation:**
```typescript
const ageSpendRevenue = useMemo(() => {
  const ageMap = new Map<string, { spend: number; revenue: number }>();
  
  for (const campaign of marketingData.campaigns) {
    for (const demo of campaign.demographic_breakdown) {
      const key = demo.age_group;
      const percentage = demo.percentage_of_audience / 100;
      
      const curr = ageMap.get(key) || { spend: 0, revenue: 0 };
      curr.spend += campaign.spend * percentage;
      curr.revenue += campaign.revenue * percentage;
      ageMap.set(key, curr);
    }
  }
  
  return Array.from(ageMap.entries()).map(([age, data]) => ({
    label: age,
    spend: data.spend,
    revenue: data.revenue
  }));
}, [marketingData]);
```

**Map Pattern:**
1. Create a Map to group by age group
2. For each demographic segment, allocate spend/revenue proportionally
3. Convert Map to array for rendering
4. This handles campaigns with overlapping age groups correctly

---

### 2. Weekly View (`app/weekly-view/page.tsx`)

#### Purpose
Shows time-series trends of marketing performance.

#### Data Aggregation

**Weekly Grouping:**
```typescript
const weeklyData = useMemo(() => {
  const weekMap = new Map<string, {
    revenue: number;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }>();
  
  for (const campaign of marketingData.campaigns) {
    if (!Array.isArray(campaign.weekly_performance)) continue;
    
    for (const week of campaign.weekly_performance) {
      const weekKey = week.week_start;
      
      const curr = weekMap.get(weekKey) || {
        revenue: 0, spend: 0, impressions: 0, clicks: 0, conversions: 0
      };
      
      curr.revenue += Number(week.revenue) || 0;
      curr.spend += Number(week.spend) || 0;
      // ... sum other metrics
      
      weekMap.set(weekKey, curr);
    }
  }
  
  return Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0])) // Sort by date
    .map(([week, data]) => ({ week, ...data }));
}, [marketingData]);
```

**Key Points:**
- Uses `week_start` as the grouping key (e.g., "2024-10-01")
- Multiple campaigns may have data for the same week → sum them
- Sorts chronologically for line chart rendering
- Returns array in time order for proper line connections

**Line Chart Data Preparation:**
```typescript
const chartSeries = [
  {
    name: 'Revenue',
    data: weeklyData.map((w, i) => ({ label: `Week ${i + 1}`, value: w.revenue })),
    color: '#10B981'
  },
  {
    name: 'Spend',
    data: weeklyData.map((w, i) => ({ label: `Week ${i + 1}`, value: w.spend })),
    color: '#3B82F6'
  }
];
```
LineChart component accepts multiple datasets, each with its own color.

---

### 3. Region View (`app/region-view/page.tsx`)

#### Purpose
Visualizes geographic distribution of campaign performance.

#### Data Aggregation

**Regional Grouping:**
```typescript
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
  
  for (const campaign of marketingData.campaigns) {
    if (!Array.isArray(campaign.regional_performance)) continue;
    
    for (const region of campaign.regional_performance) {
      const regionKey = region.region;
      
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
      
      curr.spend += Number(region.spend) || 0;
      curr.revenue += Number(region.revenue) || 0;
      curr.impressions += Number(region.impressions) || 0;
      curr.clicks += Number(region.clicks) || 0;
      curr.conversions += Number(region.conversions) || 0;
      
      regionMap.set(regionKey, curr);
    }
  }
  
  // Calculate derived metrics
  const regions = Array.from(regionMap.entries()).map(([region, data]) => {
    const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
    const conversion_rate = data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0;
    const roas = data.spend > 0 ? data.revenue / data.spend : 0;
    
    return { region, country: data.country, ...data, ctr, conversion_rate, roas };
  }).sort((a, b) => b.revenue - a.revenue);
  
  return { regions, totalRegions: regions.length, totalSpend, totalRevenue };
}, [marketingData]);
```

**Derived Metrics Calculation:**
- **CTR** (Click-Through Rate): `(clicks / impressions) × 100`
- **Conversion Rate**: `(conversions / clicks) × 100`
- **ROAS** (Return on Ad Spend): `revenue / spend`

These are calculated AFTER aggregation to ensure accurate rates across campaigns.

**BubbleMap Data Preparation:**
```typescript
const revenueMapData = useMemo(() => {
  return regionalData.regions.map(r => ({
    region: r.region,
    country: r.country,
    value: r.revenue,
    lat: 0,  // Will be calculated by BubbleMap component
    lng: 0
  }));
}, [regionalData.regions]);
```
We pass placeholder lat/lng; the BubbleMap component looks up real coordinates using `getRegionCoordinates()`.

---

### 4. Device View (`app/device-view/page.tsx`)

#### Purpose
Compares campaign performance across Desktop, Mobile, and Tablet devices.

#### Data Aggregation

**Device Grouping:**
```typescript
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
  
  let totalImpressions = 0;
  
  for (const campaign of marketingData.campaigns) {
    if (!Array.isArray(campaign.device_performance)) continue;
    
    for (const device of campaign.device_performance) {
      const deviceName = device.device;
      
      const curr = deviceMap.get(deviceName) || {
        spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0,
        ctr: 0, conversion_rate: 0, roas: 0, traffic_percentage: 0
      };
      
      curr.impressions += Number(device.impressions) || 0;
      totalImpressions += Number(device.impressions) || 0;
      // ... sum other metrics
      
      deviceMap.set(deviceName, curr);
    }
  }
  
  // Calculate percentages
  const devices = Array.from(deviceMap.entries()).map(([device, data]) => {
    const traffic_percentage = totalImpressions > 0 
      ? (data.impressions / totalImpressions) * 100 
      : 0;
    
    return { device, ...data, traffic_percentage };
  }).sort((a, b) => b.revenue - a.revenue);
  
  return { devices, totalSpend, totalRevenue, totalImpressions, totalClicks, totalConversions };
}, [marketingData]);
```

**Traffic Percentage Calculation:**
```typescript
const traffic_percentage = totalImpressions > 0 
  ? (data.impressions / totalImpressions) * 100 
  : 0;
```
Shows what portion of total traffic came from each device type.

**Device Icons:**
```typescript
{device.device === 'Mobile' && <Smartphone className="h-6 w-6 text-blue-400" />}
{device.device === 'Desktop' && <Monitor className="h-6 w-6 text-green-400" />}
{device.device === 'Tablet' && <Tablet className="h-6 w-6 text-purple-400" />}
```
Conditional rendering based on device name for visual clarity.

---

## Data Flow

### API Integration

**Proxy Route** (`app/api/marketing-data/route.ts`):
```typescript
export async function GET() {
  const response = await fetch(
    'https://www.amanabootcamp.org/api/fs-classwork-data/amana-marketing'
  );
  const data = await response.json();
  return NextResponse.json(data);
}
```

**Why use a proxy?**
- Hides external API URL from client
- Can add caching, authentication, or transformation here
- Provides consistent endpoint regardless of external API changes

**Client Fetching** (`src/lib/api.ts`):
```typescript
export async function fetchMarketingData(): Promise<MarketingData> {
  const response = await fetch('/api/marketing-data');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}
```

**Page-Level Data Loading:**
```typescript
const [marketingData, setMarketingData] = useState<MarketingData | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const load = async () => {
    try {
      const data = await fetchMarketingData();
      setMarketingData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  load();
}, []);
```

**Loading States:**
1. **Initial**: `loading = true`, show spinner
2. **Success**: `loading = false`, `marketingData` populated, render UI
3. **Error**: `loading = false`, `error` set, show error message

---

### useMemo Optimization

Throughout the app, data transformations use `useMemo`:

```typescript
const processedData = useMemo(() => {
  // Expensive calculation
  return marketingData.campaigns.map(/* ... */).filter(/* ... */);
}, [marketingData]);
```

**Why useMemo?**
- Prevents recalculation on every render
- Only recalculates when dependencies change
- Critical for aggregations that loop through hundreds of campaign records

**Example Performance Impact:**
```typescript
// WITHOUT useMemo: Recalculates on every render (typing, hover, etc.)
const processedData = marketingData.campaigns.map(/* ... */);

// WITH useMemo: Only recalculates when marketingData changes
const processedData = useMemo(() => 
  marketingData.campaigns.map(/* ... */),
  [marketingData]
);
```

---

## Type Safety

### TypeScript Interfaces

**MarketingData** (`src/types/marketing.ts`):
```typescript
export interface Campaign {
  id: number;
  name: string;
  status: string;
  spend: number;
  revenue: number;
  demographic_breakdown: DemographicBreakdown[];
  device_performance: DevicePerformance[];
  weekly_performance: WeeklyPerformance[];
  regional_performance: RegionalPerformance[];
  // ... more fields
}

export interface MarketingData {
  campaigns: Campaign[];
  marketing_stats: MarketingStats;
  // ... more fields
}
```

**Benefits:**
- Auto-completion in IDE
- Compile-time error checking
- Self-documenting code
- Prevents typos in property names

**Example Type Safety:**
```typescript
// ✅ TypeScript knows 'spend' exists and is a number
const totalSpend = campaign.spend + 1000;

// ❌ TypeScript error: Property 'spending' does not exist
const totalSpend = campaign.spending + 1000;
```

---

## Responsive Design

### Tailwind Breakpoints

The app uses Tailwind's responsive utilities:

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

**Breakpoint Progression:**
- `grid-cols-1`: Mobile (< 768px) → 1 column
- `md:grid-cols-2`: Tablet (768px+) → 2 columns  
- `lg:grid-cols-4`: Desktop (1024px+) → 4 columns

**Sidebar Responsive Behavior:**
```typescript
<div className={`
  fixed lg:static
  ${isOpen ? "translate-x-0" : "-translate-x-full"}
  lg:translate-x-0
`}>
```

- Mobile: Hidden by default, slides in when opened
- Desktop (`lg:`): Always visible, can be collapsed to icons

---

## Performance Optimizations

### 1. Memoization
```typescript
const expensiveCalculation = useMemo(() => {
  // Heavy data processing
}, [dependencies]);
```

### 2. Code Splitting
Next.js automatically code-splits each page, loading only what's needed.

### 3. Client-Side Rendering
```typescript
"use client";
```
Components that need interactivity are explicitly marked as client components.

### 4. Lazy Loading
```typescript
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setIsClient(true); // Load map only after hydration
}, []);
```

---

## Error Handling

### Graceful Degradation

**Empty Data States:**
```typescript
if (!data || data.length === 0) {
  return (
    <div className="flex items-center justify-center h-48 text-gray-400">
      No data available
    </div>
  );
}
```

**API Errors:**
```typescript
try {
  const data = await fetchMarketingData();
  setMarketingData(data);
} catch (err) {
  console.error('Failed loading marketing data:', err);
  setError(err instanceof Error ? err.message : 'Failed to load data');
}
```

**Null Safety:**
```typescript
const spend = Number(region.spend) || 0;  // Default to 0 if undefined/null
```

---

## Summary

This dashboard demonstrates:

1. **Data Aggregation**: Combining data from multiple campaigns across different dimensions
2. **Type Safety**: TypeScript interfaces ensure data integrity
3. **Performance**: useMemo prevents unnecessary recalculations
4. **Responsive Design**: Mobile-first approach with progressive enhancement
5. **Visualization**: Multiple chart types (bar, line, map) for different data types
6. **User Experience**: Loading states, error handling, and intuitive navigation

Each component is designed to be reusable and maintainable, following React and Next.js best practices.
