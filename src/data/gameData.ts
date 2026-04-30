export const themes = [
  { bg: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)', name: 'Ocean Night' },
  { bg: 'linear-gradient(135deg, #2d1b69, #11998e, #38ef7d)', name: 'Forest Magic' },
  { bg: 'linear-gradient(135deg, #55a3ff, #003d82, #001f3f)', name: 'Midnight Blue' },
];

export const sounds: Record<string, { name: string; emoji: string; description: string; file: string }> = {
  waterfall: { name: 'Waterfall Sound', emoji: '💧', description: 'Peaceful waterfall sounds to help you relax', file: '/audio/waterfalls.mp3' },
  forest: { name: 'Forest Sound', emoji: '🌲', description: 'Calming forest ambience with birds', file: '/audio/forest.mp3' },
};

export const feelings: Record<string, { emoji: string; name: string; color: string; prompt: string }> = {
  happy: { emoji: '😊', name: 'HAPPY', color: '#FFD700', prompt: "I see you're feeling happy! 😊 That's wonderful! What made you feel so happy today? I'd love to hear about it!" },
  sad: { emoji: '😢', name: 'SAD', color: '#4ECDC4', prompt: "I notice you're feeling sad 😢. I'm here for you. Would you like to tell me what's making you feel this way? Sometimes talking helps." },
  tired: { emoji: '😴', name: 'TIRED', color: '#9B59B6', prompt: "You're feeling tired 😴. That's okay! Everyone needs rest. Have you been doing lots of activities today? Would you like to talk about it or maybe try some calm breathing?" },
  scared: { emoji: '😨', name: 'SCARED', color: '#5DADE2', prompt: "I can see you're feeling scared 😨. It's okay to feel scared sometimes. I'm here with you. Can you tell me what's making you feel scared? We can work through it together." },
  angry: { emoji: '😠', name: 'ANGRY', color: '#E74C3C', prompt: "You're feeling angry 😠. Those feelings are okay to have. What happened that made you feel angry? Let's talk about it and see if we can help you feel better." },
  nervous: { emoji: '😰', name: 'NERVOUS', color: '#88B04B', prompt: "I see you're feeling nervous 😰. It's normal to feel nervous sometimes. What's making you feel this way? Talking about it might help you feel calmer." },
  shy: { emoji: '😳', name: 'SHY', color: '#FFB6C1', prompt: "You're feeling shy 😳. That's perfectly fine! Many people feel shy sometimes. Is there something you'd like to share with me? I'm a good listener and I won't judge." },
  excited: { emoji: '🤩', name: 'EXCITED', color: '#FF8C42', prompt: "Wow, you're feeling excited 🤩! That's amazing! What's got you so excited? I want to hear all about it! Your excitement makes me happy too!" },
  bored: { emoji: '😑', name: 'BORED', color: '#F4D03F', prompt: "You're feeling bored 😑. I understand! Would you like to do something fun? We could chat about interesting topics, play a game, or I could tell you a story. What sounds good?" },
  silly: { emoji: '😜', name: 'SILLY', color: '#16A085', prompt: "You're feeling silly 😜! That's fun! Being silly is great! Want to share something funny with me? Or shall we have a playful conversation?" },
  worried: { emoji: '😟', name: 'WORRIED', color: '#8E44AD', prompt: "I can tell you're worried 😟. It's okay to worry, but I'm here to help. What's on your mind? Let's talk about what's worrying you and see if we can make it better together." },
  sick: { emoji: '🤒', name: 'SICK', color: '#5DADE2', prompt: "Oh no, you're not feeling well 🤒. I'm sorry you're sick. Make sure to rest and drink water. Would you like to talk about how you're feeling? I'm here to keep you company." },
};

export const memoryGameEmojis: Record<number, string[]> = {
  1: ['🐱', '🐭', '🐶', '🐰'],
  2: ['🍎', '🍌', '🍇', '🍊', '🍓', '🍉'],
  3: ['⚽', '🏀', '🎾', '⚾', '🏐', '🎱', '🏈', '🎳'],
  4: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐'],
  5: ['🌟', '⭐', '✨', '💫', '🌠', '🌈', '☀️', '🌙', '⚡', '🔥', '💧', '🌸'],
  6: ['😀', '😂', '😍', '😎', '🤗', '😜', '🥳', '😇', '🤩', '😋', '🥰', '😁', '🤓', '😸', '😺', '🐼', '🦊', '🐨'],
};

export const shapesData: Record<number, { shape: string; name: string; color: string }[]> = {
  1: [{ shape: '●', name: 'Circle', color: '#4fc3f7' }, { shape: '■', name: 'Square', color: '#66bb6a' }, { shape: '▲', name: 'Triangle', color: '#ffa726' }],
  2: [{ shape: '●', name: 'Circle', color: '#4fc3f7' }, { shape: '■', name: 'Square', color: '#66bb6a' }, { shape: '▲', name: 'Triangle', color: '#ffa726' }, { shape: '⬠', name: 'Pentagon', color: '#ab47bc' }],
  3: [{ shape: '●', name: 'Circle', color: '#4fc3f7' }, { shape: '■', name: 'Square', color: '#66bb6a' }, { shape: '▲', name: 'Triangle', color: '#ffa726' }, { shape: '⬠', name: 'Pentagon', color: '#ab47bc' }, { shape: '⬡', name: 'Hexagon', color: '#ef5350' }],
  4: [{ shape: '●', name: 'Circle', color: '#4fc3f7' }, { shape: '■', name: 'Square', color: '#66bb6a' }, { shape: '▲', name: 'Triangle', color: '#ffa726' }, { shape: '⬠', name: 'Pentagon', color: '#ab47bc' }, { shape: '⬡', name: 'Hexagon', color: '#ef5350' }, { shape: '◆', name: 'Diamond', color: '#ffd54f' }],
  5: [{ shape: '●', name: 'Circle', color: '#4fc3f7' }, { shape: '■', name: 'Square', color: '#66bb6a' }, { shape: '▲', name: 'Triangle', color: '#ffa726' }, { shape: '⬠', name: 'Pentagon', color: '#ab47bc' }, { shape: '⬡', name: 'Hexagon', color: '#ef5350' }, { shape: '◆', name: 'Diamond', color: '#ffd54f' }, { shape: '▭', name: 'Rectangle', color: '#42a5f5' }],
  6: [{ shape: '●', name: 'Circle', color: '#4fc3f7' }, { shape: '■', name: 'Square', color: '#66bb6a' }, { shape: '▲', name: 'Triangle', color: '#ffa726' }, { shape: '⬠', name: 'Pentagon', color: '#ab47bc' }, { shape: '⬡', name: 'Hexagon', color: '#ef5350' }, { shape: '◆', name: 'Diamond', color: '#ffd54f' }, { shape: '▭', name: 'Rectangle', color: '#42a5f5' }, { shape: '★', name: 'Star', color: '#ffeb3b' }],
  7: [{ shape: '●', name: 'Circle', color: '#4fc3f7' }, { shape: '■', name: 'Square', color: '#66bb6a' }, { shape: '▲', name: 'Triangle', color: '#ffa726' }, { shape: '⬠', name: 'Pentagon', color: '#ab47bc' }, { shape: '⬡', name: 'Hexagon', color: '#ef5350' }, { shape: '◆', name: 'Diamond', color: '#ffd54f' }, { shape: '▭', name: 'Rectangle', color: '#42a5f5' }, { shape: '★', name: 'Star', color: '#ffeb3b' }, { shape: '♥', name: 'Heart', color: '#e91e63' }],
  8: [{ shape: '●', name: 'Circle', color: '#4fc3f7' }, { shape: '■', name: 'Square', color: '#66bb6a' }, { shape: '▲', name: 'Triangle', color: '#ffa726' }, { shape: '⬠', name: 'Pentagon', color: '#ab47bc' }, { shape: '⬡', name: 'Hexagon', color: '#ef5350' }, { shape: '◆', name: 'Diamond', color: '#ffd54f' }, { shape: '▭', name: 'Rectangle', color: '#42a5f5' }, { shape: '★', name: 'Star', color: '#ffeb3b' }, { shape: '♥', name: 'Heart', color: '#e91e63' }, { shape: '⯃', name: 'Octagon', color: '#26c6da' }],
  9: [{ shape: '●', name: 'Circle', color: '#4fc3f7' }, { shape: '■', name: 'Square', color: '#66bb6a' }, { shape: '▲', name: 'Triangle', color: '#ffa726' }, { shape: '⬠', name: 'Pentagon', color: '#ab47bc' }, { shape: '⬡', name: 'Hexagon', color: '#ef5350' }, { shape: '◆', name: 'Diamond', color: '#ffd54f' }, { shape: '▭', name: 'Rectangle', color: '#42a5f5' }, { shape: '★', name: 'Star', color: '#ffeb3b' }, { shape: '♥', name: 'Heart', color: '#e91e63' }, { shape: '⯃', name: 'Octagon', color: '#26c6da' }, { shape: '▱', name: 'Parallelogram', color: '#9575cd' }],
  10: [{ shape: '●', name: 'Circle', color: '#4fc3f7' }, { shape: '■', name: 'Square', color: '#66bb6a' }, { shape: '▲', name: 'Triangle', color: '#ffa726' }, { shape: '⬠', name: 'Pentagon', color: '#ab47bc' }, { shape: '⬡', name: 'Hexagon', color: '#ef5350' }, { shape: '◆', name: 'Diamond', color: '#ffd54f' }, { shape: '▭', name: 'Rectangle', color: '#42a5f5' }, { shape: '★', name: 'Star', color: '#ffeb3b' }, { shape: '♥', name: 'Heart', color: '#e91e63' }, { shape: '⯃', name: 'Octagon', color: '#26c6da' }, { shape: '▱', name: 'Parallelogram', color: '#9575cd' }, { shape: '⬭', name: 'Oval (Ellipse)', color: '#78909c' }],
};

export const colorsData: Record<number, { color: string; name: string }[]> = {
  1: [{ color: '#FF0000', name: 'Red' }, { color: '#0000FF', name: 'Blue' }, { color: '#FFFF00', name: 'Yellow' }],
  2: [{ color: '#FF0000', name: 'Red' }, { color: '#0000FF', name: 'Blue' }, { color: '#FFFF00', name: 'Yellow' }, { color: '#00FF00', name: 'Green' }],
  3: [{ color: '#FF0000', name: 'Red' }, { color: '#0000FF', name: 'Blue' }, { color: '#FFFF00', name: 'Yellow' }, { color: '#00FF00', name: 'Green' }, { color: '#FFA500', name: 'Orange' }],
  4: [{ color: '#FF0000', name: 'Red' }, { color: '#0000FF', name: 'Blue' }, { color: '#FFFF00', name: 'Yellow' }, { color: '#00FF00', name: 'Green' }, { color: '#FFA500', name: 'Orange' }, { color: '#800080', name: 'Purple' }],
  5: [{ color: '#FF0000', name: 'Red' }, { color: '#0000FF', name: 'Blue' }, { color: '#FFFF00', name: 'Yellow' }, { color: '#00FF00', name: 'Green' }, { color: '#FFA500', name: 'Orange' }, { color: '#800080', name: 'Purple' }, { color: '#FFC0CB', name: 'Pink' }],
  6: [{ color: '#FF0000', name: 'Red' }, { color: '#0000FF', name: 'Blue' }, { color: '#FFFF00', name: 'Yellow' }, { color: '#00FF00', name: 'Green' }, { color: '#FFA500', name: 'Orange' }, { color: '#800080', name: 'Purple' }, { color: '#FFC0CB', name: 'Pink' }, { color: '#000000', name: 'Black' }],
  7: [{ color: '#FF0000', name: 'Red' }, { color: '#0000FF', name: 'Blue' }, { color: '#FFFF00', name: 'Yellow' }, { color: '#00FF00', name: 'Green' }, { color: '#FFA500', name: 'Orange' }, { color: '#800080', name: 'Purple' }, { color: '#FFC0CB', name: 'Pink' }, { color: '#000000', name: 'Black' }, { color: '#FFFFFF', name: 'White' }],
  8: [{ color: '#FF0000', name: 'Red' }, { color: '#0000FF', name: 'Blue' }, { color: '#FFFF00', name: 'Yellow' }, { color: '#00FF00', name: 'Green' }, { color: '#FFA500', name: 'Orange' }, { color: '#800080', name: 'Purple' }, { color: '#FFC0CB', name: 'Pink' }, { color: '#000000', name: 'Black' }, { color: '#FFFFFF', name: 'White' }, { color: '#808080', name: 'Gray' }],
  9: [{ color: '#FF0000', name: 'Red' }, { color: '#0000FF', name: 'Blue' }, { color: '#FFFF00', name: 'Yellow' }, { color: '#00FF00', name: 'Green' }, { color: '#FFA500', name: 'Orange' }, { color: '#800080', name: 'Purple' }, { color: '#FFC0CB', name: 'Pink' }, { color: '#000000', name: 'Black' }, { color: '#FFFFFF', name: 'White' }, { color: '#808080', name: 'Gray' }, { color: '#A52A2A', name: 'Brown' }],
  10: [{ color: '#FF0000', name: 'Red' }, { color: '#0000FF', name: 'Blue' }, { color: '#FFFF00', name: 'Yellow' }, { color: '#00FF00', name: 'Green' }, { color: '#FFA500', name: 'Orange' }, { color: '#800080', name: 'Purple' }, { color: '#FFC0CB', name: 'Pink' }, { color: '#000000', name: 'Black' }, { color: '#FFFFFF', name: 'White' }, { color: '#808080', name: 'Gray' }, { color: '#A52A2A', name: 'Brown' }, { color: '#00FFFF', name: 'Cyan' }],
};

export const bannerMessages = [
  { text: '🚀 App in development! Found a bug? Report it to <a href="mailto:info@sendelightgifts.us">info@sendelightgifts.us</a>', icon: '🔔' },
  { text: '💡 Have ideas for new features? Email us at <a href="mailto:info@sendelightgifts.us">info@sendelightgifts.us</a>', icon: '✨' },
  { text: '🎯 Help us improve! Share your feedback at <a href="mailto:info@sendelightgifts.us">info@sendelightgifts.us</a>', icon: '💬' },
];

export const gridConfigs = [
  { rows: 2, cols: 2 },
  { rows: 2, cols: 3 },
  { rows: 3, cols: 4 },
  { rows: 4, cols: 4 },
  { rows: 4, cols: 5 },
  { rows: 5, cols: 6 },
];

export const socialStories = [
  { id: 'friends', title: '👫 Meet New Friends', image: '/images/how-to-meet-new-friends.jpg' },
  { id: 'party', title: '🎉 Go to a Party', image: '/images/how-to-go-to-party.jpg' },
  { id: 'dentist', title: '🦷 Visit Dentist', image: '/images/how-to-visit-dentist.jpg' },
  { id: 'salon', title: '💇 Go to Salon', image: '/images/how-to-go-to-salon.jpg' },
  { id: 'hospital', title: '🏥 Go to Hospital', image: '/images/how-to-go-to-hospital.jpg' },
];
