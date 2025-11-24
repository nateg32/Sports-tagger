import { Session } from '../types';

const STORAGE_KEY = 'live_sports_tagger_sessions';

export const getSessions = (): Session[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load sessions', e);
    return [];
  }
};

export const saveSession = (session: Session): void => {
  const sessions = getSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const deleteSession = (sessionId: string): void => {
  const sessions = getSessions().filter(s => s.id !== sessionId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const getSessionById = (id: string): Session | undefined => {
  const sessions = getSessions();
  return sessions.find(s => s.id === id);
};