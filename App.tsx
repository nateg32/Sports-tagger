import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  SafeAreaView,
  Platform,
  Dimensions,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Play, 
  Pause, 
  ArrowRight,
  Download,
  Video
} from 'lucide-react-native';

// --- TYPES ---
enum SportType {
  Soccer = 'Soccer',
  Basketball = 'Basketball',
  Rugby = 'Rugby',
  AFL = 'AFL',
  Netball = 'Netball',
  AmericanFootball = 'American Football',
  Custom = 'Custom'
}

interface EventDefinition {
  id: string;
  label: string;
  color?: string;
  type?: 'score' | 'foul' | 'general';
}

interface Tag {
  eventId: string;
  sport: string;
  matchTitle: string;
  competition: string;
  dateTime: string;
  teamA: string;
  teamB: string;
  teamTagged: 'Team A' | 'Team B' | 'Neutral';
  eventType: string;
  periodIndex: number;
  periodName: string;
  gameClockTime: string;
  absoluteTimestamp: number;
  fps: number;
  startTimeSeconds: number;
  endTimeSeconds: number;
  startFrame: number;
  endFrame: number;
  notes?: string;
  cameraId: string;
}

interface Session {
  id: string;
  createdAd: number;
  matchTitle: string;
  competition: string;
  sport: SportType;
  teamA: string;
  teamB: string;
  periods: number;
  periodDurationMinutes: number;
  cameraId: string;
  fps: number;
  preRoll: number;
  postRoll: number;
  customEvents?: EventDefinition[];
  tags: Tag[];
}

enum AppView {
  Home = 'HOME',
  Setup = 'SETUP',
  Live = 'LIVE',
  Review = 'REVIEW'
}

enum MatchStatus {
  NotStarted = 'NOT_STARTED',
  Live = 'LIVE',
  Paused = 'PAUSED',
  Halftime = 'HALFTIME',
  Finished = 'FINISHED'
}

// --- CONSTANTS ---
const DEFAULT_SPORTS: Record<string, { periods: number, duration: number, events: EventDefinition[] }> = {
  [SportType.Soccer]: {
    periods: 2, duration: 45,
    events: [
      { id: 'goal', label: 'Goal', type: 'score', color: '#10b981' },
      { id: 'shot_on', label: 'Shot on Target', type: 'general', color: '#3b82f6' },
      { id: 'shot_off', label: 'Shot Off Target', type: 'general', color: '#64748b' },
      { id: 'foul', label: 'Foul', type: 'foul', color: '#f97316' },
      { id: 'yellow', label: 'Yellow Card', type: 'foul', color: '#eab308' },
      { id: 'red', label: 'Red Card', type: 'foul', color: '#ef4444' },
      { id: 'corner', label: 'Corner', type: 'general', color: '#6366f1' },
      { id: 'free_kick', label: 'Free Kick', type: 'general', color: '#818cf8' },
    ]
  },
  [SportType.Basketball]: {
    periods: 4, duration: 10,
    events: [
      { id: '2pt', label: '2PT Made', type: 'score', color: '#10b981' },
      { id: '3pt', label: '3PT Made', type: 'score', color: '#10b981' },
      { id: 'rebound', label: 'Rebound', type: 'general', color: '#3b82f6' },
      { id: 'assist', label: 'Assist', type: 'general', color: '#6366f1' },
      { id: 'steal', label: 'Steal', type: 'general', color: '#f97316' },
    ]
  }
};

const STORAGE_KEY = 'live_sports_tagger_sessions';
const getSessions = async (): Promise<Session[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};
const saveSessionLocal = async (session: Session) => {
  const sessions = await getSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  if (index >= 0) sessions[index] = session;
  else sessions.unshift(session);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};
const deleteSessionLocal = async (id: string) => {
  const sessions = (await getSessions()).filter(s => s.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function App() {
  const [view, setView] = useState<AppView>(AppView.Home);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const data = await getSessions();
    setSessions(data);
  };

  const renderHome = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Live Sports Tagger</Text>
          <Text style={styles.subtitle}>Professional tagging workflow</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setView(AppView.Setup)}>
          <Plus color="white" size={20} />
          <Text style={styles.buttonText}>New</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.list}>
        {sessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Video color="#475569" size={48} />
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <TouchableOpacity onPress={() => setView(AppView.Setup)}>
              <Text style={styles.emptyAction}>Create your first session &rarr;</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sessions.map(s => (
            <TouchableOpacity key={s.id} style={styles.card} onPress={() => { setCurrentSession(s); setView(AppView.Live); }}>
              <View style={styles.cardInfo}>
                <View style={styles.row}>
                  <Text style={styles.tagLabel}>{s.sport}</Text>
                  <Text style={styles.cardSub}> • {new Date(s.createdAd).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.cardTitle}>{s.matchTitle}</Text>
                <Text style={styles.cardSub}>{s.teamA} vs {s.teamB} • {s.tags.length} tags</Text>
              </View>
              <TouchableOpacity onPress={() => deleteSessionLocal(s.id).then(loadSessions)}>
                <Trash2 color="#ef4444" size={20} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );

  const renderSetup = () => {
    const [sport, setSport] = useState(SportType.Soccer);
    const [title, setTitle] = useState('');
    const [teamA, setTeamA] = useState('');
    const [teamB, setTeamB] = useState('');

    const handleStart = async () => {
      const config = DEFAULT_SPORTS[sport] || DEFAULT_SPORTS[SportType.Soccer];
      const session: Session = {
        id: Math.random().toString(36).substr(2, 9),
        createdAd: Date.now(),
        matchTitle: title || 'Match',
        competition: 'League',
        sport,
        teamA: teamA || 'Team A',
        teamB: teamB || 'Team B',
        periods: config.periods,
        periodDurationMinutes: config.duration,
        cameraId: 'Cam 1',
        fps: 25,
        preRoll: 5,
        postRoll: 5,
        customEvents: config.events,
        tags: []
      };
      await saveSessionLocal(session);
      setCurrentSession(session);
      setView(AppView.Live);
      loadSessions();
    };

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setView(AppView.Home)}>
            <ArrowLeft color="#94a3b8" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Match Setup</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.padding}>
          <Text style={styles.label}>Match Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Man Utd vs Liverpool" placeholderTextColor="#475569" />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Team A</Text>
              <TextInput style={styles.input} value={teamA} onChangeText={setTeamA} />
            </View>
            <View style={{ width: 12 }} />
            <View style={styles.flex1}>
              <Text style={styles.label}>Team B</Text>
              <TextInput style={styles.input} value={teamB} onChangeText={setTeamB} />
            </View>
          </View>
          <TouchableOpacity style={[styles.primaryButton, styles.mtLarge]} onPress={handleStart}>
            <Text style={styles.buttonText}>Start Session</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  };

  const renderLive = () => {
    if (!currentSession) return null;
    const [status, setStatus] = useState(MatchStatus.NotStarted);
    const [clock, setClock] = useState(0);
    const [activeTeam, setActiveTeam] = useState<'Team A' | 'Team B'>('Team A');
    const timerRef = useRef<any>(null);

    useEffect(() => {
      if (status === MatchStatus.Live) {
        timerRef.current = setInterval(() => setClock(c => c + 1), 1000);
      } else {
        clearInterval(timerRef.current);
      }
      return () => clearInterval(timerRef.current);
    }, [status]);

    const tagEvent = (evt: EventDefinition) => {
      if (status !== MatchStatus.Live) {
        Alert.alert("Paused", "Start the timer to tag.");
        return;
      }
      const newTag: Tag = {
        eventId: Math.random().toString(36).substr(2, 9),
        sport: currentSession.sport,
        matchTitle: currentSession.matchTitle,
        competition: currentSession.competition,
        dateTime: new Date().toISOString(),
        teamA: currentSession.teamA,
        teamB: currentSession.teamB,
        teamTagged: activeTeam,
        eventType: evt.label,
        periodIndex: 1,
        periodName: '1st Half',
        gameClockTime: formatTime(clock),
        absoluteTimestamp: Date.now(),
        fps: currentSession.fps,
        startTimeSeconds: Math.max(0, clock - 5),
        endTimeSeconds: clock + 5,
        startFrame: (clock - 5) * currentSession.fps,
        endFrame: (clock + 5) * currentSession.fps,
        cameraId: currentSession.cameraId
      };
      const updated = { ...currentSession, tags: [newTag, ...currentSession.tags] };
      setCurrentSession(updated);
      saveSessionLocal(updated);
    };

    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.darkHeader}>
          <View style={styles.rowBetween}>
            <TouchableOpacity onPress={() => setView(AppView.Home)}>
              <ArrowLeft color="white" size={24} />
            </TouchableOpacity>
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTime(clock)}</Text>
              <Text style={styles.periodText}>{status}</Text>
            </View>
            <TouchableOpacity onPress={() => setStatus(status === MatchStatus.Live ? MatchStatus.Paused : MatchStatus.Live)}>
              {status === MatchStatus.Live ? <Pause color="#10b981" fill="#10b981" size={32} /> : <Play color="#10b981" fill="#10b981" size={32} />}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={styles.flex1}>
          <View style={styles.teamTabs}>
            <TouchableOpacity style={[styles.teamTab, activeTeam === 'Team A' && styles.activeTabA]} onPress={() => setActiveTeam('Team A')}>
              <Text style={[styles.tabText, activeTeam === 'Team A' && styles.activeTabText]}>{currentSession.teamA}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.teamTab, activeTeam === 'Team B' && styles.activeTabB]} onPress={() => setActiveTeam('Team B')}>
              <Text style={[styles.tabText, activeTeam === 'Team B' && styles.activeTabText]}>{currentSession.teamB}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.grid}>
            {currentSession.customEvents?.map(evt => (
              <TouchableOpacity key={evt.id} style={[styles.tagButton, { backgroundColor: evt.color || '#334155' }]} onPress={() => tagEvent(evt)}>
                <Text style={styles.tagButtonText}>{evt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setView(AppView.Review)}>
              <Text style={styles.buttonText}>REVIEW & EXPORT</Text>
              <ArrowRight color="white" size={18} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderReview = () => {
    if (!currentSession) return null;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setView(AppView.Live)}>
            <ArrowLeft color="#94a3b8" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Review</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.padding}>
          {currentSession.tags.map(tag => (
            <View key={tag.eventId} style={styles.reviewCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.tagLabel}>{tag.gameClockTime}</Text>
                <TouchableOpacity onPress={() => {
                   const updated = { ...currentSession, tags: currentSession.tags.filter(t => t.eventId !== tag.eventId) };
                   setCurrentSession(updated);
                   saveSessionLocal(updated);
                }}>
                  <Trash2 color="#ef4444" size={16} />
                </TouchableOpacity>
              </View>
              <Text style={styles.reviewTitle}>{tag.eventType}</Text>
              <Text style={styles.cardSub}>{tag.teamTagged}</Text>
            </View>
          ))}
          <TouchableOpacity style={[styles.primaryButton, styles.mtLarge]} onPress={() => Alert.alert("Export", "Ready to download.")}>
            <Download color="white" size={20} />
            <Text style={styles.buttonText}>Export All Files</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  };

  return (
    <View style={styles.root}>
      {view === AppView.Home && renderHome()}
      {view === AppView.Setup && renderSetup()}
      {view === AppView.Live && renderLive()}
      {view === AppView.Review && renderReview()}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  container: { flex: 1, backgroundColor: '#020617' },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  darkHeader: { backgroundColor: '#0f172a', padding: 15, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 14, color: '#94a3b8' },
  primaryButton: { backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  secondaryButton: { backgroundColor: '#334155', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  list: { flex: 1, padding: 15 },
  card: { backgroundColor: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1e293b', flexDirection: 'row', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginVertical: 4 },
  cardSub: { fontSize: 13, color: '#64748b' },
  tagLabel: { backgroundColor: '#1e293b', color: '#818cf8', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex1: { flex: 1 },
  padding: { padding: 20 },
  label: { color: '#94a3b8', fontSize: 14, marginBottom: 6, fontWeight: 'bold' },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, color: 'white', fontSize: 16, marginBottom: 15 },
  mtLarge: { marginTop: 30 },
  timerContainer: { alignItems: 'center' },
  timerText: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  periodText: { fontSize: 12, color: '#818cf8', fontWeight: 'bold' },
  teamTabs: { flexDirection: 'row', backgroundColor: '#0f172a', margin: 10, borderRadius: 10, padding: 4 },
  teamTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTabA: { backgroundColor: '#4f46e5' },
  activeTabB: { backgroundColor: '#e11d48' },
  tabText: { color: '#64748b', fontWeight: 'bold' },
  activeTabText: { color: 'white' },
  grid: { padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  tagButton: { width: (Dimensions.get('window').width / 2) - 20, height: 100, borderRadius: 15, alignItems: 'center', justifyContent: 'center', padding: 10 },
  tagButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18, textAlign: 'center' },
  footer: { padding: 15, borderTopWidth: 1, borderTopColor: '#1e293b' },
  reviewCard: { backgroundColor: '#0f172a', borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#1e293b' },
  reviewTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 5 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 15 },
  emptyAction: { color: '#818cf8', fontWeight: 'bold', marginTop: 15 }
});