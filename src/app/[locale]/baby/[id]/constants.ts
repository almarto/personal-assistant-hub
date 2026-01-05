const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  vegetable: { emoji: "🥦", color: "#1b5e20", bg: "#e8f5e9" },
  fruit: { emoji: "🍎", color: "#b71c1c", bg: "#ffebee" },
  grain: { emoji: "🌾", color: "#e65100", bg: "#fff3e0" },
  protein: { emoji: "🍗", color: "#bf360c", bg: "#fbe9e7" },
  dairy: { emoji: "🥛", color: "#0d47a1", bg: "#e3f2fd" },
  other: { emoji: "🍽️", color: "#212121", bg: "#f5f5f5" },
};

const FEEDBACK_CONFIG: Record<number, { emoji: string; color: string; bg: string }> = {
  1: { emoji: "🤮", color: "#b71c1c", bg: "#ffebee" },
  2: { emoji: "😋", color: "#1b5e20", bg: "#e8f5e9" },
  3: { emoji: "😍", color: "#1b5e20", bg: "#e8f5e9" },
};

const REACTION_CONFIG: Record<number, { emoji: string; color: string; bg: string }> = {
  1: { emoji: "😊", color: "#1b5e20", bg: "#e8f5e9" },
  2: { emoji: "😖", color: "#e65100", bg: "#fff3e0" },
  3: { emoji: "😭", color: "#b71c1c", bg: "#ffebee" },
};

export { CATEGORY_CONFIG, FEEDBACK_CONFIG, REACTION_CONFIG };
