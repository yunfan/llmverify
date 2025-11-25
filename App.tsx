
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Play, 
  Trash2, 
  Download,
  Settings,
  Globe,
  ChevronDown,
  Plus,
  Layout,
  FileText,
  Save
} from 'lucide-react';
import { verifyApiKey } from './services/geminiService';
import { VerificationResult, VerificationStatus, Stats, ProviderProtocol, MODEL_PRESETS, TestTarget, TestConfig } from './types';
import { StatsCard } from './components/StatsCard';
import { LatencyChart } from './components/LatencyChart';

const CONCURRENCY_LIMIT = 3;

// Initial State Helper
const createNewTarget = (index: number): TestTarget => ({
  id: crypto.randomUUID(),
  name: `Test Target ${index + 1}`,
  config: {
    protocol: ProviderProtocol.GOOGLE,
    baseUrl: '',
    model: 'gemini-1.5-flash',
    apiKeysText: '',
  },
  results: [],
  isProcessing: false,
  progress: 0,
});

export default function App() {
  // Application State
  const [targets, setTargets] = useState<TestTarget[]>([createNewTarget(0)]);
  const [activeTargetId, setActiveTargetId] = useState<string>(targets[0].id);
  const [activeTab, setActiveTab] = useState<'config' | 'report'>('config');

  // Derived State
  const activeTarget = useMemo(() => 
    targets.find(t => t.id === activeTargetId) || targets[0], 
  [targets, activeTargetId]);

  const stats: Stats = useMemo(() => {
    if (!activeTarget) return { total: 0, tested: 0, valid: 0, invalid: 0, avgLatency: 0 };
    
    const valid = activeTarget.results.filter(r => r.status === VerificationStatus.VALID);
    const invalid = activeTarget.results.filter(r => r.status === VerificationStatus.INVALID);
    const totalLatency = valid.reduce((acc, curr) => acc + curr.latency, 0);
    
    return {
      total: activeTarget.results.length,
      tested: valid.length + invalid.length,
      valid: valid.length,
      invalid: invalid.length,
      avgLatency: valid.length > 0 ? Math.round(totalLatency / valid.length) : 0,
    };
  }, [activeTarget]);

  // Actions
  const addTarget = () => {
    const newTarget = createNewTarget(targets.length);
    setTargets([...targets, newTarget]);
    setActiveTargetId(newTarget.id);
    setActiveTab('config');
  };

  const removeTarget = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (targets.length === 1) return; // Prevent deleting last target
    const newTargets = targets.filter(t => t.id !== id);
    setTargets(newTargets);
    if (activeTargetId === id) {
      setActiveTargetId(newTargets[0].id);
    }
  };

  const updateTargetConfig = (key: keyof TestConfig, value: string) => {
    setTargets(prev => prev.map(t => 
      t.id === activeTargetId 
        ? { ...t, config: { ...t.config, [key]: value } }
        : t
    ));
  };

  const updateTargetName = (name: string) => {
     setTargets(prev => prev.map(t => 
      t.id === activeTargetId ? { ...t, name } : t
    ));
  };

  const runVerification = useCallback(async () => {
    if (!activeTarget) return;

    const keys = activeTarget.config.apiKeysText
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keys.length === 0) return;

    // Switch to report tab automatically
    setActiveTab('report');

    // Reset results for this target
    setTargets(prev => prev.map(t => {
      if (t.id !== activeTargetId) return t;
      return {
        ...t,
        isProcessing: true,
        progress: 0,
        results: keys.map((key, index) => ({
          id: `job-${t.id}-${index}-${Date.now()}`,
          keyMasked: '...',
          keyFull: key,
          status: VerificationStatus.PENDING,
          latency: 0,
          model: t.config.model,
          timestamp: Date.now(),
        }))
      };
    }));

    // Queue Processing Logic
    let completedCount = 0;
    const processKey = async (item: VerificationResult) => {
      // Fetch latest config in case user changed it mid-flight (edge case, but safer)
      // Actually we should use the captured config from start, but for now using current state ref is complex.
      // We will use the config passed to this closure or read from state. 
      // To simplify, we rely on the `activeTarget` variable captured in closure, but `activeTarget` changes.
      // We need the config SNAPSHOT.
      
      const currentTarget = targets.find(t => t.id === activeTargetId);
      if (!currentTarget) return;

      const result = await verifyApiKey(
        item.keyFull, 
        currentTarget.config.model, 
        item.id, 
        currentTarget.config.baseUrl, 
        currentTarget.config.protocol
      );
      
      setTargets(prev => prev.map(t => {
        if (t.id !== activeTargetId) return t;
        const newResults = t.results.map(r => r.id === item.id ? result : r);
        const newProgress = Math.round((++completedCount / keys.length) * 100);
        return { 
          ...t, 
          results: newResults,
          progress: newProgress,
          isProcessing: newProgress < 100
        };
      }));
    };

    // Snapshot the initial jobs to iterate over
    // We need to access the state immediately after the reset above. 
    // Since setState is async, we construct the initial batch here locally to start the queue.
    const initialJobs: VerificationResult[] = keys.map((key, index) => ({
      id: `job-${activeTargetId}-${index}-${Date.now()}`,
      keyMasked: '...',
      keyFull: key,
      status: VerificationStatus.PENDING,
      latency: 0,
      model: activeTarget.config.model,
      timestamp: Date.now(),
    }));

    const queue = [...initialJobs];
    const activePromises: Promise<void>[] = [];

    while (queue.length > 0 || activePromises.length > 0) {
      while (queue.length > 0 && activePromises.length < CONCURRENCY_LIMIT) {
        const item = queue.shift();
        if (item) {
          const promise = processKey(item).then(() => {
            const index = activePromises.indexOf(promise);
            if (index > -1) activePromises.splice(index, 1);
          });
          activePromises.push(promise);
        }
      }
      if (activePromises.length > 0) {
        await Promise.race(activePromises);
      }
    }
    
    // Ensure processing state is off at end
    setTargets(prev => prev.map(t => 
      t.id === activeTargetId ? { ...t, isProcessing: false, lastRunTimestamp: Date.now() } : t
    ));

  }, [activeTargetId, targets]);

  const handleExport = useCallback(() => {
    if (!activeTarget) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Key,Status,Latency (ms),Model,Protocol,BaseURL,Error\n"
      + activeTarget.results.map(r => `${r.keyFull},${r.status},${r.latency},${r.model},${activeTarget.config.protocol},${activeTarget.config.baseUrl || 'Default'},${r.error || ''}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTarget.name.replace(/\s+/g, '_')}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [activeTarget]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 flex overflow-hidden">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20">
        {/* Sidebar Header */}
        <div className="h-16 px-4 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/20">
            <Activity className="text-white w-4 h-4" />
          </div>
          <h1 className="font-bold text-slate-200 tracking-tight">RelayProbe</h1>
          <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded ml-auto border border-slate-700">v3.0</span>
        </div>

        {/* Target List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2 flex justify-between items-center">
            <span>Test Targets</span>
          </div>
          
          {targets.map(target => (
            <div 
              key={target.id}
              onClick={() => setActiveTargetId(target.id)}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                activeTargetId === target.id 
                  ? 'bg-indigo-600/10 border-indigo-500/50 shadow-sm' 
                  : 'bg-transparent border-transparent hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="min-w-0">
                <h3 className={`text-sm font-medium truncate ${activeTargetId === target.id ? 'text-indigo-200' : 'text-slate-300'}`}>
                  {target.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 rounded border ${
                    target.config.protocol === ProviderProtocol.GOOGLE 
                      ? 'border-blue-500/20 bg-blue-500/10 text-blue-400' 
                      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {target.config.protocol === ProviderProtocol.GOOGLE ? 'GEMINI' : 'OPENAI'}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate max-w-[80px]" title={target.config.model}>
                    {target.config.model}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 {target.results.length > 0 && (
                   <div className="flex flex-col items-end">
                      <span className="text-[10px] text-emerald-400 font-mono">{target.results.filter(r => r.status === VerificationStatus.VALID).length} OK</span>
                   </div>
                 )}
                 {targets.length > 1 && (
                    <button 
                      onClick={(e) => removeTarget(e, target.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                      title="Delete Target"
                    >
                      <Trash2 size={14} />
                    </button>
                 )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Button */}
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={addTarget}
            className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-slate-700 text-slate-400 text-sm font-medium hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 group"
          >
            <Plus size={16} className="group-hover:scale-110 transition-transform" />
            Add New Target
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
        
        {/* Workspace Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative group">
              <input 
                type="text" 
                value={activeTarget.name}
                onChange={(e) => updateTargetName(e.target.value)}
                className="bg-transparent text-lg font-semibold text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded px-2 -ml-2 w-64 hover:bg-slate-900 transition-colors"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none text-slate-600">
                <Settings size={14} />
              </div>
            </div>
            <div className="h-6 w-px bg-slate-800 mx-2"></div>
            
            {/* Tabs */}
            <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-800">
              <button 
                onClick={() => setActiveTab('config')}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'config' 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Settings size={14} /> Configuration
              </button>
              <button 
                onClick={() => setActiveTab('report')}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'report' 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <FileText size={14} /> Report
                {activeTarget.results.length > 0 && (
                  <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full text-[10px]">
                    {activeTarget.results.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {activeTarget.isProcessing && (
               <div className="flex items-center gap-2 mr-4">
                 <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                 <span className="text-xs font-mono text-indigo-400">{activeTarget.progress}%</span>
               </div>
             )}
            
            <button
              onClick={runVerification}
              disabled={activeTarget.isProcessing || !activeTarget.config.apiKeysText}
              className={`py-2 px-5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all transform active:scale-95 ${
                activeTarget.isProcessing 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : !activeTarget.config.apiKeysText
                  ? 'bg-slate-800 text-slate-500'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
              }`}
            >
              <Play size={16} fill="currentColor" />
              Run Test
            </button>
          </div>
        </header>

        {/* Workspace Content */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          
          {activeTab === 'config' ? (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl">
                 <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Layout size={20} className="text-indigo-400" />
                    Target Settings
                 </h2>

                 <div className="space-y-6">
                    {/* Protocol */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Protocol</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => updateTargetConfig('protocol', ProviderProtocol.GOOGLE)}
                            className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-2 ${
                              activeTarget.config.protocol === ProviderProtocol.GOOGLE 
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            Google GenAI
                          </button>
                          <button
                            onClick={() => updateTargetConfig('protocol', ProviderProtocol.OPENAI)}
                            className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-2 ${
                              activeTarget.config.protocol === ProviderProtocol.OPENAI
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/20' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            OpenAI / Relay
                          </button>
                        </div>
                      </div>

                      {/* Base URL */}
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                          Base URL <span className="text-slate-600 normal-case font-normal">(Optional)</span>
                        </label>
                        <div className="relative group">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={14} />
                          <input 
                            type="text"
                            value={activeTarget.config.baseUrl}
                            onChange={(e) => updateTargetConfig('baseUrl', e.target.value)}
                            placeholder={activeTarget.config.protocol === ProviderProtocol.GOOGLE ? "https://generativelanguage.googleapis.com" : "https://api.openai.com/v1"}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Model */}
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Target Model</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input 
                              type="text"
                              value={activeTarget.config.model}
                              onChange={(e) => updateTargetConfig('model', e.target.value)}
                              placeholder="e.g. gpt-4o, gemini-1.5-flash"
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                            />
                        </div>
                        <div className="relative w-48">
                          <select 
                            onChange={(e) => {
                              if (e.target.value) updateTargetConfig('model', e.target.value);
                            }}
                            value=""
                            className="w-full h-full bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer hover:bg-slate-700 transition-colors"
                          >
                            <option value="" disabled>Presets</option>
                            {Object.entries(MODEL_PRESETS).map(([group, models]) => (
                              <optgroup label={group} key={group} className="bg-slate-800 text-slate-300">
                                {models.map(m => (
                                  <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <ChevronDown size={14} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* API Keys */}
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold">
                          API Keys list
                        </label>
                        <span className="text-[10px] text-slate-500">
                           {activeTarget.config.apiKeysText.split('\n').filter(l => l.trim()).length} keys entered
                        </span>
                      </div>
                      <div className="relative">
                        <textarea
                          value={activeTarget.config.apiKeysText}
                          onChange={(e) => updateTargetConfig('apiKeysText', e.target.value)}
                          className="w-full h-64 bg-slate-800 border border-slate-700 rounded-lg p-4 font-mono text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none leading-relaxed scrollbar-thin scrollbar-thumb-slate-600"
                          placeholder={`sk-...\nsk-...\n...`}
                          spellCheck={false}
                        />
                        <div className="absolute bottom-3 right-3">
                           <button 
                             onClick={() => updateTargetConfig('apiKeysText', '')}
                             className="p-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition-colors"
                             title="Clear All"
                           >
                             <Trash2 size={12} />
                           </button>
                        </div>
                      </div>
                    </div>
                 </div>
              </div>

              <div className="flex justify-center">
                 <button 
                   onClick={runVerification}
                   className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium"
                 >
                   Save & Run Verification <Play size={14} />
                 </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               {activeTarget.results.length === 0 ? (
                 <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                    <div className="p-4 rounded-full bg-slate-800 mb-4">
                      <Play className="text-slate-600" size={32} />
                    </div>
                    <h3 className="text-slate-300 font-medium mb-2">No Results Yet</h3>
                    <p className="text-slate-500 text-sm max-w-sm text-center mb-6">
                      Configure your test target settings and click "Run Test" to start the verification process.
                    </p>
                    <button 
                      onClick={() => setActiveTab('config')}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                    >
                      Go to Configuration
                    </button>
                 </div>
               ) : (
                 <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatsCard 
                      label="Total Checked" 
                      value={stats.tested} 
                      icon={CheckCircle} 
                      colorClass="text-slate-400" 
                      subtext={`of ${stats.total} total`}
                    />
                    <StatsCard 
                      label="Valid" 
                      value={stats.valid} 
                      icon={Zap} 
                      colorClass="text-emerald-400" 
                    />
                    <StatsCard 
                      label="Invalid" 
                      value={stats.invalid} 
                      icon={AlertCircle} 
                      colorClass="text-rose-400" 
                    />
                    <StatsCard 
                      label="Avg Latency" 
                      value={`${stats.avgLatency}ms`} 
                      icon={Activity} 
                      colorClass="text-indigo-400" 
                    />
                  </div>

                  <LatencyChart results={activeTarget.results} />

                  {/* Results Table */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                      <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                        Detailed Logs
                        {activeTarget.lastRunTimestamp && (
                          <span className="text-[10px] font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                            Last run: {new Date(activeTarget.lastRunTimestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </h3>
                      <button 
                        onClick={handleExport}
                        className="text-xs flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
                      >
                        <Download size={14} />
                        Export CSV
                      </button>
                    </div>
                    
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/50 text-slate-500 sticky top-0 z-10 backdrop-blur-md">
                          <tr>
                            <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider w-32">Key Mask</th>
                            <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider w-24">Status</th>
                            <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider text-right w-24">Latency</th>
                            <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {activeTarget.results.map((r) => (
                              <tr key={r.id} className="hover:bg-slate-800/30 transition-colors group">
                                <td className="px-6 py-3 font-mono text-xs text-slate-400 group-hover:text-slate-200">
                                  {r.keyMasked}
                                </td>
                                <td className="px-6 py-3">
                                  {r.status === VerificationStatus.PENDING ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 animate-pulse">
                                      Testing...
                                    </span>
                                  ) : r.status === VerificationStatus.VALID ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                      Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                      Failed
                                    </span>
                                  )}
                                </td>
                                <td className={`px-6 py-3 font-mono text-xs text-right ${
                                  r.latency > 1000 ? 'text-orange-400' : r.latency > 0 ? 'text-indigo-300' : 'text-slate-600'
                                }`}>
                                  {r.latency > 0 ? `${r.latency}ms` : '-'}
                                </td>
                                <td className="px-6 py-3 max-w-xs truncate">
                                  {r.error ? (
                                    <span className="text-rose-400/80 text-xs" title={r.error}>{r.error}</span>
                                  ) : (
                                    <span className="text-slate-500 text-xs">{r.model}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                 </>
               )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
