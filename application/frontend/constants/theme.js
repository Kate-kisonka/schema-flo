// Дизайн-токены. Старые ключи (bg, card, accent, green...) сохранены как алиасы:
// экраны читают их напрямую в inline-стилях и продолжают работать без правок.
// Значения — ссылки на CSS-переменные (index.css), это даёт три темы
// (день / сумерки / ночь) без перерендера JS. Конкатенация "hex+альфа"
// (T.accent + "22") не работает с var(...) — используйте wash(T.accent, 13).
export const T = {
  // ——— нейтрали: перламутр (прохладный, не «бумага») ———
  bg:      "var(--sf-bg)",
  card:    "var(--sf-card)",
  raised:  "var(--sf-raised)",
  border:  "var(--sf-border)",
  border2: "var(--sf-border2)",
  text:    "var(--sf-text)",
  sub:     "var(--sf-sub)",
  muted:   "var(--sf-muted)",

  // ——— акцент: приглушённая слива (замена синего #5E6AD2) ———
  accent:     "var(--sf-accent)",
  accentSoft: "var(--sf-accent-soft)",
  accentDeep: "var(--sf-accent-deep)",
  accentWash: "var(--sf-accent-wash)",
  onAccent:   "var(--sf-on-accent)",

  red:  "var(--sf-red)", // только ошибки и деструктивные действия — не «настроение»
  font: "'Avenir Next', 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif",
  fontSerif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",

  // ——— алиасы старых цветовых ключей → десатурированная семантика ———
  purple:    "var(--sf-purple)",
  green:     "var(--sf-green)",
  greenDark: "var(--sf-green-dark)",
  orange:    "var(--sf-orange)",
  yellow:    "var(--sf-yellow)",
  blue:      "var(--sf-blue)",
  pink:      "var(--sf-pink)",
  overlay:   "var(--sf-overlay)",

  // ——— «геройская» заливка для полноэкранных карточек (обложка приватности) ———
  heroBg: "linear-gradient(160deg, var(--sf-hero-a), var(--sf-hero-b))",
  onHero: "var(--sf-on-hero)",

  // ——— новые токены ———
  radius: { xs: 10, sm: 14, md: 20, lg: 28, pill: 999 },
  shadow: {
    e0: "var(--sf-shadow-e0)",
    e1: "var(--sf-shadow-e1)",
    e2: "var(--sf-shadow-e2)",
  },
  motion: { micro: "200ms", ui: "420ms", ease: "cubic-bezier(.37,0,.63,1)" },

  // семантика настроения (десатурировано; тяжёлое = сумерки, не алярм)
  mood: {
    calm:      "var(--sf-mood-calm)",
    neutral:   "var(--sf-mood-neutral)",
    tender:    "var(--sf-mood-tender)",
    heavy:     "var(--sf-mood-heavy)",
    activated: "var(--sf-mood-activated)",
  },
  // фазы цикла (пейзажная метафора; менструация — глина-роза, не алый)
  phase: {
    menstrual:  "var(--sf-phase-menstrual)",
    follicular: "var(--sf-phase-follicular)",
    ovulation:  "var(--sf-phase-ovulation)",
    luteal:     "var(--sf-phase-luteal)",
  },
};

// Прозрачная «размывка» цвета — замена hex-конкатенации (T.accent + "22"),
// работает и с var(...). wash(T.accent, 13) ≈ прежнее T.accent + "22".
export const wash = (color, pct = 10) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;
