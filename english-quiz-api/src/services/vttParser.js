function parseVTT(vttContent) {
  if (!vttContent || typeof vttContent !== 'string') {
    return '';
  }

  const lines = vttContent.split('\n');
  const textLines = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) continue;
    if (trimmedLine.startsWith('WEBVTT')) continue;
    if (trimmedLine.startsWith('NOTE')) continue;
    if (trimmedLine.startsWith('STYLE')) continue;
    if (trimmedLine.startsWith('REGION')) continue;
    if (/^[a-zA-Z0-9-]+$/.test(trimmedLine) && !trimmedLine.includes(' ')) continue;
    if (trimmedLine.includes('-->')) continue;
    if (/^\d{2}:\d{2}/.test(trimmedLine)) continue;

    let cleanedLine = trimmedLine
      .replace(/<v[^>]*>/g, '')
      .replace(/<\/v>/g, '')
      .replace(/<c[^>]*>/g, '')
      .replace(/<\/c>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    if (cleanedLine) {
      textLines.push(cleanedLine);
    }
  }

  return textLines.join(' ').replace(/\s+/g, ' ').trim();
}

module.exports = { parseVTT };
