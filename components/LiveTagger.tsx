import React, { useState, useEffect, useRef } from 'react';
import { Session, MatchStatus, Tag, EventDefinition, AppView } from '../types';
import { Play, Pause, StopCircle, Download, Settings, History, Trash2, X, Check, AlertTriangle } from 'lucide-react';
import { downloadXml } from '../services/xmlService';

interface Props {
  session: Session;
  onUpdateSession: (session: Session) => void;
  onExit: (destination?: AppView) => void;
}

export const LiveTagger: React.FC<Props> = ({ session, onUpdateSession, onExit }) => {
  // Session State
  const [status, setStatus] = useState<MatchStatus>(MatchStatus.NotStarted);
  const [period, setPeriod] = useState(1);
  const [gameClockSeconds, setGameClockSeconds] = useState(0);
  const [teamTagged, setTeamTagged] = useState<'Team A' | 'Team B'>('Team A');
  
  // Editing State
  const [showExport, setShowExport] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [mediaPath, setMediaPath] = useState('');
  const [playerNumInput, setPlayerNumInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  // Refs for timing
  const sessionStartRef = useRef<number>(0);
  const totalPausedRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Initialization ---
  useEffect(() => {
    if (session.tags.length > 0) {
        const lastTag = session.tags[0];
        if(lastTag) {
           setPeriod(lastTag.periodIndex);
           // Simple restore logic could be expanded to restore clock if timestamps allow
        }
    }
  }, []);

  // --- Timer Logic ---
  useEffect(() => {
    if (status === MatchStatus.Live) {
      timerRef.current = window.setInterval(() => {
        setGameClockSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getPeriodName = (p: number) => {
    if (p > session.periods) return 'Overtime';
    if (session.periods === 2) {
        return p === 1 ? '1st Half' : '2nd Half';
    }
    return `Q${p}`;
  };

  // --- Actions ---

  const toggleStatus = () => {
    const now = Date.now();
    if (status === MatchStatus.NotStarted) {
      // First start
      sessionStartRef.current = now;
      setStatus(MatchStatus.Live);
    } else if (status === MatchStatus.Live) {
      // Pause
      pauseStartRef.current = now;
      setStatus(MatchStatus.Paused);
    } else if (status === MatchStatus.Paused || status === MatchStatus.Halftime) {
      // Resume
      const pausedDuration = now - pauseStartRef.current;
      totalPausedRef.current += pausedDuration;
      setStatus(MatchStatus.Live);
    }
  };

  const handleHalftime = () => {
    if (status === MatchStatus.Live) toggleStatus(); // Pause first
    setStatus(MatchStatus.Halftime);
  };

  const handleFinishMatch = () => {
    if (status === MatchStatus.Finished) {
        setShowFinishModal(true);
        return;
    }
    
    if (confirm("Are you sure you want to end this match session? The clock will stop.")) {
        if (status === MatchStatus.Live) toggleStatus(); // Pause logic ensures clock stops correctly
        setStatus(MatchStatus.Finished);
        setShowFinishModal(true);
    }
  };

  const nextPeriod = () => {
    // Create a system tag for period end to log the transition
    const now = Date.now();
    let currentAbsoluteTime = now - sessionStartRef.current - totalPausedRef.current;
    if (status === MatchStatus.Paused || status === MatchStatus.Halftime) {
        // Use pause time if paused
        currentAbsoluteTime = Math.max(0, pauseStartRef.current - sessionStartRef.current - totalPausedRef.current);
    } else {
        currentAbsoluteTime = Math.max(0, currentAbsoluteTime);
    }
    
    const startTimeS = Math.max(0, (currentAbsoluteTime / 1000) - session.preRoll);
    const endTimeS = (currentAbsoluteTime / 1000) + session.postRoll;

    const periodName = getPeriodName(period);
    
    // Tag 1: End of previous period
    const periodEndTag: Tag = {
      eventId: crypto.randomUUID(),
      sport: session.sport,
      matchTitle: session.matchTitle,
      competition: session.competition,
      dateTime: new Date().toISOString(),
      teamA: session.teamA,
      teamB: session.teamB,
      teamTagged: 'Neutral',
      eventType: `End of ${periodName}`,
      periodIndex: period,
      periodName: periodName,
      gameClockTime: formatTime(gameClockSeconds),
      absoluteTimestamp: currentAbsoluteTime,
      fps: session.fps,
      startTimeSeconds: startTimeS,
      endTimeSeconds: endTimeS,
      startFrame: startTimeS * session.fps,
      endFrame: endTimeS * session.fps,
      playerNumber: '',
      notes: 'Period ended manually',
      cameraId: session.cameraId
    };

    const updatedTags = [periodEndTag, ...session.tags];
    onUpdateSession({ ...session, tags: updatedTags });

    setPeriod(p => p + 1);
    setGameClockSeconds(0);
    setStatus(MatchStatus.Paused);
    pauseStartRef.current = Date.now(); // treat as paused
  };

  const adjustClock = (delta: number) => {
    setGameClockSeconds(prev => Math.max(0, prev + delta));
  };

  // --- Tagging Logic ---

  const createTag = (eventDef: EventDefinition) => {
    const now = Date.now();
    
    if (status === MatchStatus.NotStarted) {
      alert("Please start the match timer first.");
      return;
    }

    let currentAbsoluteTime = now - sessionStartRef.current - totalPausedRef.current;
    
    if (status === MatchStatus.Paused || status === MatchStatus.Halftime) {
        currentAbsoluteTime = pauseStartRef.current - sessionStartRef.current - totalPausedRef.current;
    }

    currentAbsoluteTime = Math.max(0, currentAbsoluteTime);

    const startTimeS = Math.max(0, (currentAbsoluteTime / 1000) - session.preRoll);
    const endTimeS = (currentAbsoluteTime / 1000) + session.postRoll;

    const currentPeriodName = getPeriodName(period);

    const newTag: Tag = {
      eventId: crypto.randomUUID(),
      sport: session.sport,
      matchTitle: session.matchTitle,
      competition: session.competition,
      dateTime: new Date().toISOString(),
      teamA: session.teamA,
      teamB: session.teamB,
      teamTagged: teamTagged,
      eventType: eventDef.label,
      periodIndex: period,
      periodName: currentPeriodName,
      gameClockTime: formatTime(gameClockSeconds),
      absoluteTimestamp: currentAbsoluteTime,
      fps: session.fps,
      startTimeSeconds: startTimeS,
      endTimeSeconds: endTimeS,
      startFrame: startTimeS * session.fps,
      endFrame: endTimeS * session.fps,
      playerNumber: playerNumInput,
      notes: notesInput,
      cameraId: session.cameraId
    };

    const updatedTags = [newTag, ...session.tags];
    const updatedSession = { ...session, tags: updatedTags };
    onUpdateSession(updatedSession);

    setPlayerNumInput('');
    setNotesInput('');
    
    // Scroll to top of list
    if(scrollRef.current) {
        scrollRef.current.scrollTop = 0;
    }
  };

  const deleteTag = (tagId: string) => {
    if(!confirm("Delete this tag?")) return;
    const updatedTags = session.tags.filter(t => t.eventId !== tagId);
    onUpdateSession({ ...session, tags: updatedTags });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const key = parseInt(e.key);
      if (!isNaN(key) && key > 0 && session.customEvents && key <= session.customEvents.length) {
        createTag(session.customEvents[key - 1]);
      }
      
      if (e.code === 'Space') {
        e.preventDefault();
        toggleStatus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, teamTagged, period, gameClockSeconds, session.customEvents, playerNumInput, notesInput]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      {/* Top Bar */}
      <header className="flex-none bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-4">
            <button onClick={() => onExit(AppView.Home)} className="text-slate-400 hover:text-white" title="Back to Home"><Settings size={20} /></button>
            <div>
                <h1 className="text-lg font-bold text-white leading-tight">{session.matchTitle}</h1>
                <div className="text-xs text-slate-400">{session.teamA} vs {session.teamB}</div>
            </div>
        </div>

        <div className="flex flex-col items-center">
            <div className="text-4xl font-mono font-bold tracking-wider text-white tabular-nums relative group cursor-pointer">
                {formatTime(gameClockSeconds)}
                <div className="absolute -right-16 top-0 hidden group-hover:flex flex-col gap-1 opacity-50 hover:opacity-100">
                    <button onClick={() => adjustClock(1)} className="bg-slate-800 px-1 text-xs rounded text-white">+</button>
                    <button onClick={() => adjustClock(-1)} className="bg-slate-800 px-1 text-xs rounded text-white">-</button>
                </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <span className="text-indigo-400">P{period}</span>
                <span className={status === MatchStatus.Live ? "text-red-500 animate-pulse" : "text-slate-500"}>
                    ● {status}
                </span>
            </div>
        </div>

        <div className="flex items-center gap-3">
             {status === MatchStatus.Live ? (
                 <button onClick={toggleStatus} className="bg-amber-500 hover:bg-amber-600 text-black px-4 md:px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg">
                    <Pause size={20} fill="currentColor" /> <span className="hidden md:inline">PAUSE</span>
                 </button>
             ) : (
                 <button onClick={toggleStatus} className="bg-green-600 hover:bg-green-700 text-white px-4 md:px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(22,163,74,0.3)]">
                    <Play size={20} fill="currentColor" /> <span className="hidden md:inline">{status === MatchStatus.NotStarted ? 'START' : 'RESUME'}</span>
                 </button>
             )}
             
             <button 
                onClick={handleFinishMatch}
                className="bg-slate-800 hover:bg-red-900/30 text-slate-300 hover:text-red-400 px-3 py-2 rounded-lg border border-slate-700 transition-colors flex items-center gap-2"
                title="End Match Session"
             >
                <StopCircle size={20} /> <span className="hidden lg:inline text-sm font-semibold">End Match</span>
             </button>

             <button 
                onClick={() => setShowExport(true)} 
                className="bg-slate-800 hover:bg-slate-700 text-indigo-400 px-3 py-2 rounded-lg border border-slate-700"
                title="Export XML"
             >
                <Download size={20} />
             </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Tagging Area */}
        <main className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
            
            {/* Control Strip */}
            <div className="flex flex-col md:flex-row gap-4 justify-center items-stretch mb-2">
                <div className="flex bg-slate-900 rounded-xl p-1.5 border border-slate-800 self-center md:self-auto shadow-md">
                    <button 
                        onClick={() => setTeamTagged('Team A')}
                        className={`px-8 py-4 rounded-lg font-bold text-xl transition-all ${teamTagged === 'Team A' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        {session.teamA}
                    </button>
                    <button 
                        onClick={() => setTeamTagged('Team B')}
                        className={`px-8 py-4 rounded-lg font-bold text-xl transition-all ${teamTagged === 'Team B' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        {session.teamB}
                    </button>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                     <input 
                        type="text" 
                        placeholder="#" 
                        value={playerNumInput}
                        onChange={e => setPlayerNumInput(e.target.value)}
                        className="w-20 bg-slate-900 border border-slate-700 rounded-xl text-center font-mono text-2xl text-white focus:border-indigo-500 outline-none shadow-sm"
                     />
                     <textarea 
                        placeholder="Add notes here..." 
                        value={notesInput}
                        onChange={e => setNotesInput(e.target.value)}
                        className="flex-1 md:w-96 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none resize-y leading-tight text-base shadow-sm"
                        rows={3}
                     />
                </div>
            </div>

            {/* Buttons Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 flex-1 content-start pb-10">
                {session.customEvents?.map((evt) => (
                    <button
                        key={evt.id}
                        onClick={() => createTag(evt)}
                        className={`${evt.color || 'bg-slate-700'} hover:brightness-110 active:scale-95 transform transition-all 
                                    text-white font-bold text-xl md:text-2xl rounded-2xl shadow-lg border-b-4 border-black/20
                                    flex flex-col items-center justify-center min-h-[110px] md:min-h-[130px]`}
                    >
                        <span className="text-center px-2">{evt.label}</span>
                    </button>
                ))}
            </div>

            {/* Period Controls */}
            <div className="flex justify-center gap-4 mt-auto pt-6 border-t border-slate-800">
                 <button onClick={handleHalftime} className="text-slate-400 hover:text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
                    HALFTIME / BREAK
                 </button>
                 <button onClick={nextPeriod} className="bg-slate-800 hover:bg-indigo-900/30 text-indigo-400 hover:text-indigo-300 text-sm font-semibold px-6 py-3 rounded-lg border border-slate-700 transition-colors">
                    START NEXT PERIOD &rarr;
                 </button>
            </div>
        </main>

        {/* Sidebar History */}
        <aside className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col hidden lg:flex shadow-xl z-20">
            <div className="p-4 border-b border-slate-800 font-semibold text-slate-400 flex items-center justify-between bg-slate-900">
                <span className="flex items-center gap-2"><History size={16} /> Event Log</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs">{session.tags.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2" ref={scrollRef}>
                {session.tags.length === 0 && (
                    <div className="text-center p-12 text-slate-600 italic">
                        Events will appear here as you tag them.
                    </div>
                )}
                {session.tags.map((tag, idx) => {
                    const isSystemEvent = tag.eventType.startsWith('End of') || tag.eventType.startsWith('Start of');
                    
                    if (isSystemEvent) {
                        return (
                             <div key={tag.eventId} className="flex items-center gap-4 py-4 px-2 opacity-70">
                                <div className="h-px bg-slate-700 flex-1"></div>
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{tag.eventType} • {tag.gameClockTime}</span>
                                <div className="h-px bg-slate-700 flex-1"></div>
                             </div>
                        );
                    }

                    return (
                        <div key={tag.eventId} className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-3 hover:bg-slate-800 hover:border-slate-700 transition-all group">
                            <div className="flex justify-between items-start mb-1.5">
                                <span className="font-mono text-xs text-slate-500 flex items-center gap-2">
                                    <span className="text-indigo-400/60 font-sans font-bold uppercase text-[10px] tracking-wider">{tag.periodName}</span>
                                    <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">{tag.gameClockTime}</span>
                                </span>
                                <button onClick={() => deleteTag(tag.eventId)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-800 rounded">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-1 h-4 rounded-full ${
                                    tag.teamTagged === 'Team A' ? 'bg-indigo-500' : 
                                    tag.teamTagged === 'Team B' ? 'bg-rose-500' : 'bg-slate-500'
                                }`}></div>
                                <span className={`text-sm font-bold ${
                                    tag.teamTagged === 'Team A' ? 'text-indigo-200' : 
                                    tag.teamTagged === 'Team B' ? 'text-rose-200' : 'text-slate-300'
                                }`}>
                                    {tag.teamTagged === 'Team A' ? session.teamA : tag.teamTagged === 'Team B' ? session.teamB : 'Neutral'}
                                </span>
                                <span className="text-white font-semibold">{tag.eventType}</span>
                            </div>
                            {(tag.playerNumber || tag.notes) && (
                                <div className="mt-2 pt-2 border-t border-slate-800/50 flex flex-col gap-1">
                                    {tag.playerNumber && (
                                        <span className="text-xs text-slate-400 font-mono bg-slate-800/50 self-start px-1.5 rounded">#{tag.playerNumber}</span>
                                    )}
                                    {tag.notes && (
                                        <span className="text-xs text-slate-400 italic">{tag.notes}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </aside>
      </div>

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-md w-full p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Export XML</h2>
                    <button onClick={() => setShowExport(false)}><X size={24} className="text-slate-500 hover:text-white"/></button>
                </div>
                
                <div className="mb-6">
                    <label className="block text-sm text-slate-400 mb-2">Media File Path (Optional)</label>
                    <p className="text-xs text-slate-500 mb-2">Enter filename/path to help auto-linking in your editor.</p>
                    <input 
                        type="text" 
                        value={mediaPath}
                        onChange={(e) => setMediaPath(e.target.value)}
                        placeholder="C:\Footage\Match1.mp4"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>

                <div className="bg-slate-800 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Summary</h3>
                    <ul className="text-sm text-slate-400 space-y-1">
                        <li className="flex justify-between"><span>Total Tags:</span> <span className="text-white font-mono">{session.tags.length}</span></li>
                        <li className="flex justify-between"><span>Duration:</span> <span className="text-white font-mono">{formatTime(gameClockSeconds)}</span></li>
                    </ul>
                </div>

                <button 
                    onClick={() => downloadXml(session, mediaPath)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-900/20"
                >
                    <Download size={20} /> Download XML File
                </button>
            </div>
        </div>
      )}

      {/* Finish Match Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-md w-full p-8 shadow-2xl text-center">
                <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 text-green-500">
                    <Check size={32} />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Match Finished</h2>
                <p className="text-slate-400 mb-8">Session saved successfully. What would you like to do?</p>
                
                <div className="space-y-3">
                    <button 
                        onClick={() => downloadXml(session, mediaPath)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                        <Download size={20} /> Download XML
                    </button>
                    
                    <div className="h-px bg-slate-800 my-4"></div>

                    <button 
                        onClick={() => onExit(AppView.Setup)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-green-900/20"
                    >
                        Start New Session
                    </button>
                    
                    <button 
                        onClick={() => onExit(AppView.Home)}
                        className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white font-semibold py-3.5 rounded-xl transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
