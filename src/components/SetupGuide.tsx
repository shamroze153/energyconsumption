import React, { useState, useEffect } from "react";
import { Settings, CheckCircle, ExternalLink, RefreshCw, AlertTriangle, Info, Save, Zap } from "lucide-react";

const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbzrsNLrUQsYsTAzWZ9aUsdTM61PiDIoG4E0fS5PPBtjxhkXiHgRBc_CWzy4y7rpjFhr/exec";

const DynamicSettings = () => {
  const [settings, setSettings] = useState<any>({
    PEAK_START: "18:30",
    PEAK_END: "22:30",
    RATE_PEAK: "50",
    RATE_OFF_PEAK: "35"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(d => {
        if (d && !d.error) setSettings(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setStatus("Settings updated successfully");
        setTimeout(() => setStatus(""), 3000);
      } else {
        setStatus(data.error || "Update failed");
      }
    } catch (e) {
       setStatus("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="animate-pulse h-20 bg-slate-50 rounded-xl"></div>;

  return (
    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Peak Start</label>
          <input 
            type="time" 
            className="w-full text-sm font-bold bg-white border border-slate-200 rounded px-2 py-1"
            value={settings.PEAK_START}
            onChange={e => setSettings({...settings, PEAK_START: e.target.value})}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Peak End</label>
          <input 
            type="time" 
            className="w-full text-sm font-bold bg-white border border-slate-200 rounded px-2 py-1"
            value={settings.PEAK_END}
            onChange={e => setSettings({...settings, PEAK_END: e.target.value})}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Peak Rate (PKR)</label>
          <input 
            type="number" 
            className="w-full text-sm font-bold bg-white border border-slate-200 rounded px-2 py-1"
            value={settings.RATE_PEAK}
            onChange={e => setSettings({...settings, RATE_PEAK: e.target.value})}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Off-Peak Rate (PKR)</label>
          <input 
            type="number" 
            className="w-full text-sm font-bold bg-white border border-slate-200 rounded px-2 py-1"
            value={settings.RATE_OFF_PEAK}
            onChange={e => setSettings({...settings, RATE_OFF_PEAK: e.target.value})}
          />
        </div>
      </div>
      <button 
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#1E293B] text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
      >
        {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
        Update Settings
      </button>
      {status && <p className="text-[10px] font-bold text-blue-600 uppercase text-center">{status}</p>}
    </div>
  );
};

export default function SetupGuide() {
  const [initStatus, setInitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [config, setConfig] = useState<any>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [error, setError] = useState("");
  const [gasUrlInput, setGasUrlInput] = useState("");
  const [savingGas, setSavingGas] = useState(false);

  useEffect(() => {
    refreshConfig();
    checkInitialization();
  }, []);

  const checkInitialization = async () => {
    try {
      const res = await fetch("/api/meters");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setInitStatus('success');
      }
    } catch (e) {
      // Not initialized yet or error
    }
  };

  const refreshConfig = () => {
    fetch("/api/auth/config-status").then(res => res.json()).then(d => {
      setConfig(d);
      if (d.gasUrl) setGasUrlInput(d.gasUrl);
    });
    fetch("/api/auth/status").then(res => res.json()).then(d => setIsAuth(d.authenticated));
  };

  const handleSaveGasUrl = async () => {
    setSavingGas(true);
    try {
      const res = await fetch("/api/auth/gas-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: gasUrlInput })
      });
      if (res.ok) {
        refreshConfig();
        alert("GAS URL Linked Successfully!");
      }
    } catch (e) {
      alert("Error saving URL");
    } finally {
      setSavingGas(false);
    }
  };

  const handleInit = async () => {
    const activeLink = config?.gasUrl || isAuth;
    if (!activeLink) {
      setError("Please complete Step 2 first.");
      return;
    }
    setInitStatus('loading');
    setError("");
    try {
      const res = await fetch("/api/init-sheet", { method: "POST" });
      const data = await res.json();
      if (res.ok) setInitStatus('success');
      else {
        setInitStatus('error');
        setError(data.error);
      }
    } catch (e) {
      setInitStatus('error');
      setError("Network error occurred.");
    }
  };

  const handleLogin = async () => {
    if (!config?.hasClientId) {
       alert("Missing Credentials. Use the Simple Link method instead!");
       return;
    }
    const res = await fetch("/api/auth/url");
    const { url } = await res.json();
    window.open(url, 'oauth_popup', 'width=600,height=700');
  };

  const step1Done = config?.gasUrl || (config?.hasClientId && config?.hasClientSecret);
  const step2Done = config?.gasUrl || isAuth;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-800">
        <div className="bg-[#1E293B] p-8 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <Settings size={28} className="text-blue-400" /> Database Activation
              </h3>
              <p className="text-slate-400 mt-2 text-sm max-w-md">
                Connect this portal to your Google Sheet to enable real-time tracking, peak-hour calculations, and automated reporting.
              </p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl">
               <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">System Status</span>
               <span className="text-sm font-bold flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full animate-pulse ${step2Done ? 'bg-green-500' : 'bg-red-500'}`}></div>
                 {step2Done ? 'Operational' : 'Awaiting Setup'}
               </span>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-12">
          {/* OPTION A: SIMPLE LINK (RECOMMENDED) */}
          <section className="relative pl-12 border-l-2 border-blue-100 ml-4">
            <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg ring-4 ring-white">1</div>
            <div className="flex items-center justify-between mb-4">
               <h4 className="font-bold text-lg">Simple Link (Recommended)</h4>
               <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded">FASTEST</span>
            </div>
            
             <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
               <p className="text-sm text-slate-600 mb-6 font-medium">
                 {gasUrlInput === DEFAULT_GAS_URL ? "System is using the Pre-Configured Global Bridge. Your database is ready." : "No Google Cloud account needed. Just copy our bridge script into your sheet and paste the link below."}
               </p>
               
               <div className="space-y-4">
                 <div className="group">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block group-focus-within:text-blue-600 transition-colors">Google Apps Script Web App URL</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
                        value={gasUrlInput}
                        onChange={e => setGasUrlInput(e.target.value)}
                      />
                      <button 
                        onClick={handleSaveGasUrl}
                        disabled={savingGas || !gasUrlInput}
                        className="bg-blue-600 text-white px-6 rounded-xl font-bold text-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 shadow-md shadow-blue-200"
                      >
                        {savingGas ? <RefreshCw size={18} className="animate-spin" /> : 'Save Link'}
                      </button>
                    </div>
                 </div>
                 
                 {gasUrlInput === DEFAULT_GAS_URL ? (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 text-white">
                         <CheckCircle size={20} />
                      </div>
                      <p className="text-[11px] text-emerald-700 font-bold leading-relaxed uppercase tracking-tight">
                        Global Disrupt Bridge is Active. No manual script deployment required.
                      </p>
                    </div>
                 ) : (
                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <Info size={20} className="text-slate-400" />
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed uppercase tracking-tight">
                          Open <b>MASTER_BRIDGE.gs</b> file in the sidebar, copy contents into your Sheets Script, and deploy as Web App.
                        </p>
                    </div>
                 )}
               </div>
            </div>
          </section>

          {/* STEP 2: PROVISIONING */}
          <section className="relative pl-12 border-l-2 border-slate-100 ml-4 pb-4">
            <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-lg ring-4 ring-white ${initStatus === 'success' ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>2</div>
            <h4 className="font-bold text-lg mb-2">Automated Schema Deployment</h4>
            <p className="text-sm text-slate-500 mb-6">Create the Master Meters, RAW_DATA, and Calculations tabs with one click.</p>
            
            <div className="flex flex-col gap-4 max-w-sm">
               <button
                onClick={handleInit}
                disabled={initStatus === 'loading' || !step2Done}
                className="flex items-center justify-center gap-3 bg-[#1E293B] text-white px-8 py-4 rounded-2xl font-bold hover:bg-black transition-all active:scale-[0.98] disabled:opacity-20 shadow-xl shadow-slate-200"
               >
                 {initStatus === 'loading' ? <RefreshCw size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                 <span className="tracking-tight">Deploy Database Schema</span>
               </button>
               
               {initStatus === 'success' && (
                 <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <CheckCircle size={14} />
                   </div>
                   DATABASE CONNECTED & READY
                 </div>
               )}

               {(initStatus === 'error' || error) && (
                 <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex flex-col gap-2 text-xs font-bold animate-shake">
                   <div className="flex items-center gap-2">
                     <AlertTriangle size={18} /> ACTION REQUIRED
                   </div>
                   <p className="opacity-80 leading-relaxed">{error || "Ensure the Bridge URL is correct and deployed for 'Anyone'."}</p>
                 </div>
               )}
            </div>
          </section>

          {/* TARIFF CONFIG */}
          <section className="pt-8 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-6">
               <div className="p-2 bg-blue-50 rounded-lg">
                  <Zap size={20} className="text-blue-600" />
               </div>
               <h4 className="font-bold text-lg">Billing & Tariff Logic</h4>
            </div>
            <DynamicSettings />
          </section>
        </div>
      </div>

      <div className="p-8 bg-blue-600 rounded-3xl shadow-2xl text-white relative overflow-hidden group">
         <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500 rounded-full opacity-20 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
         <div className="flex items-start gap-6 relative z-10">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
               <Info size={32} />
            </div>
            <div className="space-y-2">
               <h4 className="text-xl font-bold tracking-tight">Setup Complete</h4>
               <p className="text-blue-100 leading-relaxed font-medium">
                 Once the schema is deployed, the portal will automatically detect your 10+ meters in Building 141-D and Building 140-H. 
                 Any readings you enter will be computed using the PKR tariff rates above.
               </p>
               <div className="pt-4 flex items-center gap-4 text-xs font-bold text-blue-200">
                 <div className="flex items-center gap-1.5"><CheckCircle size={14} /> Master Meters Linked</div>
                 <div className="flex items-center gap-1.5"><CheckCircle size={14} /> Peak Hour Logic Active</div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
