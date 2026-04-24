import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { Zap, DollarSign, Building2, Gauge, AlertTriangle, TrendingUp, Calendar, Clock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'building' | 'meter'>('building');
  const [trendView, setTrendView] = useState<'hourly' | 'daily'>('hourly');

  const [showSlowWarning, setShowSlowWarning] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setShowSlowWarning(true);
    }, 8000);

    fetch("/api/dashboard")
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
        setShowSlowWarning(false);
      })
      .catch(() => {
        setLoading(false);
        setShowSlowWarning(false);
      });
      
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-8 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
              x: [0, 50, 0]
            }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500 rounded-full blur-[100px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.1, 0.15, 0.1],
              x: [0, -50, 0]
            }}
            transition={{ duration: 12, repeat: Infinity }}
            className="absolute -bottom-20 -right-20 w-96 h-96 bg-indigo-500 rounded-full blur-[100px]" 
          />
        </div>

        <div className="relative">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 border-[6px] border-slate-100 border-t-blue-600 rounded-full shadow-2xl shadow-blue-100"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="text-blue-600 animate-pulse" size={32} />
          </div>
        </div>

        <div className="text-center space-y-4 relative z-10">
          <motion.h3 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-black text-slate-800 uppercase tracking-[0.4em]"
          >
            Neural Sync Initiation
          </motion.h3>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Aggregating Grid Intelligence...</p>
            {showSlowWarning && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-amber-50 text-amber-600 px-4 py-2 rounded-xl border border-amber-100 text-[9px] font-black uppercase tracking-tighter mt-4 flex items-center gap-2"
              >
                <AlertTriangle size={12} /> Slow response from Cloud Bridge detected. Please hold.
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const buildingData = Object.entries(data?.buildingStats || {}).map(([name, stats]: any) => ({
    name,
    units: Math.round((stats.units || 0) * 100) / 100,
    cost: Math.round((stats.cost || 0) * 100) / 100
  }));

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
    time: `${hr.padStart(2, '0')}:00`,
    units: Math.round((units || 0) * 10) / 10
  })).sort((a,b) => parseInt(a.time) - parseInt(b.time));

  const dailyData = Object.entries(data?.dailyStats || {}).map(([date, units]: any) => ({
    time: date,
    units: Math.round((units || 0) * 10) / 10
  })).sort((a,b) => a.time.localeCompare(b.time));

  const activeTrendData = trendView === 'hourly' ? hourlyData : dailyData;

  const totalUnits = (data?.tariffStats?.Peak || 0) + (data?.tariffStats?.OffPeak || 0);
  const peakPercent = totalUnits > 0 ? ((data?.tariffStats?.Peak || 0) / totalUnits) * 100 : 0;
  const offPeakPercent = totalUnits > 0 ? ((data?.tariffStats?.OffPeak || 0) / totalUnits) * 100 : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (data?.error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border border-amber-200 shadow-xl text-center space-y-6">
        <div className="bg-amber-100 p-6 rounded-full text-amber-600 animate-bounce">
           <AlertTriangle size={48} />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Access Link Required</h3>
          <p className="text-slate-500 max-w-md text-sm font-medium leading-relaxed">
            Direct grid synchronization is inactive. Please initialize the GS Bridge configuration in settings to visualize live consumption data.
          </p>
        </div>
        <Link to="/setup" className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2">
          <Zap size={18} /> Initialize Grid
        </Link>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-2xl hover:shadow-blue-500/10 group relative overflow-hidden backdrop-blur-xl bg-white/80">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700 scale-0 group-hover:scale-150" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 relative">
            <Zap size={14} className="text-blue-500" /> Current Grid Load
          </p>
          <div className="mt-4 flex items-baseline gap-2 relative">
            <span className="text-4xl font-black text-slate-900 tracking-tight">
              {data.summary.totalUnitsToday.toLocaleString(undefined, { minimumFractionDigits: 1 })} 
            </span>
            <span className="text-sm font-bold text-slate-400 uppercase">kWh</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
            <p className="text-[10px] text-blue-600 font-black uppercase tracking-tighter">Live Telemetry Active</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-2xl hover:shadow-emerald-500/10 group relative overflow-hidden backdrop-blur-xl bg-white/80">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700 scale-0 group-hover:scale-150" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 relative">
            <DollarSign size={14} className="text-emerald-500" /> Accrued Exposure
          </p>
          <div className="mt-4 flex items-baseline gap-2 relative">
            <span className="text-4xl font-black text-slate-900 tracking-tight">
              {Math.round(data.summary.totalCostToday).toLocaleString()} 
            </span>
            <span className="text-sm font-bold text-slate-400 uppercase">PKR</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-tighter">
            Efficiency: {(data.summary.totalCostToday / (data.summary.totalUnitsToday || 1)).toFixed(1)} PKR/Unit
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group backdrop-blur-xl bg-white/80">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-colors" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Load Balancing Ratio</p>
          <div className="mt-6">
            <div className="flex items-center gap-1.5 h-3.5 w-full bg-slate-100/50 rounded-full overflow-hidden p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${peakPercent}%` }}
                transition={{ duration: 1.5, ease: "circOut" }}
                className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full shadow-[0_0_10px_rgba(249,115,22,0.3)]" 
              />
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${offPeakPercent}%` }}
                transition={{ duration: 1.5, ease: "circOut", delay: 0.2 }}
                className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)]" 
              />
            </div>
            <div className="flex justify-between text-[11px] mt-4 font-black uppercase tracking-tight">
              <span className="text-orange-600 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" /> Peak {Math.round(peakPercent)}%
              </span>
              <span className="text-blue-600 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" /> Off {Math.round(offPeakPercent)}%
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Trend */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <motion.div variants={itemVariants} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex-1 relative overflow-hidden backdrop-blur-3xl bg-white/90">
            <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
              <TrendingUp size={160} />
            </div>
            
            <div className="flex items-start justify-between mb-12 relative z-10">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <h2 className="font-black text-2xl text-slate-900 tracking-tight">Energy Consumption Trend</h2>
                  <div className="flex gap-1">
                    <Sparkles size={16} className="text-blue-500 animate-pulse" />
                    <Sparkles size={12} className="text-emerald-400 animate-pulse delay-700" />
                  </div>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] bg-slate-50 w-fit px-3 py-1 rounded-full border border-slate-100">Temporal Intelligence Graph</p>
              </div>
              
              <div className="flex p-1.5 bg-slate-100/50 backdrop-blur-md border border-slate-200/50 rounded-2xl shadow-inner-sm">
                 <button 
                  onClick={() => setTrendView('hourly')}
                  className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${trendView === 'hourly' ? 'bg-white text-blue-600 shadow-xl shadow-blue-100/50 border border-blue-50 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   Hourly
                 </button>
                 <button 
                  onClick={() => setTrendView('daily')}
                  className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${trendView === 'daily' ? 'bg-white text-blue-600 shadow-xl shadow-blue-100/50 border border-blue-50 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   Daily
                 </button>
              </div>
            </div>

            <div className="h-[360px] relative z-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={trendView}
                  initial={{ opacity: 0, scale: 0.98, filter: "blur(20px)", y: 10 }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)", y: 0 }}
                  exit={{ opacity: 0, scale: 1.02, filter: "blur(20px)", y: -10 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activeTrendData}>
                      <defs>
                        <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.4} />
                      <XAxis 
                        dataKey="time" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fill: '#64748B', fontWeight: 900 }}
                        dy={20}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fill: '#64748B', fontWeight: 900 }}
                        dx={-10}
                      />
                      <Tooltip 
                        cursor={{ stroke: '#3B82F6', strokeWidth: 2, strokeDasharray: '4 4' }}
                        contentStyle={{ 
                          borderRadius: '28px', 
                          border: '1px solid rgba(59, 130, 246, 0.1)', 
                          boxShadow: '0 30px 60px -12px rgba(0,0,0,0.2), 0 0 40px rgba(59, 130, 246, 0.05)', 
                          padding: '24px',
                          background: 'rgba(255,255,255,0.92)',
                          backdropFilter: 'blur(30px)'
                        }}
                        labelStyle={{ fontWeight: 900, marginBottom: '8px', color: '#64748B', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                        itemStyle={{ fontWeight: 900, color: '#0F172A', fontSize: '16px' }}
                        formatter={(value: any) => [`${value.toLocaleString()} kWh`, 'Reading']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="units" 
                        stroke="#2563EB" 
                        strokeWidth={6} 
                        fillOpacity={1} 
                        fill="url(#colorUnits)"
                        animationDuration={3000}
                        animationEasing="ease-in-out"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden backdrop-blur-xl bg-white/80">
            <div className="p-7 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xl shadow-blue-200">
                    <Building2 size={24} />
                 </div>
                 <div className="space-y-0.5">
                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                     {viewMode === 'building' ? 'Campus Topology' : 'Node Distribution'}
                   </h3>
                   <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Neural Mapping Link</p>
                   </div>
                 </div>
               </div>
               <button 
                onClick={() => setViewMode(viewMode === 'building' ? 'meter' : 'building')}
                className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-6 py-3 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm hover:shadow-blue-200 active:scale-95 border border-blue-100/50"
               >
                 Switch Mode
               </button>
            </div>
            <div className="max-h-80 overflow-auto custom-scrollbar">
              <table className="w-full text-left text-sm border-separate border-spacing-0">
                <thead className="sticky top-0 bg-white/90 backdrop-blur-md z-10">
                  <tr className="bg-slate-50/30">
                    <th className="py-5 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identity Node</th>
                    <th className="py-5 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Intensity (kWh)</th>
                    <th className="py-5 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50 bg-white/50">
                  {(viewMode === 'building' ? buildingData : meterData).map((item, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05, ease: "backOut" }}
                      key={idx} 
                      className="hover:bg-blue-500/5 transition-all duration-300 cursor-default group"
                    >
                      <td className="py-6 px-10">
                        <span className="font-black text-slate-800 tracking-tight group-hover:text-blue-700 transition-colors">{item.name}</span>
                      </td>
                      <td className="py-6 px-10">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-black text-blue-600 text-lg tabular-nums">{(item.units).toLocaleString()}</span>
                          <span className="text-[10px] font-black text-slate-400 tracking-tight tabular-nums opacity-60">{(item.cost).toLocaleString()} PKR <span className="text-[8px] ml-0.5">EST.</span></span>
                        </div>
                      </td>
                      <td className="py-6 px-10">
                        <div className="flex items-center gap-5">
                          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden min-w-[120px] p-0.5 border border-slate-200/50">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (item.units / (viewMode === 'building' ? 2000 : 500)) * 100)}%` }}
                              transition={{ duration: 1.5, ease: "circOut", delay: 0.2 + idx * 0.05 }}
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full shadow-[0_0_12px_rgba(59,130,246,0.4)]" 
                            />
                          </div>
                          <span className="text-[10px] font-black text-slate-500 tabular-nums">
                            {Math.round(Math.min(100, (item.units / (viewMode === 'building' ? 2000 : 500)) * 100))}%
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Breakdown */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <motion.div variants={itemVariants} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col h-full min-h-[500px] relative overflow-hidden backdrop-blur-3xl bg-white/90">
             <div className="absolute -right-10 -top-10 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
             <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-orange-500/5 rounded-full blur-[80px] pointer-events-none" />
             
             <h3 className="text-xs font-black text-slate-400 mb-10 uppercase tracking-[0.3em] relative text-center">Grid Allocation Matrix</h3>
             <div className="flex-1 flex flex-col justify-center gap-12">
                <div className="flex-1 min-h-[300px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tariffData}
                        cx="50%"
                        cy="50%"
                        innerRadius={90}
                        outerRadius={125}
                        paddingAngle={10}
                        dataKey="value"
                        stroke="none"
                        animationBegin={500}
                        animationDuration={2000}
                        animationEasing="ease-out"
                      >
                        <Cell fill="url(#peakGradient)" />
                        <Cell fill="url(#offPeakGradient)" />
                      </Pie>
                      <defs>
                        <linearGradient id="peakGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F97316" />
                          <stop offset="100%" stopColor="#EA580C" />
                        </linearGradient>
                        <linearGradient id="offPeakGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#1D4ED8" />
                        </linearGradient>
                      </defs>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '24px', 
                          border: 'none', 
                          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                          background: 'rgba(255,255,255,0.9)',
                          backdropFilter: 'blur(10px)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 1, duration: 1 }}
                      className="text-center"
                    >
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Total Flow</span>
                      <span className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">{totalUnits.toLocaleString()}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mt-1">kWh</span>
                    </motion.div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 relative z-10">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="p-5 bg-gradient-to-br from-orange-50/80 to-transparent rounded-3xl border border-orange-100/50 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                       <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">Peak Demand</p>
                       <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    </div>
                    <p className="text-xl font-black text-slate-900 tabular-nums">{data.tariffStats.Peak.toLocaleString()} <span className="text-[10px] font-bold text-slate-400 uppercase">kWh</span></p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="p-5 bg-gradient-to-br from-blue-50/80 to-transparent rounded-3xl border border-blue-100/50 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                       <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Off-Peak Load</p>
                       <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    </div>
                    <p className="text-xl font-black text-slate-900 tabular-nums">{data.tariffStats.OffPeak.toLocaleString()} <span className="text-[10px] font-bold text-slate-400 uppercase">kWh</span></p>
                  </motion.div>
                </div>
             </div>
          </motion.div>
          
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -8, scale: 1.01 }}
            className="bg-slate-900 p-10 rounded-[3rem] shadow-[0_30px_60px_-12px_rgba(15,23,42,0.3)] text-white relative overflow-hidden group cursor-default"
          >
             <div className="absolute top-0 right-0 p-10 opacity-[0.07] group-hover:opacity-[0.15] transition-all scale-150 rotate-12 group-hover:rotate-90 duration-[1500ms] pointer-events-none">
               <Sparkles size={120} />
             </div>
             <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none" />
             
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                    <TrendingUp size={20} />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em]">Predictive Insight</h4>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Core Intelligence Module</p>
                  </div>
                </div>
                <p className="text-base text-slate-300 leading-relaxed font-bold tracking-tight">
                  {dCampusStats 
                    ? `Node 141-D is processing ${dCampusStats.units.toLocaleString()} kWh across the integrated campus net today. Flow density is within safety tolerances.`
                    : "Grid Neural Processor is currently scanning all connected campus nodes for real-time efficiency metrics and load balancing vectors."}
                </p>
                <div className="mt-8 pt-8 border-t border-slate-800 flex items-center justify-between">
                   <div className="flex -space-x-2">
                     {[1,2,3].map(i => <div key={i} className={`w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] font-black text-blue-400`}>{i}</div>)}
                   </div>
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">System Status: Nominal</span>
                </div>
             </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
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
