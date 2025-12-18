
import React, { useState, useEffect, useRef } from 'react';
import { Session, MatchStatus, Tag, EventDefinition, AppView } from '../types';
import { Play, Pause, StopCircle, ArrowLeft, History, Trash2, X, Check, ArrowRight, RotateCcw } from 'lucide-react';

interface Props {
  session: Session;
  onUpdateSession: (session: Session) => void;
  onExit: (destination?: AppView) => void;
}

// History Action Types
type HistoryAction = 
  | { type: 'TAG_ADD'; tagId: string }
  | { type: 'TAG_DELETE'; tag: Tag; index: number }
  | { type: 'STATUS_CHANGE'; prevStatus: MatchStatus; prevPeriod: number; prevClock: number; createdTagId?: string };

export const LiveTagger: React.FC<Props> = ({ session, onUpdateSession, onExit }) => {
  // Session State
  const [status, setStatus] = useState<MatchStatus>(MatchStatus.NotStarted);
  const [period, setPeriod] = useState(1);
  const [gameClockSeconds, setGameClockSeconds] = useState(0);
  const [teamTagged, setTeamTagged] = useState<'Team A' | 'Team B'>('Team A');
  const [historyStack, setHistoryStack] = useState<HistoryAction[]>([]);
  
  // Editing State
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [notesInput, setNotesInput] = useState('');
  const [showUndoToast, setShowUndoToast] = useState(false);

  // Refs for timing
  const sessionStartRef = useRef<number>(0);
  const totalPausedRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const undoToastTimeoutRef = useRef<number | null>(null);

  // --- Initialization ---
  useEffect(() => {
    if (session.tags.length > 0) {
        const lastTag = session.tags[0];
        // Restore period from last tag if exists
        if(lastTag) {
           setPeriod(lastTag.periodIndex);
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

  const addToHistory = (action: HistoryAction) => {
    setHistoryStack(prev => [...prev, action]);
  };

  const toggleStatus = () => {
    const now = Date.now();
    
    if (status === MatchStatus.NotStarted) {
      // First start
      sessionStartRef.current = now;
      setStatus(MatchStatus.Live);
      addToHistory({ type: 'STATUS_CHANGE', prevStatus: MatchStatus.NotStarted, prevPeriod: period, prevClock: gameClockSeconds });
    } else if (status === MatchStatus.Live) {
      // Pause
      pauseStartRef.current = now;
      setStatus(MatchStatus.Paused);
    } else if (status === MatchStatus.Paused) {
      // Resume from manual pause
      const pausedDuration = now - pauseStartRef.current;
      totalPausedRef.current += pausedDuration;
      setStatus(MatchStatus.Live);
    } else if (status === MatchStatus.Halftime) {
      // Resume from Halftime -> Automatically Start Next Period
      const pausedDuration = now - pauseStartRef.current;
      totalPausedRef.current += pausedDuration;
      
      const prevPeriod = period;
      const prevClock = gameClockSeconds;

      // Increment Period automatically
      setPeriod(p => p + 1);
      setGameClockSeconds(0);
      setStatus(MatchStatus.Live);

      addToHistory({ 
          type: 'STATUS_CHANGE', 
          prevStatus: MatchStatus.Halftime, 
          prevPeriod: prevPeriod, 
          prevClock: prevClock 
      });
    }
  };

  const handleHalftime = () => {
    const now = Date.now();
    let currentAbsoluteTime = now - sessionStartRef.current - totalPausedRef.current;
    if (status === MatchStatus.Paused) {
        currentAbsoluteTime = pauseStartRef.current - sessionStartRef.current - totalPausedRef.current;
    }
    currentAbsoluteTime = Math.max(0, currentAbsoluteTime);
    
    const startTimeS = Math.max(0, (currentAbsoluteTime / 1000) - session.preRoll);
    const endTimeS = (currentAbsoluteTime / 1000) + session.postRoll;
    const periodName = getPeriodName(period);

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
      notes: 'Period ended',
      cameraId: session.cameraId
    };

    const updatedTags = [periodEndTag, ...session.tags];
    onUpdateSession({ ...session, tags: updatedTags });

    if (status === MatchStatus.Live) {
        pauseStartRef.current = now; 
    }
    
    addToHistory({ 
        type: 'STATUS_CHANGE', 
        prevStatus: status, 
        prevPeriod: period, 
        prevClock: gameClockSeconds,
        createdTagId: periodEndTag.eventId
    });

    setStatus(MatchStatus.Halftime);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const lastAction = historyStack[historyStack.length - 1];

    if (lastAction.type === 'TAG_ADD') {
        const updatedTags = session.tags.filter(t => t.eventId !== lastAction.tagId);
        onUpdateSession({ ...session, tags: updatedTags });
    } else if (lastAction.type === 'TAG_DELETE') {
        const newTags = [...session.tags];
        // Restore tag to original index
        newTags.splice(lastAction.index, 0, lastAction.tag);
        onUpdateSession({ ...session, tags: newTags });
    } else if (lastAction.type === 'STATUS_CHANGE') {
        setStatus(lastAction.prevStatus);
        setPeriod(lastAction.prevPeriod);
        setGameClockSeconds(lastAction.prevClock);
        
        if (lastAction.createdTagId) {
             const updatedTags = session.tags.filter(t => t.eventId !== lastAction.createdTagId);
             onUpdateSession({ ...session, tags: updatedTags });
        }
    }

    setHistoryStack(prev => prev.slice(0, -1));
    setShowUndoToast(false);
  };

  const goToReview = () => {
    onExit(AppView.Review);
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

    if (status === MatchStatus.Halftime) {
        alert("Match is in halftime. Press RESUME (Play Button) to start the next period.");
        return;
    }

    let currentAbsoluteTime = now - sessionStartRef.current - totalPausedRef.current;
    
    if (status === MatchStatus.Paused) {
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
      playerNumber: '', // Removed player input field as requested
      notes: notesInput,
      cameraId: session.cameraId
    };

    const updatedTags = [newTag, ...session.tags];
    const updatedSession = { ...session, tags: updatedTags };
    onUpdateSession(updatedSession);

    addToHistory({ type: 'TAG_ADD', tagId: newTag.eventId });

    setNotesInput('');
    
    if(scrollRef.current) {
        scrollRef.current.scrollTop = 0;
    }
  };

  const deleteTag = (tagId: string) => {
    const tagIndex = session.tags.findIndex(t => t.eventId === tagId);
    const tag = session.tags[tagIndex];
    if (!tag) return;

    // Instant delete
    const updatedTags = [...session.tags];
    updatedTags.splice(tagIndex, 1);
    onUpdateSession({ ...session, tags: updatedTags });

    // Add to history and show toast
    addToHistory({ type: 'TAG_DELETE', tag, index: tagIndex });
    
    setShowUndoToast(true);
    if (undoToastTimeoutRef.current) clearTimeout(undoToastTimeoutRef.current);
    undoToastTimeoutRef.current = window.setTimeout(() => setShowUndoToast(false), 4000);
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

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, teamTagged, period, gameClockSeconds, session.customEvents, notesInput, historyStack]);

  // Shared Tag List Renderer
  const renderTagList = () => (
    <div className="space-y-2">
        {session.tags.length === 0 && (
            <div className="text-center p-8 text-slate-600 italic text-sm">
                No events tagged yet.
            </div>
        )}
        {session.tags.map((tag) => {
            const isSystemEvent = tag.eventType.startsWith('End of') || tag.eventType.startsWith('Start of');
            
            if (isSystemEvent) {
                return (
                        <div key={tag.eventId} className="flex items-center gap-3 py-3 px-1 opacity-60">
                        <div className="h-px bg-slate-700 flex-1"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">{tag.eventType} • {tag.gameClockTime}</span>
                        <div className="h-px bg-slate-700 flex-1"></div>
                        </div>
                );
            }

            return (
                <div key={tag.eventId} className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-3 hover:bg-slate-800 hover:border-slate-700 transition-all group relative pr-10">
                     <button 
                        onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation(); 
                            deleteTag(tag.eventId); 
                        }} 
                        className="absolute top-1 right-1 h-10 w-10 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-slate-800/50 rounded-lg transition-colors z-20 cursor-pointer touch-manipulation" 
                        aria-label="Delete"
                        title="Delete Tag"
                    >
                        <Trash2 size={18} className="pointer-events-none" />
                    </button>

                    <div className="flex justify-between items-start mb-1.5">
                        <span className="font-mono text-xs text-slate-500 flex items-center gap-2">
                            <span className="text-indigo-400/60 font-sans font-bold uppercase text-[10px] tracking-wider">{tag.periodName}</span>
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">{tag.gameClockTime}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-1 h-4 rounded-full ${
                            tag.teamTagged === 'Team A' ? 'bg-indigo-500' : 
                            tag.teamTagged === 'Team B' ? 'bg-rose-500' : 'bg-slate-500'
                        }`}></div>
                        <div className="flex flex-col">
                            <span className={`text-xs font-bold leading-none mb-0.5 ${
                                tag.teamTagged === 'Team A' ? 'text-indigo-200' : 
                                tag.teamTagged === 'Team B' ? 'text-rose-200' : 'text-slate-300'
                            }`}>
                                {tag.teamTagged === 'Team A' ? session.teamA : tag.teamTagged === 'Team B' ? session.teamB : 'Neutral'}
                            </span>
                            <span className="text-sm text-white font-semibold leading-none">{tag.eventType}</span>
                        </div>
                    </div>
                    {tag.notes && (
                        <div className="mt-2 pt-2 border-t border-slate-800/50 flex flex-col gap-1">
                            <span className="text-xs text-slate-400 italic">{tag.notes}</span>
                        </div>
                    )}
                </div>
            );
        })}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      {/* Top Bar - Flex Layout to prevent overlaps */}
      <header className="flex-none bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-1 sm:gap-4 shadow-md z-30 relative min-h-[3.5rem]">
        
        {/* Left: Settings & Title - Use basis-0 flex-1 to allow centering calculation */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 basis-0 justify-start">
            <button 
                onClick={() => onExit(AppView.Home)} 
                className="p-1 -ml-1 text-slate-500 hover:text-white transition-colors" 
                title="Back to Dashboard"
            >
                <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col justify-center min-w-0">
                <h1 className="text-sm font-bold text-white leading-tight truncate">{session.matchTitle}</h1>
                <div className="text-[10px] text-slate-500 font-medium truncate hidden sm:block">{session.competition}</div>
            </div>
        </div>

        {/* Center: Timer & Status - Fixed layout, won't overlap */}
        <div className="flex items-center justify-center gap-3 shrink-0 mx-2">
             <div className="flex flex-col items-end">
                <div className="text-2xl font-mono font-bold tracking-widest text-white leading-none">
                    {formatTime(gameClockSeconds)}
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider mt-0.5">
                    <span className="text-indigo-400">P{period}</span>
                    <span className={status === MatchStatus.Live ? "text-emerald-500 animate-pulse" : "text-slate-600"}>
                        ● {status === MatchStatus.Live ? 'LIVE' : status === MatchStatus.Paused ? 'PAUSED' : status}
                    </span>
                </div>
             </div>

             <div className="flex flex-col gap-1">
                <button 
                    onClick={() => adjustClock(1)} 
                    className="bg-slate-800 hover:bg-slate-700 text-indigo-400 w-6 h-3.5 rounded-sm flex items-center justify-center border border-slate-700/50 text-[10px] font-bold active:bg-slate-600"
                >+</button>
                <button 
                    onClick={() => adjustClock(-1)} 
                    className="bg-slate-800 hover:bg-slate-700 text-red-400 w-6 h-3.5 rounded-sm flex items-center justify-center border border-slate-700/50 text-[10px] font-bold active:bg-slate-600"
                >-</button>
             </div>
        </div>

        {/* Right: Controls - Use basis-0 flex-1 to allow centering calculation */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-1 min-w-0 basis-0">
             <button 
                onClick={handleUndo}
                disabled={historyStack.length === 0}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 w-8 h-8 md:w-9 md:h-9 rounded-lg border border-slate-700 flex items-center justify-center transition-colors active:bg-slate-600 flex-shrink-0"
                title="Undo Last Action"
             >
                <RotateCcw size={16} className="md:w-[18px] md:h-[18px]" />
             </button>

             {status === MatchStatus.Live ? (
                 <button onClick={toggleStatus} className="bg-emerald-600 hover:bg-emerald-500 text-white w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shadow-lg transition-transform active:scale-95 flex-shrink-0">
                    <Pause size={16} fill="currentColor" className="md:w-[18px] md:h-[18px]" />
                 </button>
             ) : (
                 <button onClick={toggleStatus} className="bg-emerald-600 hover:bg-emerald-500 text-white w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shadow-lg transition-transform active:scale-95 flex-shrink-0">
                    <Play size={16} fill="currentColor" className="ml-0.5 md:w-[18px] md:h-[18px]"/>
                 </button>
             )}
             
             <button 
                onClick={goToReview}
                className="bg-slate-800 hover:bg-slate-700 text-indigo-400 w-8 h-8 md:w-9 md:h-9 rounded-lg border border-slate-700 flex items-center justify-center transition-colors active:bg-slate-600 flex-shrink-0"
                title="Review & Finish"
             >
                <ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />
             </button>

             <button
                onClick={() => setShowMobileHistory(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 w-8 h-8 md:w-9 md:h-9 rounded-lg border border-slate-700 lg:hidden flex items-center justify-center active:bg-slate-600 flex-shrink-0"
                title="View History"
             >
                <History size={16} className="md:w-[18px] md:h-[18px]" />
             </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Tagging Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-2 md:p-4 pb-2">
                {/* Control Strip */}
                <div className="flex flex-col gap-2 md:flex-row md:gap-4 justify-center items-stretch mb-2 md:mb-4">
                    <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800 self-center md:self-auto shadow-md w-full md:w-auto">
                        <button 
                            onClick={() => setTeamTagged('Team A')}
                            className={`flex-1 md:flex-none md:px-8 py-3 rounded-lg font-bold text-lg md:text-xl transition-all truncate ${teamTagged === 'Team A' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            {session.teamA}
                        </button>
                        <button 
                            onClick={() => setTeamTagged('Team B')}
                            className={`flex-1 md:flex-none md:px-8 py-3 rounded-lg font-bold text-lg md:text-xl transition-all truncate ${teamTagged === 'Team B' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            {session.teamB}
                        </button>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <textarea 
                            placeholder="Add notes..." 
                            value={notesInput}
                            onChange={e => setNotesInput(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 md:py-3 text-white focus:border-indigo-500 outline-none resize-none leading-tight text-sm md:text-base shadow-sm"
                            rows={2}
                        />
                    </div>
                </div>

                {/* Buttons Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4 content-start pb-4">
                    {session.customEvents?.map((evt) => (
                        <button
                            key={evt.id}
                            onClick={() => createTag(evt)}
                            className={`${evt.color || 'bg-slate-700'} hover:brightness-110 active:scale-95 transform transition-all 
                                        text-white font-bold text-lg md:text-2xl rounded-xl md:rounded-2xl shadow-lg border-b-4 border-black/20
                                        flex flex-col items-center justify-center min-h-[90px] md:min-h-[130px] p-2 break-words`}
                        >
                            <span className="text-center leading-tight">{evt.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Sticky Footer Controls */}
            <div className="flex-none p-2 md:p-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
                 <div className="flex flex-row justify-center gap-3 md:gap-4 max-w-4xl mx-auto w-full">
                     {/* Halftime / End Period Button */}
                     <button 
                        onClick={handleHalftime}
                        disabled={status === MatchStatus.Halftime}
                        className={`flex-1 md:flex-none md:w-48 text-sm font-bold px-4 py-3.5 rounded-xl transition-colors border border-slate-700
                            ${status === MatchStatus.Halftime 
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                : 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700'}`}
                     >
                        {status === MatchStatus.Halftime ? 'IN BREAK / HALFTIME' : `END ${getPeriodName(period).toUpperCase()}`}
                     </button>
                     
                     {/* Review & Export Button */}
                     <button 
                        onClick={goToReview} 
                        className="flex-1 md:flex-none md:w-64 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-3.5 rounded-xl border border-indigo-400/30 transition-colors shadow-lg shadow-indigo-900/20 active:bg-indigo-700 flex items-center justify-center gap-2"
                     >
                        REVIEW & EXPORT <ArrowRight size={16} />
                     </button>
                 </div>
            </div>
        </main>

        {/* Sidebar History - Desktop Only */}
        <aside className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col hidden lg:flex shadow-xl z-20">
            <div className="p-4 border-b border-slate-800 font-semibold text-slate-400 flex items-center justify-between bg-slate-900">
                <span className="flex items-center gap-2"><History size={16} /> Event Log</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs">{session.tags.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2" ref={scrollRef}>
                {renderTagList()}
            </div>
        </aside>
      </div>

      {/* Undo Toast */}
      {showUndoToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-4 z-50 animate-in slide-in-from-top-2">
            <span>Event deleted</span>
            <button 
                onClick={handleUndo}
                className="text-indigo-400 font-bold hover:text-indigo-300"
            >
                Undo
            </button>
            <button onClick={() => setShowUndoToast(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
      )}

      {/* Mobile History Drawer */}
      {showMobileHistory && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowMobileHistory(false)}
          />
          
          {/* Panel */}
          <div className="relative w-[85%] max-w-sm bg-slate-900 h-full shadow-2xl border-l border-slate-800 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
               <h3 className="font-bold text-white flex items-center gap-2">
                  <History size={18} className="text-indigo-400" /> Event Log
               </h3>
               <button onClick={() => setShowMobileHistory(false)} className="p-2 text-slate-400 hover:text-white">
                  <X size={20} />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3">
               {renderTagList()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
