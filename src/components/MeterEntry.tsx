import React, { useState, useEffect } from "react";
import { Save, AlertCircle, CheckCircle2, History, ClipboardList, Zap, Building2, MapPin, Gauge } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MeterEntry() {
  const [meters, setMeters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeterId, setSelectedMeterId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning' | null, message: string }>({ type: null, message: "" });
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    reading: "",
    phaseStatus: "Normal",
    shift: "Morning",
    remark: ""
  });

  const fetchMeters = () => {
    setLoading(true);
    fetch("/api/meters")
      .then(res => res.json())
      .then(d => {
        if (Array.isArray(d)) {
          setMeters(d);
        } else {
          setMeters([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setMeters([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMeters();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeterId || !formData.reading) {
      setStatus({ type: 'error', message: "Select a meter and enter reading." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          meterId: selectedMeterId
        })
      });
      const result = await res.json();
      if (res.ok) {
        setStatus({ type: result.warning ? 'warning' : 'success', message: result.warning || "Reading synced successfully!" });
        setFormData(prev => ({ ...prev, reading: "", remark: "" }));
        setSelectedMeterId(null);
        fetchMeters(); 
        setTimeout(() => setStatus({ type: null, message: "" }), 4000);
      } else {
        setStatus({ type: 'error', message: result.error || "Failed to save reading." });
      }
    } catch (err) {
      setStatus({ type: 'error', message: "Connection error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && meters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 animate-in fade-in duration-500">
        <div className="relative">
           <div className="w-20 h-20 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
           <Gauge className="absolute inset-0 m-auto text-blue-600 active:scale-110 transition-transform" size={24} />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Accessing Grid</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] animate-pulse">Please hold, connecting to bridge...</p>
        </div>
      </div>
    );
  }

  const doneCount = meters.filter(m => m.isDone).length;
  const pendingCount = meters.length - doneCount;

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8">
      {/* Dynamic Header */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 md:p-10 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
                <ClipboardList size={28} />
              </div>
              Disrupt Entry
            </h1>
            <p className="text-slate-400 font-medium mt-2 max-w-sm">Facility Meter Tracking System. Select a meter from the grid below to record its daily reading.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Collection Date</span>
              <input 
                type="date" 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-[120px]">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Ref Time</span>
              <input 
                type="time" 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700"
                value={formData.time}
                onChange={e => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
          <div className="flex-1 min-w-[140px] bg-emerald-50 rounded-2xl p-4 flex items-center gap-4">
             <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
               <CheckCircle2 size={20} />
             </div>
             <div>
               <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block -mb-1">Done</span>
               <span className="text-xl font-black text-emerald-700">{doneCount}</span>
             </div>
          </div>
          <div className="flex-1 min-w-[140px] bg-rose-50 rounded-2xl p-4 flex items-center gap-4">
             <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-100">
               <AlertCircle size={20} />
             </div>
             <div>
               <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest block -mb-1">Pending</span>
               <span className="text-xl font-black text-rose-700">{pendingCount}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Meter Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {meters.map((meter) => {
          const isNoDisplay = String(meter.MeterID) === "14" || String(meter.MeterID) === "15";
          
          return (
            <motion.button
              key={meter.MeterID}
              whileHover={!isNoDisplay ? { y: -4, scale: 1.02 } : {}}
              whileTap={!isNoDisplay ? { scale: 0.98 } : {}}
              onClick={() => !isNoDisplay && setSelectedMeterId(meter.MeterID)}
              className={`group h-44 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden ${
                isNoDisplay
                ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'
                : meter.isDone 
                ? 'bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50 hover:border-emerald-300' 
                : 'bg-white border-slate-100 shadow-sm hover:border-rose-200 hover:bg-rose-50/30'
              }`}
            >
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  isNoDisplay ? 'bg-slate-200 text-slate-400' :
                  meter.isDone ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 
                  'bg-slate-50 text-slate-400 group-hover:bg-rose-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-rose-100'
               }`}>
                 {isNoDisplay ? <span className="text-2xl font-black">✕</span> : <Gauge size={28} />}
               </div>
               
               <div className="text-center px-4">
                 <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">{meter.MeterID}</h3>
                 {isNoDisplay ? (
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1">No Display</p>
                 ) : (
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1"># {meter.MeterNo || 'N/A'}</p>
                 )}
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60 mt-0.5 truncate max-w-[100px]">
                   {meter.Building || 'Unknown'}
                 </p>
               </div>
  
               {!isNoDisplay && (
                 meter.isDone ? (
                   <div className="absolute top-4 right-4 text-emerald-500">
                     <CheckCircle2 size={16} />
                   </div>
                 ) : (
                   <div className="absolute top-4 right-4 text-rose-300 group-hover:text-rose-500">
                     <AlertCircle size={16} />
                   </div>
                 )
               )}
            </motion.button>
          );
        })}
      </div>

      {/* Focused Entry Modal */}
      <AnimatePresence>
        {selectedMeterId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMeterId(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="w-full max-w-xl bg-white rounded-[3rem] shadow-2xl relative z-10 overflow-hidden"
            >
               <div className="bg-[#0F172A] p-10 text-white relative">
                  <span className="inline-block px-4 py-1 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-6">
                    <Zap size={10} className="inline mr-2" /> Collector Portal
                  </span>
                  
                  <h2 className="text-4xl font-black mb-2 flex items-baseline gap-3">
                    {selectedMeterId}
                    <span className="text-lg font-bold text-slate-500">/ Entry</span>
                  </h2>
                  
                  <div className="flex gap-6 opacity-60">
                    <div className="flex items-center gap-2 text-sm font-bold">
                       <Building2 size={16} className="text-blue-500" />
                       {meters.find(m => m.MeterID === selectedMeterId)?.Building || "N/A"}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold">
                       <MapPin size={16} className="text-blue-500" />
                       {meters.find(m => m.MeterID === selectedMeterId)?.Location || "N/A"}
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedMeterId(null)}
                    className="absolute top-10 right-10 w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-2xl transition-all"
                  >
                    &times;
                  </button>
               </div>

               <form onSubmit={handleSubmit} className="p-10 space-y-8">
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block pl-1">
                       Reading Value (kWh)
                     </label>
                     <div className="relative group">
                       <input
                        autoFocus
                        type="number"
                        step="0.01"
                        placeholder="00.00"
                        className="w-full text-5xl font-black bg-slate-50 border-4 border-slate-50 rounded-[2rem] px-8 py-7 outline-none focus:bg-white focus:border-blue-100 transition-all text-slate-900 placeholder:text-slate-100"
                        value={formData.reading}
                        onChange={e => setFormData({ ...formData, reading: e.target.value })}
                        required
                       />
                       <div className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-200 pointer-events-none font-black text-2xl">
                         kWh
                       </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Phase Status</label>
                       <select 
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.phaseStatus}
                        onChange={e => setFormData({ ...formData, phaseStatus: e.target.value })}
                       >
                         <option>Normal</option>
                         <option>Fluctuating</option>
                         <option>Faulty</option>
                         <option>Phase Missing</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Shift</label>
                       <select 
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.shift}
                        onChange={e => setFormData({ ...formData, shift: e.target.value })}
                       >
                         <option>Morning</option>
                         <option>Evening</option>
                         <option>Night</option>
                       </select>
                    </div>
                  </div>

                  {status.message && (
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`p-5 rounded-3xl text-xs font-black uppercase tracking-wider flex items-center gap-3 ${
                        status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 
                        status.type === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      {status.message}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-20 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-blue-100 transition-all active:scale-[0.98] flex items-center justify-center gap-4"
                  >
                    {submitting ? (
                      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Save size={24} /> Records Sync
                      </>
                    )}
                  </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

