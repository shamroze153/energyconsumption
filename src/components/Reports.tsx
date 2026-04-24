import React, { useState, useEffect } from "react";
import { Download, Filter, Search, FileText, Info } from "lucide-react";

export default function Reports() {
  const [meters, setMeters] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    meterId: "",
    building: ""
  });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/meters")
      .then(res => res.json())
      .then(d => {
        if (Array.isArray(d)) {
          setMeters(d);
        } else {
          setMeters([]);
        }
      })
      .catch(() => setMeters([]));
  }, []);

  const buildings = Array.from(new Set(meters.map(m => m.building || "Unknown")));

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams(filters);
      const res = await fetch(`/api/reports?${params}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Energy_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-800 p-6 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-3">
              <FileText size={20} className="text-blue-400" /> Export Performance Reports
            </h3>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">Generate Facility Excel Documentation</p>
          </div>
          <div className="bg-slate-700 p-2 rounded-lg">
             <Download size={20} className="text-slate-400" />
          </div>
        </div>

        <div className="p-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Temporal Bounds</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
                    value={filters.from}
                    onChange={e => setFilters({ ...filters, from: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">End Date</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
                    value={filters.to}
                    onChange={e => setFilters({ ...filters, to: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Parameter Filters</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Building</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer focus:border-blue-500"
                    value={filters.building}
                    onChange={e => setFilters({ ...filters, building: e.target.value })}
                  >
                    <option value="">All Campuses</option>
                    {buildings.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Meter</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer focus:border-blue-500"
                    value={filters.meterId}
                    onChange={e => setFilters({ ...filters, meterId: e.target.value })}
                  >
                    <option value="">All Meters</option>
                    {meters.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 italic flex items-center justify-between text-slate-400">
             <div className="flex items-center gap-2 text-xs font-medium">
               <Info size={14} /> XLSX format compatible with MS Excel & Google Sheets
             </div>
             <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-md shadow-blue-100 disabled:opacity-50 active:scale-95 not-italic"
            >
              {downloading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Download size={18} />
                  Download Complete Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
