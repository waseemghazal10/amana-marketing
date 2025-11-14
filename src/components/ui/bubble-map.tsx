"use client";
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface BubbleMapDataPoint {
  region: string;
  country: string;
  value: number;
  lat: number;
  lng: number;
}

interface BubbleMapProps {
  title: string;
  data: BubbleMapDataPoint[];
  className?: string;
  height?: number;
  minBubbleSize?: number;
  maxBubbleSize?: number;
  bubbleColor?: string;
  formatValue?: (value: number) => string;
}

// Helper: Map region names to latitude/longitude coordinates
const getRegionCoordinates = (region: string, country: string): { lat: number; lng: number } => {
  const locationMap: Record<string, { lat: number; lng: number }> = {
    // Middle East & UAE
    'Dubai': { lat: 25.2048, lng: 55.2708 },
    'Sharjah': { lat: 25.3463, lng: 55.4209 },
    'Abu Dhabi': { lat: 24.4539, lng: 54.3773 },
    'Ajman': { lat: 25.4052, lng: 55.5136 },
    'Ras Al Khaimah': { lat: 25.7893, lng: 55.9432 },
    'Fujairah': { lat: 25.1288, lng: 56.3265 },
    'Umm Al Quwain': { lat: 25.5647, lng: 55.5552 },
    'Al Ain': { lat: 24.2075, lng: 55.7447 },
    
    // Asia
    'Tokyo': { lat: 35.6762, lng: 139.6503 },
    'Singapore': { lat: 1.3521, lng: 103.8198 },
    'Hong Kong': { lat: 22.3193, lng: 114.1694 },
    'Seoul': { lat: 37.5665, lng: 126.9780 },
    'Bangkok': { lat: 13.7563, lng: 100.5018 },
    'Mumbai': { lat: 19.0760, lng: 72.8777 },
    'Delhi': { lat: 28.7041, lng: 77.1025 },
    'Shanghai': { lat: 31.2304, lng: 121.4737 },
    'Beijing': { lat: 39.9042, lng: 116.4074 },
    
    // Europe
    'London': { lat: 51.5074, lng: -0.1278 },
    'Paris': { lat: 48.8566, lng: 2.3522 },
    'Berlin': { lat: 52.5200, lng: 13.4050 },
    'Rome': { lat: 41.9028, lng: 12.4964 },
    'Madrid': { lat: 40.4168, lng: -3.7038 },
    'Amsterdam': { lat: 52.3676, lng: 4.9041 },
    'Brussels': { lat: 50.8503, lng: 4.3517 },
    'Vienna': { lat: 48.2082, lng: 16.3738 },
    'Stockholm': { lat: 59.3293, lng: 18.0686 },
    'Moscow': { lat: 55.7558, lng: 37.6173 },
    
    // Americas
    'New York': { lat: 40.7128, lng: -74.0060 },
    'Los Angeles': { lat: 34.0522, lng: -118.2437 },
    'Chicago': { lat: 41.8781, lng: -87.6298 },
    'Miami': { lat: 25.7617, lng: -80.1918 },
    'Toronto': { lat: 43.6532, lng: -79.3832 },
    'Mexico City': { lat: 19.4326, lng: -99.1332 },
    'São Paulo': { lat: -23.5505, lng: -46.6333 },
    'Buenos Aires': { lat: -34.6037, lng: -58.3816 },
    'Lima': { lat: -12.0464, lng: -77.0428 },
    
    // Africa
    'Cairo': { lat: 30.0444, lng: 31.2357 },
    'Riyadh': { lat: 24.7136, lng: 46.6753 },
    'Jeddah': { lat: 21.5433, lng: 39.1728 },
    'Doha': { lat: 25.2854, lng: 51.5310 },
    'Kuwait City': { lat: 29.3759, lng: 47.9774 },
    'Manama': { lat: 26.0667, lng: 50.5577 },
    'Muscat': { lat: 23.5880, lng: 58.3829 },
    'Lagos': { lat: 6.5244, lng: 3.3792 },
    'Johannesburg': { lat: -26.2041, lng: 28.0473 },
    'Nairobi': { lat: -1.2921, lng: 36.8219 },
    'Cape Town': { lat: -33.9249, lng: 18.4241 },
    
    // Oceania
    'Sydney': { lat: -33.8688, lng: 151.2093 },
    'Melbourne': { lat: -37.8136, lng: 144.9631 },
    'Auckland': { lat: -36.8485, lng: 174.7633 },
  };

  // Try exact match first
  if (locationMap[region]) {
    return locationMap[region];
  }

  // Fallback: try country-based regions
  const countryDefaults: Record<string, { lat: number; lng: number }> = {
    'UAE': { lat: 25.2048, lng: 55.2708 },
    'Saudi Arabia': { lat: 24.7136, lng: 46.6753 },
    'Qatar': { lat: 25.2854, lng: 51.5310 },
    'Kuwait': { lat: 29.3759, lng: 47.9774 },
    'Bahrain': { lat: 26.0667, lng: 50.5577 },
    'Oman': { lat: 23.5880, lng: 58.3829 },
    'USA': { lat: 37.0902, lng: -95.7129 },
    'UK': { lat: 51.5074, lng: -0.1278 },
    'China': { lat: 35.8617, lng: 104.1954 },
    'Japan': { lat: 36.2048, lng: 138.2529 },
    'India': { lat: 20.5937, lng: 78.9629 },
    'Germany': { lat: 51.1657, lng: 10.4515 },
    'France': { lat: 46.2276, lng: 2.2137 },
    'Brazil': { lat: -14.2350, lng: -51.9253 },
    'Australia': { lat: -25.2744, lng: 133.7751 },
    'Canada': { lat: 56.1304, lng: -106.3468 },
    'Singapore': { lat: 1.3521, lng: 103.8198 },
  };

  if (countryDefaults[country]) {
    return countryDefaults[country];
  }

  // Default fallback to center
  return { lat: 0, lng: 0 };
};

export function BubbleMap({ 
  title, 
  data,
  className = "", 
  height = 500,
  minBubbleSize = 10,
  maxBubbleSize = 50,
  bubbleColor = '#3B82F6',
  formatValue = (value) => value.toLocaleString()
}: BubbleMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="flex items-center justify-center h-96 text-gray-400">
          No regional data available
        </div>
      </div>
    );
  }

  // Calculate bubble sizes based on values
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const valueRange = maxValue - minValue || 1;

  const bubbles = data.map((item) => {
    const coords = getRegionCoordinates(item.region, item.country);
    const normalizedValue = (item.value - minValue) / valueRange;
    const radius = minBubbleSize + (normalizedValue * (maxBubbleSize - minBubbleSize));
    
    return {
      ...item,
      lat: coords.lat,
      lng: coords.lng,
      radius
    };
  });

  if (!isClient) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div 
          className="relative bg-gray-700 rounded-lg overflow-hidden border border-gray-600"
          style={{ height: `${height}px` }}
        >
          <div className="flex items-center justify-center h-full text-gray-400">
            Loading map...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      
      <div 
        className="relative rounded-lg overflow-hidden border border-gray-700"
        style={{ height: `${height}px` }}
      >
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {bubbles.map((bubble, index) => (
            <CircleMarker
              key={index}
              center={[bubble.lat, bubble.lng]}
              radius={bubble.radius}
              pathOptions={{
                fillColor: bubbleColor,
                fillOpacity: 0.7,
                color: '#1F2937',
                weight: 2
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">{bubble.region}</div>
                  <div className="text-gray-600 text-xs">{bubble.country}</div>
                  <div className="text-green-600 font-semibold mt-1">
                    {formatValue(bubble.value)}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: bubbleColor, opacity: 0.7 }}
          />
          <span>Bubble size represents value magnitude</span>
        </div>
        <div className="text-xs">
          {data.length} region{data.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
