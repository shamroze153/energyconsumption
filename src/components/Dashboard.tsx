import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Zap, DollarSign, Building2, Gauge, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'building' | 'meter'>('building');

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="animate-pulse space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200"></div>)}
      </div>
      <div className="h-96 bg-white rounded-2xl border border-slate-200"></div>
    </div>
  );

  const buildingData = Object.entries(data?.buildingStats || {}).map(([name, stats]: any) => ({
    name,
    units: Math.round((stats.units || 0) * 100) / 100,
    cost: Math.round((stats.cost || 0) * 100) / 100
  }));

  // Special Highlight for Campus 141-D
  const dCampusStats = buildingData.find(b => b.name === "141-D");

  const meterData = Object.entries(data?.meterStats || {}).map(([name, stats]: any) => ({
    name,
    units: Math.round((stats.units || 0) * 100) / 100,
    cost: Math.round((stats.cost || 0) * 100) / 100
  })).sort((a,b) => b.units - a.units);

  const tariffData = [
    { name: 'Peak', value: data?.tariffStats?.Peak || 0 },
    { name: 'Off-Peak', value: data?.tariffStats?.OffPeak || 0 },
  ];

  const hourlyData = Object.entries(data?.hourlyStats || {}).map(([hr, units]: any) => ({
    hour: `${hr.padStart(2, '0')}:00`,
    units: Math.round((units || 0) * 10) / 10
  })).sort((a,b) => parseInt(a.hour) - parseInt(b.hour));

  const totalUnits = (data?.tariffStats?.Peak || 0) + (data?.tariffStats?.OffPeak || 0);
  const peakPercent = totalUnits > 0 ? ((data?.tariffStats?.Peak || 0) / totalUnits) * 100 : 0;
  const offPeakPercent = totalUnits > 0 ? ((data?.tariffStats?.OffPeak || 0) / totalUnits) * 100 : 0;

  if (data?.error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-amber-200 shadow-sm text-center space-y-4">
        <div className="bg-amber-100 p-4 rounded-full text-amber-600">
           <AlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Database Connection Required</h3>
        <p className="text-slate-500 max-w-md">
          The portal cannot retrieve energy data. Please ensure your Google account is linked and the spreadsheet ID is correctly configured in the Setup section.
        </p>
        <Link to="/setup" className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-all">
          Go to Setup
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-hover hover:border-blue-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Zap size={14} className="text-blue-500" /> Total Units Today
          </p>
          <p className="text-3xl font-bold mt-2 text-slate-900">
            {data.summary.totalUnitsToday.toLocaleString(undefined, { minimumFractionDigits: 1 })} 
            <span className="text-sm font-normal text-slate-400 ml-1 uppercase">kWh</span>
          </p>
          <p className="text-[10px] text-blue-600 font-bold mt-3 bg-blue-50 w-fit px-2 py-0.5 rounded-full uppercase tracking-tighter">
            Target tracking active
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-hover hover:border-emerald-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <DollarSign size={14} className="text-emerald-500" /> Estimated Cost
          </p>
          <p className="text-3xl font-bold mt-2 text-slate-900">
            {Math.round(data.summary.totalCostToday).toLocaleString()} 
            <span className="text-sm font-normal text-slate-400 ml-1 uppercase">PKR</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-3 uppercase tracking-tighter">
            Avg: {(data.summary.totalCostToday / (data.summary.totalUnitsToday || 1)).toFixed(1)} PKR / unit
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Peak vs Off-Peak</p>
          <div className="flex items-center gap-2 mt-3 h-5 w-full bg-slate-100 rounded-lg overflow-hidden group-hover:h-6 transition-all">
            <div className="bg-orange-500 h-full transition-all duration-700" style={{ width: `${peakPercent}%` }}></div>
            <div className="bg-blue-400 h-full flex-1 transition-all duration-700"></div>
          </div>
          <div className="flex justify-between text-[10px] mt-3 font-bold uppercase text-slate-500 tracking-tight">
            <span className="text-orange-600">Peak: {Math.round(peakPercent)}%</span>
            <span className="text-blue-600">Off: {Math.round(offPeakPercent)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Trend */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-bold text-slate-900">Facility Consumption Trend</h2>
                <p className="text-xs text-slate-400">Aggregated hourly readings across all campuses</p>
              </div>
              <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                 <button className="px-3 py-1 bg-white text-xs font-bold rounded shadow-sm">Hourly</button>
                 <button className="px-3 py-1 text-xs text-slate-400 font-bold hover:text-slate-600">Daily</button>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="hour" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="units" 
                    stroke="#3B82F6" 
                    strokeWidth={4} 
                    dot={false}
                    activeDot={{ r: 6, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} 
                    name="kWh" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                 {viewMode === 'building' ? 'Building Campus Summary' : 'Meter Breakdown'}
               </h3>
               <button 
                onClick={() => setViewMode(viewMode === 'building' ? 'meter' : 'building')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-full transition-colors"
               >
                 Switch to {viewMode === 'building' ? 'Individual Meters' : 'Campus View'}
               </button>
            </div>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#1E293B] text-slate-400">
                  <tr>
                    <th className="py-3 px-6 text-[10px] font-bold uppercase tracking-widest">Identifier</th>
                    <th className="py-3 px-6 text-[10px] font-bold uppercase tracking-widest">Units (kWh)</th>
                    <th className="py-3 px-6 text-[10px] font-bold uppercase tracking-widest">Est. Cost (PKR)</th>
                    <th className="py-3 px-6 text-[10px] font-bold uppercase tracking-widest">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(viewMode === 'building' ? buildingData : meterData).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-700 tracking-tight">{item.name}</td>
                      <td className="py-4 px-6 font-mono font-medium text-blue-600">{item.units.toLocaleString()}</td>
                      <td className="py-4 px-6 font-bold text-slate-800">{item.cost.toLocaleString()}</td>
                      <td className="py-4 px-6">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                           <div 
                            className="bg-blue-500 h-full rounded-full" 
                            style={{ width: `${Math.min(100, (item.units / (viewMode === 'building' ? 2000 : 500)) * 100)}%` }}
                           ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Breakdown */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[400px]">
             <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Unit Distribution</h3>
             <div className="flex-1 flex flex-col justify-center gap-8">
                <div className="flex-1 min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tariffData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={10}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill="#EF4444" />
                        <Cell fill="#3B82F6" />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded bg-orange-500 shadow-sm shadow-orange-200"></div>
                      <span className="text-xs font-bold text-slate-600">Peak Load</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-900">{data.tariffStats.Peak.toLocaleString()} kWh</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded bg-blue-500 shadow-sm shadow-blue-200"></div>
                      <span className="text-xs font-bold text-slate-600">Off-Peak Load</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-900">{data.tariffStats.OffPeak.toLocaleString()} kWh</span>
                  </div>
                </div>
             </div>
          </div>
          
          <div className="bg-[#1E293B] p-6 rounded-2xl shadow-xl text-white relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all scale-150 rotate-12">
               <Zap size={64} />
             </div>
             <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Campus Insight</h4>
             <p className="text-sm text-slate-300 leading-relaxed font-medium">
               {dCampusStats 
                 ? `Campus 141-D is currently consuming ${dCampusStats.units.toLocaleString()} kWh across all meters today.`
                 : "Operational metrics are being aggregated from all connected facility campuses."}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`${color} p-3 rounded-xl`}>
        {icon}
      </div>
    </div>
  );
}
