
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { LabEnvironment, LabAnalysis, CredlyProfile, LabTask, LabFix } from './types';
import { analyzeLabInstructions, generateLabSummary, troubleshootTask, refineLabAnalysis } from './services/geminiService';
import CredlyVerification from './components/CredlyVerification';
import TerminalOutput from './components/TerminalOutput';

const SESSION_KEY = 'cloud_lab_session';
const SESSION_DURATION = 4 * 60 * 60 * 1000; // 4 hours

const App: React.FC = () => {
  const [profile, setProfile] = useState<CredlyProfile | null>(null);
  const [env, setEnv] = useState<LabEnvironment>({
    projectId: '',
    username: '',
    region: 'us-central1',
    zone: 'us-central1-a',
    projectId2: '',
    username2: ''
  });
  const [instructions, setInstructions] = useState('');
  const [iamContext, setIamContext] = useState('');
  const [analysis, setAnalysis] = useState<LabAnalysis | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [troubleshootingId, setTroubleshootingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'summary'>('plan');
  const [hasStoredSession, setHasStoredSession] = useState(false);
  const [showSessionPrompt, setShowSessionPrompt] = useState(false);

  // Check for stored session on mount and periodically
  useEffect(() => {
    const checkExpiry = () => {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          const now = Date.now();
          if (data.timestamp && now - data.timestamp > SESSION_DURATION) {
            setShowSessionPrompt(true);
            setHasStoredSession(false);
          } else {
            // Only set hasStoredSession if we aren't already actively working on an analysis
            if (!analysis) {
              setHasStoredSession(true);
            }
          }
        } catch (e) {
          setHasStoredSession(false);
        }
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [analysis]);

  // Save session whenever relevant state changes
  useEffect(() => {
    if (env.projectId || instructions || analysis) {
      const sessionData = {
        env,
        instructions,
        iamContext,
        analysis,
        summary,
        activeTab,
        timestamp: Date.now()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    }
  }, [env, instructions, iamContext, analysis, summary, activeTab]);

  const restoreSession = () => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setEnv(data.env);
        setInstructions(data.instructions);
        setIamContext(data.iamContext);
        setAnalysis(data.analysis);
        setSummary(data.summary);
        setActiveTab(data.activeTab || 'plan');
        setHasStoredSession(false);
      } catch (err) {
        console.error("Failed to restore session", err);
        localStorage.removeItem(SESSION_KEY);
      }
    }
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    setEnv({
      projectId: '',
      username: '',
      region: 'us-central1',
      zone: 'us-central1-a',
      projectId2: '',
      username2: ''
    });
    setInstructions('');
    setIamContext('');
    setAnalysis(null);
    setSummary(null);
    setHasStoredSession(false);
    setShowSessionPrompt(false);
  };

  const handleContinueSession = () => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Refresh timestamp
        data.timestamp = Date.now();
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
        restoreSession();
      } catch (e) {
        clearSession();
      }
    }
    setShowSessionPrompt(false);
  };

  const handleEnvChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEnv(prev => ({ ...prev, [name]: value }));
  };

  const handleStartLab = async () => {
    if (!instructions || !env.projectId) return;
    setLoading(true);
    try {
      const result = await analyzeLabInstructions(instructions, env, iamContext);
      setAnalysis(result);
      setSummary(null);
      setActiveTab('plan');
    } catch (err) {
      alert("Error analyzing lab. Please check your instructions and Project ID.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefinePlan = async () => {
    if (!analysis || !refinementPrompt) return;
    setRefining(true);
    try {
      const updated = await refineLabAnalysis(analysis, refinementPrompt, env);
      setAnalysis(updated);
      setRefinementPrompt('');
    } catch (err) {
      alert("Plan refinement failed.");
    } finally {
      setRefining(false);
    }
  };

  const handleTroubleshoot = async (task: LabTask) => {
    if (!task.errorFeedback) return;
    setTroubleshootingId(task.id);
    try {
      const fix = await troubleshootTask(task, task.errorFeedback, env);
      setAnalysis(prev => {
        if (!prev) return null;
        return {
          ...prev,
          tasks: prev.tasks.map(t => t.id === task.id ? { ...t, fix } : t)
        };
      });
    } catch (err) {
      alert("Failed to generate a fix for this error.");
    } finally {
      setTroubleshootingId(null);
    }
  };

  const updateTaskFeedback = (taskId: number, feedback: string) => {
    setAnalysis(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, errorFeedback: feedback } : t)
      };
    });
  };

  const handleFinishLab = async () => {
    if (!analysis) return;
    setLoading(true);
    try {
      const result = await generateLabSummary(analysis, env);
      setSummary(result);
      setActiveTab('summary');
    } catch (err) {
      alert("Error generating summary.");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return <CredlyVerification onVerified={setProfile} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans">
      {showSessionPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-200 animate-in fade-in zoom-in duration-300">
            <div className="bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Session Expired</h2>
            <p className="text-slate-600 mb-8 text-sm leading-relaxed">
              Your last session is more than 4 hours old. Would you like to keep working on your previous lab architecture or start a fresh session?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleContinueSession}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-200"
              >
                Keep Working
              </button>
              <button 
                onClick={clearSession}
                className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
              >
                End Session & Start New
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Google Cloud <span className="text-blue-600">Lab Architect</span></h1>
          </div>
          <div className="flex items-center gap-4">
            {hasStoredSession && !analysis && (
              <button 
                onClick={restoreSession}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs font-bold hover:bg-amber-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Restore Session
              </button>
            )}
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Advanced User</span>
              <span className="text-sm font-bold text-slate-800">{profile.name}</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-600">
              {profile.badgeCount}+
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="p-1 bg-slate-100 rounded text-slate-600">01</span> 
              Environment Data
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <h3 className="text-[10px] font-bold text-blue-600 uppercase mb-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> User 1 (Primary)
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Project ID</label>
                    <input 
                      name="projectId"
                      value={env.projectId}
                      onChange={handleEnvChange}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                      placeholder="e.g. qwiklabs-gcp-00-abc123"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Username</label>
                    <input 
                      name="username"
                      value={env.username}
                      onChange={handleEnvChange}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono" 
                      placeholder="student-00-abc@qwiklabs.net"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <h3 className="text-[10px] font-bold text-emerald-600 uppercase mb-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> User 2 (Advanced Labs)
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Project ID 2</label>
                    <input 
                      name="projectId2"
                      value={env.projectId2}
                      onChange={handleEnvChange}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" 
                      placeholder="Project ID for peering labs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Username 2</label>
                    <input 
                      name="username2"
                      value={env.username2}
                      onChange={handleEnvChange}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono" 
                      placeholder="Secondary username"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Region</label>
                  <input name="region" value={env.region} onChange={handleEnvChange} className="w-full px-3 py-2 bg-slate-50 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="us-central1" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Zone</label>
                  <input name="zone" value={env.zone} onChange={handleEnvChange} className="w-full px-3 py-2 bg-slate-50 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="us-central1-a" />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-600">
              <span className="p-1 bg-indigo-50 rounded text-indigo-600">02</span> 
              IAM Context (Optional)
            </h2>
            <p className="text-[10px] text-slate-400 mb-3 italic">Paste content from the 'IAM & Admin &gt; IAM' page to ensure service agent roles are correctly verified.</p>
            <textarea 
              value={iamContext}
              onChange={(e) => setIamContext(e.target.value)}
              className="w-full h-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono leading-relaxed"
              placeholder="Paste Roles/Permissions from console here..."
            />
          </section>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="p-1 bg-slate-100 rounded text-slate-600">03</span> 
              Lab Instructions
            </h2>
            <textarea 
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full h-48 px-3 py-2 bg-slate-50 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm leading-relaxed"
              placeholder="Paste the lab manual content here..."
            />
            <button 
              onClick={handleStartLab}
              disabled={loading || !instructions || !env.projectId}
              className="w-full mt-4 py-3 gcp-bg text-white font-bold rounded-lg hover:opacity-90 disabled:bg-slate-300 transition-all flex justify-center items-center gap-2 shadow-md shadow-blue-200"
            >
              {loading ? "Analyzing..." : "Generate Automation Plan"}
            </button>
            {(instructions || env.projectId || analysis) && (
              <button 
                onClick={clearSession}
                className="w-full mt-2 py-2 text-slate-400 hover:text-red-500 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                Clear Current Session
              </button>
            )}
          </section>

          {analysis && (
            <section className="bg-blue-600 p-6 rounded-xl shadow-lg border border-blue-400 text-white">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                Fine-tune Infrastructure
              </h2>
              <textarea 
                value={refinementPrompt}
                onChange={(e) => setRefinementPrompt(e.target.value)}
                className="w-full h-24 px-3 py-2 bg-blue-700/50 border border-blue-400 rounded-md focus:ring-2 focus:ring-white outline-none text-sm placeholder-blue-300 text-white"
                placeholder="e.g. Scale VM to n2d-standard-8 or modify load balancer frontend..."
              />
              <button 
                onClick={handleRefinePlan}
                disabled={refining || !refinementPrompt}
                className="w-full mt-3 py-2 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 disabled:bg-blue-400 disabled:text-blue-200 transition-all flex justify-center items-center gap-2"
              >
                {refining ? "Refining Plan..." : "Update Automation Strategy"}
              </button>
            </section>
          )}
        </div>

        <div className="lg:col-span-2">
          {!analysis && !loading && (
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl h-full min-h-[500px] flex flex-col items-center justify-center p-12 text-center text-slate-400">
               <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
               <h3 className="text-xl font-semibold text-slate-600 mb-2">Automate Lab Workflow</h3>
               <p className="max-w-md">Provide the environment data, optionally paste IAM console output, and include the lab instructions to start. Task 1 will be dedicated to permission readiness.</p>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-xl shadow-sm p-12 flex flex-col items-center justify-center min-h-[500px]">
              <div className="relative h-24 w-24 mb-6">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <h3 className="text-lg font-bold text-slate-800 tracking-wide">Architecting Solution Plan...</h3>
              <p className="text-slate-500 mt-2 text-sm italic">Identifying necessary IAM roles & resource definitions based on your project state.</p>
            </div>
          )}

          {analysis && !loading && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex bg-slate-50 border-b">
                   <button onClick={() => setActiveTab('plan')} className={`px-6 py-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'plan' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Execution Plan</button>
                   <button onClick={() => { if(summary) setActiveTab('summary') }} disabled={!summary} className={`px-6 py-4 font-bold text-sm border-b-2 transition-all ${!summary ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === 'summary' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500'}`}>Lab Summary</button>
                </div>

                <div className="p-6">
                  {activeTab === 'plan' ? (
                    <div className="space-y-8">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-slate-800">{analysis.labName}</h2>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${analysis.workflowType === 'Full Development' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                              {analysis.workflowType}
                            </span>
                          </div>
                          <div className="flex gap-2">
                             <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider">Est: {analysis.estimatedTime}</span>
                             <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase tracking-wider">Contextualized: {iamContext ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                        <button onClick={handleFinishLab} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 transition shadow-sm">Complete Lab</button>
                      </div>

                      {/* Lab Overview Section */}
                      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                          ## Lab Overview
                        </h3>
                        <div className="prose prose-sm max-w-none text-slate-600">
                          <ReactMarkdown>{analysis.overview}</ReactMarkdown>
                        </div>
                      </section>

                      {/* Infrastructure Section */}
                      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-white">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                          ## Infrastructure (IaC)
                        </h3>
                        <div className="prose prose-sm prose-invert max-w-none text-slate-300 mb-4">
                          <ReactMarkdown>{analysis.infrastructureSummary}</ReactMarkdown>
                        </div>
                      </section>

                      <div className="space-y-10">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 px-2">
                          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                          ## Commands & Implementation
                        </h3>
                        {analysis.tasks.map((task, idx) => {
                          const prevTask = idx > 0 ? analysis.tasks[idx - 1] : null;
                          const needsUserSwitch = prevTask && task.assignedUser !== prevTask.assignedUser && task.assignedUser !== 'Both' && prevTask.assignedUser !== 'Both';
                          
                          return (
                            <div key={task.id} className={`border rounded-xl p-6 shadow-sm transition-all ${idx === 0 ? 'bg-indigo-50/30 border-indigo-200' : 'bg-white border-slate-200'}`}>
                              {needsUserSwitch && (
                                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3 animate-pulse">
                                  <div className="bg-orange-500 p-1.5 rounded-full">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-orange-800 uppercase tracking-tighter">Action Required: User Switch</h4>
                                    <p className="text-sm text-orange-700">Please switch console accounts to <strong>{task.assignedUser}</strong> before proceeding.</p>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <span className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold shadow-md ${idx === 0 ? 'bg-indigo-600' : 'bg-slate-900'}`}>{task.id}</span>
                                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    {task.title}
                                    {idx === 0 && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black uppercase tracking-widest">Pre-check Phase</span>}
                                  </h3>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                  task.assignedUser === 'User 1' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                                  task.assignedUser === 'User 2' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                                  'bg-slate-100 text-slate-600 border-slate-300'
                                }`}>
                                  {task.assignedUser || 'Unassigned'}
                                </div>
                              </div>
                              <p className="text-sm text-slate-600 mb-6 leading-relaxed">{task.description}</p>
                              
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">CLI Automation</h4>
                                  <TerminalOutput commands={task.commands} framework={task.framework} />
                                </div>
                                
                                {task.terraformCode && (
                                  <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-2">
                                      <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M1.44 6.78l7.97 4.61V21.4l-7.97-4.61V6.78zM14.59 11.39l7.97-4.61v10.01l-7.97 4.61V11.39zM12.72 1.2s1.42 1.35 1.42 1.35a16.88 16.88 0 0 1-5.14 0c-.31-.08-.71-.24-1.03-.4a7.99 7.99 0 0 1 4.75-.95zM9.83 3.63l2.67 1.54 2.67-1.54-2.67-1.54-2.67 1.54z"></path></svg>
                                      Terraform HCL Snippet
                                    </h4>
                                    <TerminalOutput commands={[task.terraformCode]} framework="hcl" />
                                  </div>
                                )}

                                {task.codeFiles && task.codeFiles.length > 0 && (
                                  <div className="mt-6 border-t border-slate-100 pt-6">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                                      <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                                      ## Code Generation
                                    </h4>
                                    <div className="space-y-4">
                                      {task.codeFiles.map((file, fIdx) => (
                                        <div key={fIdx}>
                                          <TerminalOutput 
                                            commands={[file.content]} 
                                            framework={file.language} 
                                            label={file.path}
                                          />
                                          <p className="text-[10px] text-slate-400 mt-1 italic italic">Target Path: <code className="bg-slate-100 px-1 rounded">{file.path}</code></p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                            <div className="mt-6 border-t border-slate-100 pt-6">
                              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                                Paste Terminal Errors for Hotfix:
                              </h4>
                              <textarea 
                                value={task.errorFeedback || ''}
                                onChange={(e) => updateTaskFeedback(task.id, e.target.value)}
                                className="w-full h-24 p-3 text-xs font-mono bg-slate-950 text-slate-300 rounded-lg border border-slate-800 mb-3 focus:border-red-500 outline-none"
                                placeholder="Paste Error block here..."
                              />
                              <button 
                                onClick={() => handleTroubleshoot(task)}
                                disabled={!task.errorFeedback || troubleshootingId === task.id}
                                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-md hover:bg-slate-200 transition disabled:opacity-50 flex items-center gap-2"
                              >
                                {troubleshootingId === task.id ? (
                                  <><div className="w-3 h-3 border-2 border-slate-500 border-t-transparent animate-spin rounded-full"></div> Analyzing...</>
                                ) : 'Generate Hotfix'}
                              </button>

                              {task.fix && (
                                <div className="mt-6 animate-fadeIn">
                                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
                                    <h5 className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Analysis & Correction</h5>
                                    <p className="text-sm text-amber-700 leading-relaxed font-medium">{task.fix.remediation}</p>
                                  </div>
                                  <TerminalOutput commands={task.fix.commands} framework={task.framework} variant="fix" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  ) : (
                    <div className="animate-fadeIn">
                       <h2 className="text-2xl font-bold text-slate-800 mb-6">Lab Completion Report</h2>
                       <div className="bg-white border rounded-xl p-8 shadow-sm prose prose-blue max-w-none whitespace-pre-line leading-relaxed text-slate-700 italic border-l-4 border-green-500">{summary}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
