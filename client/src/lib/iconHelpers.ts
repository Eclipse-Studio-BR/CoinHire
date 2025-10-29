// Convert tool name to filename format (e.g., "Adobe Photoshop" -> "adobe-photoshop.png")
export function getToolIcon(toolName: string): string {
  const filename = toolName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '');
  return `/images/tools-logos/${filename}.png`;
}

// Language to emoji flag mapping
export const LANGUAGE_FLAGS: Record<string, string> = {
  "Arabic": "🇸🇦",
  "Bengali": "🇧🇩",
  "Chinese (Mandarin)": "🇨🇳",
  "Chinese (Cantonese)": "🇭🇰",
  "Czech": "🇨🇿",
  "Danish": "🇩🇰",
  "Dutch": "🇳🇱",
  "English": "🇬🇧",
  "Finnish": "🇫🇮",
  "French": "🇫🇷",
  "German": "🇩🇪",
  "Greek": "🇬🇷",
  "Hebrew": "🇮🇱",
  "Hindi": "🇮🇳",
  "Hungarian": "🇭🇺",
  "Indonesian": "🇮🇩",
  "Italian": "🇮🇹",
  "Japanese": "🇯🇵",
  "Korean": "🇰🇷",
  "Malay": "🇲🇾",
  "Norwegian": "🇳🇴",
  "Polish": "🇵🇱",
  "Portuguese": "🇵🇹",
  "Romanian": "🇷🇴",
  "Russian": "🇷🇺",
  "Spanish": "🇪🇸",
  "Swedish": "🇸🇪",
  "Tagalog": "🇵🇭",
  "Tamil": "🇮🇳",
  "Thai": "🇹🇭",
  "Turkish": "🇹🇷",
  "Ukrainian": "🇺🇦",
  "Urdu": "🇵🇰",
  "Vietnamese": "🇻🇳",
};

export function getLanguageFlag(language: string): string {
  return LANGUAGE_FLAGS[language] || "🌐";
}
