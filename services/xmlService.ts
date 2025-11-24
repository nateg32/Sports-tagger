import { Session } from '../types';

const escapeXml = (unsafe: string): string => {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

export const generateXml = (session: Session, mediaFilePath: string = ''): string => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<MatchExport>\n';
  
  // Match Info
  xml += '  <MatchInfo>\n';
  xml += `    <Title>${escapeXml(session.matchTitle)}</Title>\n`;
  xml += `    <Sport>${escapeXml(session.sport)}</Sport>\n`;
  xml += `    <Competition>${escapeXml(session.competition)}</Competition>\n`;
  xml += `    <Date>${new Date(session.createdAd).toISOString().split('T')[0]}</Date>\n`;
  xml += `    <CameraId>${escapeXml(session.cameraId)}</CameraId>\n`;
  xml += `    <Fps>${session.fps}</Fps>\n`;
  if (mediaFilePath) {
    xml += `    <MediaFilePath>${escapeXml(mediaFilePath)}</MediaFilePath>\n`;
  }
  xml += '  </MatchInfo>\n';

  // Events
  xml += '  <Events>\n';
  session.tags.forEach(tag => {
    xml += '    <Event>\n';
    xml += `      <EventId>${tag.eventId}</EventId>\n`;
    xml += `      <EventType>${escapeXml(tag.eventType)}</EventType>\n`;
    xml += `      <Team>${escapeXml(tag.teamTagged === 'Team A' ? session.teamA : tag.teamTagged === 'Team B' ? session.teamB : 'Neutral')}</Team>\n`;
    if (tag.playerNumber) xml += `      <PlayerNumber>${tag.playerNumber}</PlayerNumber>\n`;
    xml += `      <PeriodIndex>${tag.periodIndex}</PeriodIndex>\n`;
    xml += `      <PeriodName>${escapeXml(tag.periodName)}</PeriodName>\n`;
    xml += `      <GameClockTime>${tag.gameClockTime}</GameClockTime>\n`;
    xml += `      <AbsoluteTimeSeconds>${(tag.absoluteTimestamp / 1000).toFixed(3)}</AbsoluteTimeSeconds>\n`;
    xml += `      <StartTimeSeconds>${tag.startTimeSeconds.toFixed(3)}</StartTimeSeconds>\n`;
    xml += `      <EndTimeSeconds>${tag.endTimeSeconds.toFixed(3)}</EndTimeSeconds>\n`;
    xml += `      <StartFrame>${Math.round(tag.startFrame)}</StartFrame>\n`;
    xml += `      <EndFrame>${Math.round(tag.endFrame)}</EndFrame>\n`;
    if (tag.notes) xml += `      <Notes>${escapeXml(tag.notes)}</Notes>\n`;
    xml += '    </Event>\n';
  });
  xml += '  </Events>\n';
  xml += '</MatchExport>';

  return xml;
};

export const downloadXml = (session: Session, mediaFilePath: string) => {
    const xmlContent = generateXml(session, mediaFilePath);
    const dateStr = new Date(session.createdAd).toISOString().split('T')[0].replace(/-/g, '');
    const safeTitle = session.matchTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${session.sport.toLowerCase()}_${safeTitle}_${dateStr}.xml`;

    const blob = new Blob([xmlContent], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};