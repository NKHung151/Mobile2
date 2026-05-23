export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (err) {
    return dateString;
  }
};

export const formatDuration = (minutes) => {
  if (!minutes && minutes !== 0) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};

export const getModeLabel = (mode) => {
  switch (mode) {
    case 'quiz': return 'Quiz';
    case 'homophone_groups': return 'Homophones';
    case 'question_response': return 'Q&R';
    case 'practice': return 'Practice';
    case 'chat': return 'AI Chat';
    case 'transcribe': return 'Transcribe';
    default: return mode;
  }
};

export const getModeEmoji = (mode) => {
  switch (mode) {
    case 'quiz': return '📝';
    case 'homophone_groups': return '👂';
    case 'question_response': return '🎧';
    case 'practice': return '⚡';
    case 'chat': return '🤖';
    default: return '📖';
  }
};

export const getModeBadgeColor = (mode) => {
  switch (mode) {
    case 'quiz': return '#4F46E5';
    case 'homophone_groups': return '#10B981';
    case 'question_response': return '#F59E0B';
    case 'practice': return '#8B5CF6';
    case 'chat': return '#EC4899';
    default: return '#6B7280';
  }
};
