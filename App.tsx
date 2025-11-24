import React, { useState, useEffect } from 'react';
import { AppView, Session } from './types';
import { SessionList } from './components/SessionList';
import { SessionSetup } from './components/SessionSetup';
import { LiveTagger } from './components/LiveTagger';
import { getSessions, saveSession, deleteSession, getSessionById } from './services/storageService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.Home);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  
  // Data for setup form (could be fresh or duplicated)
  const [setupInitialData, setSetupInitialData] = useState<Partial<Session> | null>(null);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const handleCreateNew = () => {
    setSetupInitialData(null);
    setView(AppView.Setup);
  };

  const handleDuplicate = (session: Session) => {
    const { id, createdAd, tags, ...rest } = session;
    setSetupInitialData({ ...rest, matchTitle: `${rest.matchTitle} (Copy)` });
    setView(AppView.Setup);
  };

  const handleDelete = (id: string) => {
    deleteSession(id);
    setSessions(getSessions());
  };

  const handleSessionSave = (sessionData: any) => {
    const newSession: Session = {
      ...sessionData,
      id: crypto.randomUUID(),
      createdAd: Date.now(),
      tags: []
    };
    saveSession(newSession);
    setSessions(getSessions());
    setCurrentSession(newSession);
    setView(AppView.Live);
  };

  const handleSelectSession = (session: Session) => {
    setCurrentSession(session);
    setView(AppView.Live);
  };

  const handleUpdateSession = (updatedSession: Session) => {
    setCurrentSession(updatedSession);
    saveSession(updatedSession);
    // We don't reload all sessions list immediately to save perfs, only on exit
  };

  const handleExitLive = (destination: AppView = AppView.Home) => {
    if (currentSession) saveSession(currentSession);
    setSessions(getSessions());
    
    if (destination === AppView.Setup) {
        setSetupInitialData(null);
    }

    setView(destination);
    setCurrentSession(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      {view === AppView.Home && (
        <SessionList 
          sessions={sessions} 
          onCreateNew={handleCreateNew} 
          onSelectSession={handleSelectSession}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
      )}
      
      {view === AppView.Setup && (
        <SessionSetup 
          initialData={setupInitialData}
          onSave={handleSessionSave}
          onCancel={() => setView(AppView.Home)}
        />
      )}

      {view === AppView.Live && currentSession && (
        <LiveTagger 
          session={currentSession}
          onUpdateSession={handleUpdateSession}
          onExit={handleExitLive}
        />
      )}
    </div>
  );
};

export default App;