// Дизайн-токены. Старые ключи (bg, card, accent, green...) сохранены как алиасы:
// экраны читают их напрямую в inline-стилях и продолжают работать без правок.
// Новые группы (radius, shadow, motion, mood, phase) — опциональны для нового кода.
export const T = {
  // ——— нейтрали: перламутр (прохладный, не «бумага») ———
  bg:      "#EFEFF1",
  card:    "#F7F7F9",
  raised:  "#FDFDFE",
  border:  "#E2E2E6",
  border2: "#CCCCD3",
  text:    "#1C1C1E",
  sub:     "#54545A",
  muted:   "#8A8A90",

  // ——— акцент: приглушённая слива (замена синего #5E6AD2) ———
  accent:     "#7E6E8F",
  accentSoft: "#A99DB6",
  accentDeep: "#5B4E6C",

  red:  "#B0574F", // только ошибки и деструктивные действия — не «настроение»
  font: "'Inter', system-ui, -apple-system, sans-serif",
  fontSerif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",

  // ——— алиасы старых цветовых ключей → десатурированная семантика ———
  purple:    "#8E7C93",
  green:     "#7FA08F",
  greenDark: "#5C7E6C",
  orange:    "#C9A15E",
  yellow:    "#D2A85F",
  blue:      "#6E8CA0",
  pink:      "#B0796F",
  overlay:   "rgba(24,24,28,0.45)",

  // ——— новые токены ———
  radius: { xs: 10, sm: 14, md: 20, lg: 28, pill: 999 },
  shadow: {
    e0: "0 1px 2px rgba(28,28,40,.05)",
    e1: "0 1px 2px rgba(28,28,40,.05), 0 3px 10px rgba(28,28,40,.06)",
    e2: "0 6px 26px rgba(28,28,40,.10)",
  },
  motion: { micro: "200ms", ui: "420ms", ease: "cubic-bezier(.37,0,.63,1)" },

  // семантика настроения (десатурировано; тяжёлое = сумерки, не алярм)
  mood: {
    calm:      "#7FA08F",
    neutral:   "#C6B291",
    tender:    "#9D93B0",
    heavy:     "#6E7C92",
    activated: "#C9A15E",
  },
  // фазы цикла (пейзажная метафора; менструация — глина-роза, не алый)
  phase: {
    menstrual:  "#B07C79",
    follicular: "#8FA97E",
    ovulation:  "#D2A85F",
    luteal:     "#8E7C93",
  },
};
