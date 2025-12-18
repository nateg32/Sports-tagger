
import React, { useState, useMemo } from 'react';
import { Session, AppView, Tag } from '../types';
import { Download, Trash2, ArrowLeft, CheckCircle, FileCode, X } from 'lucide-react';
import { downloadXml, downloadTxt } from '../services/xmlService';

interface Props {
  session: Session;
  onUpdateSession: (session: Session) => void;
  onExit: (destination?: AppView) => void;
}

export const ReviewSession: React.FC<Props> = ({ session, onUpdateSession, onExit }) => {
  const [mediaPath, setMediaPath] = useState('');
  const [isDownloaded, setIsDownloaded] = useState(false);
  
  // Strictly sort tags chronologically for the review list (Oldest to Newest)
  const sequentialTags = useMemo(() => {
    return [...session.tags].sort((a, b) => (a.absoluteTimestamp || 0) - (b.absoluteTimestamp || 0));
  }, [session.tags]);

  // Undo State
  const [deletedTag, setDeletedTag] = useState<{tag: Tag, index: number} | null>(null);

  const deleteTag = (tagId: string) => {
    const index = session.tags.findIndex(t => t.eventId === tagId);
    const tag = session.tags[index];
    if (!tag) return;

    setDeletedTag({ tag, index });
    
    const updatedTags = session.tags.filter(t => t.eventId !== tagId);
    onUpdateSession({ ...session, tags: updatedTags });
  };

  const handleUndoDelete = () => {
    if (!deletedTag) return;
    
    const newTags = [...session.tags];
    newTags.splice(deletedTag.index, 0, deletedTag.tag);
    
    onUpdateSession({ ...session, tags: newTags });
    setDeletedTag(null);
  };

  const handleExport = () => {
    // Trigger downloads sequentially
    downloadXml(session, mediaPath);
    
    // Slight delay for the second download to ensure browsers handle both properly
    setTimeout(() => {
        downloadTxt(session);
    }, 150);
    
    // Show success state
    setIsDownloaded(true);

    // Redirect to home after a short delay
    setTimeout(() => {
        onExit(AppView.Home);
    }, 2500);
  };

  if (isDownloaded) {
    return (
        <div className="h-[100dvh] flex flex-col items-center justify-center bg-slate-950 p-6 text-center animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-500">
                <CheckCircle size={48} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Export Successful!</h2>
            <p className="text-slate-400 mb-8">XML and Notes files have been downloaded.</p>
            <p className="text-sm text-slate-500">Returning to dashboard...</p>
        </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-950">
      {/* Header */}
      <header className="flex-none bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-30">
        <button 
            onClick={() => onExit(AppView.Live)} 
            className="text-slate-400 hover:text-white flex items-center gap-2 p-1"
        >
            <ArrowLeft size={20} /> <span className="hidden sm:inline">Back to Match</span>
        </button>
        <h1 className="text-lg font-bold text-white">Review & Export</h1>
        <div className="w-8"></div> {/* Spacer */}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full pb-32">
        
        {/* Match Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 mb-6">
            <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Match Details</h2>
            <div className="text-xl font-bold text-white mb-1 leading-tight">{session.matchTitle}</div>
            <div className="text-slate-400 text-sm mb-4">{session.teamA} vs {session.teamB} • {session.competition}</div>
            <div className="flex flex-wrap gap-2 text-sm">
                <div className="bg-slate-800 px-3 py-1 rounded text-slate-300">
                    <span className="font-bold text-white">{session.