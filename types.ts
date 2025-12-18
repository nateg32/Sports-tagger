
export enum SportType {
  Soccer = 'Soccer',
  Basketball = 'Basketball',
  Rugby = 'Rugby',
  AFL = 'AFL',
  Netball = 'Netball',
  AmericanFootball = 'American Football',
  Custom = 'Custom'
}

export interface SportConfig {
  name: string;
  periods: number;
  periodDurationMinutes: number;
  events: EventDefinition[];
}

export interface EventDefinition {
  id: string;
  label: string;
  color?: string; // hex or tailwind class hint
  type?: 'score' | 'foul' | 'general';
}

export interface Tag {
  eventId: string;
  sport: string;
  matchTitle: string;
  competition: string;
  dateTime: string; // ISO string
  teamA: string;
  teamB: string;
  teamTagged: 'Team A' | 'Team B' | 'Neutral';
  eventType: string; // The label of the button
  periodIndex: number;
  periodName: string;
  gameClockTime: string; // MM:SS
  absoluteTimestamp: number; // ms since session start
  fps: number;
  startTimeSeconds: number;
  endTimeSeconds: number;
  startFrame: number;
  endFrame: number;
  playerNumber?: string;
  notes?: string;
  cameraId: string;
}

export interface Session {
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

export enum AppView {
  Home = 'HOME',
  Setup = 'SETUP',
  Live = 'LIVE',
  Review = 'REVIEW'
}

export enum MatchStatus {
  NotStarted = 'NOT_STARTED',
  Live = 'LIVE',
  Paused = 'PAUSED',
  Halftime = 'HALFTIME',
  Finished = 'FINISHED'
}
