import { SportType, SportConfig, EventDefinition } from './types';

const makeEvent = (label: string, type: EventDefinition['type'] = 'general', color?: string): EventDefinition => ({
  id: label.toLowerCase().replace(/\s/g, '_'),
  label,
  type,
  color
});

export const DEFAULT_SPORTS: Record<string, SportConfig> = {
  [SportType.Soccer]: {
    name: 'Soccer',
    periods: 2,
    periodDurationMinutes: 45,
    events: [
      makeEvent('Goal', 'score', 'bg-emerald-600'),
      makeEvent('Shot on Target', 'general', 'bg-blue-600'),
      makeEvent('Shot Off Target', 'general', 'bg-slate-600'),
      makeEvent('Foul', 'foul', 'bg-orange-600'),
      makeEvent('Yellow Card', 'foul', 'bg-yellow-600 text-black'),
      makeEvent('Red Card', 'foul', 'bg-red-600'),
      makeEvent('Corner', 'general', 'bg-indigo-600'),
      makeEvent('Free Kick', 'general', 'bg-indigo-500'),
      makeEvent('Penalty', 'score', 'bg-purple-600'),
      makeEvent('Offside', 'foul', 'bg-slate-500'),
      makeEvent('Substitution', 'general', 'bg-slate-500'),
      makeEvent('Big Chance', 'general', 'bg-pink-600'),
    ]
  },
  [SportType.Basketball]: {
    name: 'Basketball',
    periods: 4,
    periodDurationMinutes: 10,
    events: [
      makeEvent('2PT Made', 'score', 'bg-emerald-600'),
      makeEvent('3PT Made', 'score', 'bg-emerald-500'),
      makeEvent('Free Throw', 'score', 'bg-emerald-700'),
      makeEvent('Rebound', 'general', 'bg-blue-600'),
      makeEvent('Assist', 'general', 'bg-indigo-600'),
      makeEvent('Steal', 'general', 'bg-orange-500'),
      makeEvent('Block', 'general', 'bg-red-500'),
      makeEvent('Turnover', 'foul', 'bg-slate-500'),
      makeEvent('Foul', 'foul', 'bg-red-600'),
      makeEvent('Timeout', 'general', 'bg-yellow-600 text-black'),
    ]
  },
  [SportType.Rugby]: {
    name: 'Rugby',
    periods: 2,
    periodDurationMinutes: 40,
    events: [
      makeEvent('Try', 'score', 'bg-emerald-600'),
      makeEvent('Conversion', 'score', 'bg-emerald-500'),
      makeEvent('Penalty Goal', 'score', 'bg-emerald-700'),
      makeEvent('Missed Kick', 'general', 'bg-red-400'),
      makeEvent('Scrum', 'general', 'bg-slate-600'),
      makeEvent('Lineout', 'general', 'bg-slate-500'),
      makeEvent('Tackle', 'general', 'bg-blue-600'),
      makeEvent('Knock-on', 'foul', 'bg-orange-600'),
      makeEvent('Yellow Card', 'foul', 'bg-yellow-600 text-black'),
      makeEvent('Red Card', 'foul', 'bg-red-600'),
    ]
  },
  [SportType.AFL]: {
    name: 'AFL',
    periods: 4,
    periodDurationMinutes: 20,
    events: [
      makeEvent('Goal', 'score', 'bg-emerald-600'),
      makeEvent('Behind', 'score', 'bg-emerald-800'),
      makeEvent('Mark', 'general', 'bg-blue-600'),
      makeEvent('Tackle', 'general', 'bg-orange-600'),
      makeEvent('Clearance', 'general', 'bg-indigo-600'),
      makeEvent('Inside 50', 'general', 'bg-purple-600'),
      makeEvent('Free Kick', 'foul', 'bg-yellow-600 text-black'),
      makeEvent('Turnover', 'foul', 'bg-red-600'),
      makeEvent('Interception', 'general', 'bg-cyan-600'),
    ]
  },
  [SportType.Netball]: {
    name: 'Netball',
    periods: 4,
    periodDurationMinutes: 15,
    events: [
      makeEvent('Goal', 'score', 'bg-emerald-600'),
      makeEvent('Missed Shot', 'general', 'bg-red-400'),
      makeEvent('Intercept', 'general', 'bg-blue-600'),
      makeEvent('Turnover', 'foul', 'bg-orange-600'),
      makeEvent('Contact', 'foul', 'bg-red-600'),
      makeEvent('Obstruction', 'foul', 'bg-yellow-600 text-black'),
    ]
  },
  [SportType.AmericanFootball]: {
    name: 'American Football',
    periods: 4,
    periodDurationMinutes: 15,
    events: [
      makeEvent('Touchdown', 'score', 'bg-emerald-600'),
      makeEvent('Field Goal', 'score', 'bg-emerald-500'),
      makeEvent('First Down', 'general', 'bg-blue-600'),
      makeEvent('Interception', 'general', 'bg-red-500'),
      makeEvent('Fumble', 'foul', 'bg-orange-600'),
      makeEvent('Sack', 'general', 'bg-purple-600'),
      makeEvent('Penalty', 'foul', 'bg-yellow-500 text-black'),
      makeEvent('Timeout', 'general', 'bg-slate-500'),
    ]
  },
  [SportType.Custom]: {
    name: 'Custom',
    periods: 2,
    periodDurationMinutes: 30,
    events: [
      makeEvent('Highlight', 'general', 'bg-emerald-600'),
      makeEvent('Error', 'foul', 'bg-red-600'),
    ]
  }
};