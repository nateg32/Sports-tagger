
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

  // Strictly sort tags chronologically (Oldest to Newest)
  const sequentialTags = [...session.tags].sort((a, b) => a.absoluteTimestamp - b.absoluteTimestamp);

  // Events
  xml += '  <Events>\n';
  sequentialTags.forEach(tag => {
    xml += '    <Event>\n';
    xml += `      <EventId>${tag.eventId}</EventId>\n`;
    xml += `      <EventType>${escapeXml(tag.eventType)}</EventType>\n`;
    xml += `      <Team>${escapeXml(tag.teamTagged === 'Team A' ? session.teamA : tag.teamTagged === 'Team B' ? session.teamB : 'Neutral')}</Team>\n`;
    // Player Number removed as per request
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

export const generateNotesTxt = (session: Session): string => {
  let txt = `MATCH REPORT\n`;
  txt += `Title: ${session.matchTitle}\n`;
  txt += `Sport: ${session.sport}\n`;
  txt += `Date: ${new Date(session.createdAd).toLocaleDateString()} ${new Date(session.createdAd).toLocaleTimeString()}\n`;
  txt += `Competition: ${session.competition}\n`;
  txt += `Teams: ${session.teamA} vs ${session.teamB}\n`;
  txt += `Total Events: ${session.tags.length}\n`;
  txt += `================================================\n\n`;

  if (session.tags.length === 0) {
      txt += "No events recorded.\n";
  } else {
      // Strictly sort tags chronologically (Oldest to Newest)
      const sequentialTags = [...session.tags].sort((a, b) => a.absoluteTimestamp - b.absoluteTimestamp);
      
      sequentialTags.forEach(tag => {
        const time = tag.gameClockTime;
        const period = tag.periodName;
        const team = tag.teamTagged === 'Team A' ? session.teamA : tag.teamTagged === 'Team B' ? session.teamB : 'Neutral';
        
        txt += `[${time} - ${period}] ${tag.eventType}\n`;
        txt += `Team: ${team}\n`;
        // Player Number removed as per request
        if (tag.notes) txt += `Note: ${tag.notes}\n`;
        txt += `------------------------------------------------\n`;
      });
  }

  return txt;
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

export const downloadTxt = (session: Session) => {
    const txtContent = generateNotesTxt(session);
    const dateStr = new Date(session.createdAd).toISOString().split('T')[0].replace(/-/g, '');
    const safeTitle = session.matchTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${session.sport.toLowerCase()}_${safeTitle}_${dateStr}_notes.txt`;

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
