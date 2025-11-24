import React, { useState, useEffect } from 'react';
import { Session, SportType, SportConfig, EventDefinition } from '../types';
import { DEFAULT_SPORTS } from '../constants';
import { ArrowLeft, Plus, X, Check, Trash2 } from 'lucide-react';

interface Props {
  initialData?: Partial<Session> | null;
  onSave: (session: Omit<Session, 'id' | 'createdAd' | 'tags'> & { customEvents?: EventDefinition[] }) => void;
  onCancel: () => void;
}

export const SessionSetup: React.FC<Props> = ({ initialData, onSave, onCancel }) => {
  const [sport, setSport] = useState<SportType>((initialData?.sport as SportType) || SportType.Soccer);
  const [matchTitle, setMatchTitle] = useState(initialData?.matchTitle || '');
  const [competition, setCompetition] = useState(initialData?.competition || '');
  const [teamA, setTeamA] = useState(initialData?.teamA || '');
  const [teamB, setTeamB] = useState(initialData?.teamB || '');
  const [cameraId, setCameraId] = useState(initialData?.cameraId || 'Cam 1');
  const [fps, setFps] = useState(initialData?.fps || 25);
  const [preRoll, setPreRoll] = useState(initialData?.preRoll || 5);
  const [postRoll, setPostRoll] = useState(initialData?.postRoll || 10);
  
  // For custom configuration
  const [periods, setPeriods] = useState(2);
  const [periodDuration, setPeriodDuration] = useState(45);
  const [customEvents, setCustomEvents] = useState<EventDefinition[]>([]);

  // Add Event UI State
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventType, setNewEventType] = useState<'general' | 'score' | 'foul'>('general');
  
  // Load defaults when sport changes, unless we are editing/duplicating with existing data
  useEffect(() => {
    const config = DEFAULT_SPORTS[sport];
    if (config) {
      setPeriods(initialData?.periods || config.periods);
      setPeriodDuration(initialData?.periodDurationMinutes || config.periodDurationMinutes);
      
      // Deep copy events to avoid mutation issues
      if (initialData?.customEvents && initialData.sport === sport) {
         setCustomEvents([...initialData.customEvents]);
      } else {
         setCustomEvents([...config.events]);
      }
    }
  }, [sport, initialData]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      matchTitle,
      competition,
      sport,
      teamA,
      teamB,
      periods,
      periodDurationMinutes: periodDuration,
      cameraId,
      fps,
      preRoll,
      postRoll,
      customEvents
    });
  };

  const toggleEventVisibility = (index: number) => {
    const newEvents = [...customEvents];
    newEvents.splice(index, 1);
    setCustomEvents(newEvents);
  };

  const handleAddEvent = () => {
    if (!newEventName.trim()) return;

    let color = 'bg-slate-600';
    if (newEventType === 'score') color = 'bg-emerald-600';
    if (newEventType === 'foul') color = 'bg-red-600';
    if (newEventType === 'general') color = 'bg-blue-600';

    const newEvent: EventDefinition = {
        id: newEventName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(Math.random() * 10000),
        label: newEventName,
        type: newEventType,
        color
    };

    setCustomEvents([...customEvents, newEvent]);
    setNewEventName('');
    setNewEventType('general');
    setIsAddingEvent(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={onCancel} className="flex items-center text-slate-400 hover:text-white mb-6 gap-2 transition-colors">
        <ArrowLeft size={20} /> Back to Sessions
      </button>

      <h1 className="text-2xl font-bold mb-6 text-white">Match Setup</h1>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
          <h2 className="text-lg font-semibold text-indigo-400 mb-4">Match Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-sm text-slate-400 mb-1">Sport</label>
                <select 
                    value={sport} 
                    onChange={(e) => setSport(e.target.value as SportType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    {Object.values(SportType).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>
             <div>
                <label className="block text-sm text-slate-400 mb-1">Competition / League</label>
                <input 
                    required
                    type="text" 
                    value={competition} 
                    onChange={e => setCompetition(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Premier League"
                />
             </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Match Title</label>
            <input 
                required
                type="text" 
                value={matchTitle} 
                onChange={e => setMatchTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Man Utd vs Liverpool"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm text-slate-400 mb-1">Team A</label>
                <input 
                    required
                    type="text" 
                    value={teamA} 
                    onChange={e => setTeamA(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
             </div>
             <div>
                <label className="block text-sm text-slate-400 mb-1">Team B</label>
                <input 
                    required
                    type="text" 
                    value={teamB} 
                    onChange={e => setTeamB(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
             </div>
          </div>
        </div>

        {/* Tech Specs */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
          <h2 className="text-lg font-semibold text-indigo-400 mb-4">Technical & Timing</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div>
                <label className="block text-sm text-slate-400 mb-1">FPS</label>
                <input 
                    type="number" 
                    value={fps} 
                    onChange={e => setFps(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
             </div>
             <div>
                <label className="block text-sm text-slate-400 mb-1">Camera ID</label>
                <input 
                    type="text" 
                    value={cameraId} 
                    onChange={e => setCameraId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
             </div>
             <div>
                <label className="block text-sm text-slate-400 mb-1">Pre-roll (sec)</label>
                <input 
                    type="number" 
                    value={preRoll} 
                    onChange={e => setPreRoll(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
             </div>
             <div>
                <label className="block text-sm text-slate-400 mb-1">Post-roll (sec)</label>
                <input 
                    type="number" 
                    value={postRoll} 
                    onChange={e => setPostRoll(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm text-slate-400 mb-1">Periods</label>
                <input 
                    type="number" 
                    value={periods} 
                    onChange={e => setPeriods(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
             </div>
             <div>
                <label className="block text-sm text-slate-400 mb-1">Duration (min)</label>
                <input 
                    type="number" 
                    value={periodDuration} 
                    onChange={e => setPeriodDuration(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
             </div>
          </div>
        </div>

        {/* Event Configuration */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-indigo-400">Event Buttons</h2>
                {!isAddingEvent && (
                  <button 
                    type="button" 
                    onClick={() => setIsAddingEvent(true)} 
                    className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
                  >
                      <Plus size={16} /> Add Event Button
                  </button>
                )}
            </div>

            {isAddingEvent && (
              <div className="bg-slate-800 p-4 rounded-lg mb-4 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1 w-full">
                          <label className="text-xs text-slate-400 mb-1 block font-bold">Event Label</label>
                          <input 
                              autoFocus
                              type="text"
                              value={newEventName}
                              onChange={e => setNewEventName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddEvent())}
                              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-600"
                              placeholder="e.g. Corner Kick"
                          />
                      </div>
                       <div className="w-full md:w-48">
                          <label className="text-xs text-slate-400 mb-1 block font-bold">Button Type</label>
                          <select 
                              value={newEventType}
                              onChange={e => setNewEventType(e.target.value as any)}
                              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                              <option value="general">General (Blue)</option>
                              <option value="score">Score (Green)</option>
                              <option value="foul">Foul (Red)</option>
                          </select>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                        <button 
                          type="button"
                          onClick={handleAddEvent}
                          disabled={!newEventName.trim()}
                          className="flex-1 md:flex-none bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded text-sm font-bold hover:bg-emerald-500 flex items-center justify-center gap-1 transition-colors"
                        >
                          <Check size={16} /> Add
                        </button>
                        <button 
                          type="button"
                          onClick={() => setIsAddingEvent(false)} 
                          className="flex-1 md:flex-none bg-slate-700 text-white px-4 py-2 rounded text-sm hover:bg-slate-600 font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                  </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {customEvents.map((evt, idx) => (
                    <div key={evt.id || idx} className={`relative group rounded-lg p-3 border border-slate-700 flex items-center justify-between ${evt.color || 'bg-slate-800'} shadow-sm overflow-hidden`}>
                        <span className="font-bold text-sm truncate text-white text-shadow pr-6">{evt.label}</span>
                        <button 
                            type="button"
                            onClick={() => toggleEventVisibility(idx)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-1.5 hover:bg-black/30 rounded transition-all"
                            title="Remove Event"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <p className="text-xs text-slate-500 mt-4 flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-slate-800 rounded-sm border border-slate-700"></span>
                Customize the grid of buttons that appear on the tagging screen.
            </p>
        </div>

        <div className="pt-4">
          <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-indigo-900/20 transition-all"
          >
              Start Match Session
          </button>
        </div>
      </form>
    </div>
  );
};
