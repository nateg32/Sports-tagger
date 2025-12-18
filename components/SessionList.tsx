
import React, { useState } from 'react';
import { Session, SportType } from '../types';
import { Plus, Calendar, Video, Trash2, Copy, X } from 'lucide-react';

interface Props {
  sessions: Session[];
  onCreateNew: () => void;
  onSelectSession: (s: Session) => void;
  onDuplicate: (s: Session) => void;
  onDelete: (id: string) => void;
  onRestore: (session: Session) => void;
}

export const SessionList: React.FC<Props> = ({ sessions, onCreateNew, onSelectSession, onDuplicate, onDelete, onRestore }) => {
  const [deletedSession, setDeletedSession] = useState<Session | null>(null);

  const handleDeleteClick = (session: Session) => {
    setDeletedSession(session);
    onDelete(session.id);
  };

  const handleUndoDelete = () => {
    if (deletedSession) {
        onRestore(deletedSession);
        setDeletedSession(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Live Sports Tagger</h1>
          <p className="text-slate-400">Professional tagging for NLE workflows</p>
        </div>
        <button
          onClick={onCreateNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20"
        >
          <Plus size={20} />
          New Session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-2xl p-12 text-center">
          <Video size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-medium text-slate-300 mb-2">No sessions found</h3>
          <p className="text-slate-500 mb-6">Start a new match to begin tagging events.</p>
          <button onClick={onCreateNew} className="text-indigo-400 hover:text-indigo-300 font-medium">
            Create your first session &rarr;
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between hover:border-indigo-500/50 transition-colors group"
            >
              <div className="flex-1 cursor-pointer" onClick={() => onSelectSession(session)}>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                    {session.sport}
                  </span>
                  <span className="text-slate-500 text-sm flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(session.createdAd).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                  {session.matchTitle}
                </h3>
                <p className="text-slate-400 text-sm">
                  {session.competition} • {session.teamA} vs {session.teamB} • {session.tags.length} tags
                </p>
              </div>

              <div className="flex items-center gap-3 mt-4 md:mt-0 border-t md:border-t-0 border-slate-800 pt-4 md:pt-0 pl-0 md:pl-4">
                 <button
                  onClick={(e) => { e.stopPropagation(); onDuplicate(session); }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Duplicate Settings"
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(session); }}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Delete Session"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => onSelectSession(session)}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Undo Toast */}
      {deletedSession && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-2">
            <span>Session deleted</span>
            <button 
                onClick={handleUndoDelete}
                className="text-indigo-400 font-bold hover:text-indigo-300"
            >
                Undo
            </button>
            <button onClick={() => setDeletedSession(null)} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
      )}
    </div>
  );
};
