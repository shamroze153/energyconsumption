import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ClipboardList, FileText, Settings, LogOut, Info, AlertTriangle } from "lucide-react";
import Dashboard from "./components/Dashboard";
import MeterEntry from "./components/MeterEntry";
import Reports from "./components/Reports";
import SetupGuide from "./components/SetupGuide";

const Navigation = ({ auth }: { auth: boolean }) => {
  const location = useLocation();
  
  return (
    <nav className="w-full md:w-64 bg-[#1E293B] flex flex-col shrink-0 min-h-screen">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8 text-white font-bold text-xl font-sans">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-xs shadow-lg shadow-blue-500/20">⚡</div>
          <span>Disrupt Energy</span>
        </div>
        <div className="flex justify-around md:flex-col md:gap-2">
          <Link
            to="/"
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              location.pathname === "/" ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="text-sm font-medium">Dashboard</span>
          </Link>
          <Link
            to="/entry"
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              location.pathname === "/entry" ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <ClipboardList size={20} />
            <span className="text-sm font-medium">Meter Entries</span>
          </Link>
          <Link
            to="/reports"
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              location.pathname === "/reports" ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <FileText size={20} />
            <span className="text-sm font-medium">Reports</span>
          </Link>
          <Link
            to="/setup"
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              location.pathname === "/setup" ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <Settings size={20} />
            <span className="text-sm font-medium">Master Setup</span>
          </Link>
        </div>
      </div>
      
      <div className="mt-auto p-6">
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Database Status</p>
          <p className={`text-sm flex items-center gap-2 mt-1 ${auth ? 'text-green-400' : 'text-amber-400'}`}>
            <span className={`w-2 h-2 rounded-full ${auth ? 'bg-green-400' : 'bg-amber-400'}`}></span>
            {auth ? 'GS Backend Linked' : 'System Offline (Setup Needed)'}
          </p>
        </div>
      </div>
    </nav>
  );
};

export default function App() {
  const [authStatus, setAuthStatus] = useState<{ authenticated: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      setAuthStatus(data);
    } catch (e) {
      console.error("Auth check failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkAuth();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F1F5F9]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex flex-col md:flex-row min-h-screen bg-[#F1F5F9] text-slate-900 font-sans overflow-hidden">
        <Navigation auth={authStatus?.authenticated || false} />
        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-auto">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 sticky top-0 z-40">
            <h1 className="text-lg font-semibold">Facility Monitoring Portal</h1>
            <div className="flex gap-4 items-center">
              <div className="hidden sm:block bg-slate-100 px-3 py-1.5 rounded-full text-xs font-medium text-slate-600">
                Centralized Energy Intelligence
              </div>
              {!authStatus?.authenticated && (
                <Link to="/setup" className="bg-amber-100 text-amber-700 text-xs px-3 py-1.5 rounded-full font-bold animate-pulse">
                  Setup Required
                </Link>
              )}
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                <Settings size={16} className="text-slate-500" />
              </div>
            </div>
          </header>
          
          <div className="p-6 max-w-[1400px] w-full mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/entry" element={<MeterEntry />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/setup" element={<SetupGuide />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
