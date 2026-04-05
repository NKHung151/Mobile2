const generateGoogleTTSUrl = (text, languageCode = "en") => {
  if (!text || text.trim() === "") {
    return "";
  }

  const encodedText = encodeURIComponent(text);
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${languageCode}&client=tw-ob`;
};

module.exports = {
  generateGoogleTTSUrl,
};
