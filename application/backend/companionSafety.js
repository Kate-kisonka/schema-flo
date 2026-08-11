const ZERO_WIDTH_RE = /[\u200B-\u200D\u2060\uFEFF]/gu;

export const COMPANION_CRISIS_REPLY =
  "Мне очень важно, чтобы ты сейчас не оставалась с этим одна. " +
  "Если есть непосредственная опасность или ты можешь причинить себе вред, немедленно позвони 112 или обратись в ближайшую экстренную службу. " +
  "Свяжись с близким человеком и прямо скажи, что тебе нужна помощь и безопасное присутствие рядом. " +
  "Пожалуйста, как можно скорее обратись к квалифицированному специалисту по психическому здоровью. " +
  "Я не ставлю диагнозов и не могу заменить экстренную или профессиональную помощь.";

const RUSSIAN_CRISIS_PATTERNS = [
  /(?<!не\s)(?:я\s+)?(?:хочу|собираюсь|планирую|решила?|намерена?)\s+(?:умереть(?!\s+от\s+смеха)|покончить\s+с\s+собой|убить\s+себя|себя\s+убить|уйти\s+из\s+жизни|навредить\s+себе|причинить\s+себе\s+вред|порезать\s+себя)/iu,
  /(?<!не\s)(?:я\s+)?(?:хочу|собираюсь|планирую|решила?|намерена?)\s+(?:совершить\s+)?(?:суицид|самоубийство)/iu,
  /(?:я\s+)?не\s+хочу\s+(?:больше\s+)?жить(?!\s+(?:в|на)\s+)/iu,
  /(?:я\s+)?не\s+хочу\s+(?:больше\s+)?просыпаться/iu,
  /(?:мне\s+)?(?:незачем|не\s+для\s+чего)\s+жить/iu,
  /лучше\s+бы\s+я\s+(?:умерла?|сдохла?)/iu,
  /(?:я\s+)?лучше\s+(?:умру|сдохну)/iu,
  /(?:я\s+)?(?:покончу\s+с\s+собой|убью\s+себя|себя\s+убью|порежу\s+себя|уйду\s+из\s+жизни)/iu,
  /(?:у\s+меня|мне\s+приходят|есть)\s+суицидальн[\p{L}\p{M}]*\s+мысл[\p{L}\p{M}]*/iu,
  /(?:думаю|мысли?)\s+(?:о|об)\s+(?:суицид[\p{L}\p{M}]*|самоубийств[\p{L}\p{M}]*)/iu,
  /^(?:у\s+меня\s+)?есть\s+план[.!?]*$/iu,
  /(?:есть|составила?|продумала?)\s+план[,:]?\s+(?:как\s+)?(?:умереть|убить\s+себя|уйти\s+из\s+жизни|покончить\s+с\s+собой)/iu,
  /(?:хочу|собираюсь|планирую|решила?)\s+(?:прыгнуть|спрыгнуть)\s+с\s+(?:крыши|моста|высоты)/iu,
  /(?:хочу|собираюсь|планирую|решила?)\s+(?:повеситься|отравиться|вскрыть\s+(?:себе\s+)?вены|(?:выпить|принять|съесть)\s+(?:все\s+таблетки|много\s+таблеток))/iu,
  /(?:я\s+)?(?:сейчас\s+)?(?:вскрою|перережу)\s+(?:себе\s+)?вены/iu,
  /(?:я\s+)?(?:причиню|нанесу)\s+себе\s+вред/iu,
  /(?:я\s+)?уже\s+(?:выпила?|приняла?|съела?)\s+(?:все\s+таблетки|много\s+таблеток)/iu,
  /(?:я\s+)?уже\s+(?:порезала?|поранила?|навредила?)\s+себя/iu,
  /(?:я\s+)?(?:режу|царапаю|травмирую)\s+себя/iu,
];

const ENGLISH_CRISIS_PATTERNS = [
  /(?<!don't\s)(?<!do\snot\s)\b(?:i\s+)?(?:want|plan|intend|decided|am\s+going)\s+to\s+(?:die|kill\s+myself|end\s+my\s+life|take\s+my\s+own\s+life|hurt\s+myself|harm\s+myself)\b/iu,
  /\bi(?:'m|\s+am)\s+going\s+to\s+(?:die|kill\s+myself|end\s+my\s+life|take\s+my\s+own\s+life|hurt\s+myself|harm\s+myself)\b/iu,
  /\bi(?:'ll|\s+will)\s+(?:kill\s+myself|end\s+my\s+life|take\s+my\s+own\s+life|hurt\s+myself|harm\s+myself)\b/iu,
  /\b(?:thinking\s+about|considering)\s+(?:suicide|killing\s+myself|ending\s+my\s+life|taking\s+my\s+own\s+life)\b/iu,
  /\bi\s+(?:do\s+not|don't)\s+want\s+to\s+live\b/iu,
  /\bi\s+(?:have\s+)?no\s+reason\s+to\s+live\b/iu,
  /\bi\s+(?:wish\s+i\s+were|would\s+be\s+better\s+off)\s+dead\b/iu,
  /(?<!denied\s)(?<!denies\s)(?<!without\s)(?<!no\s)\b(?:i(?:'m|\s+am)?\s+(?:having\s+)?|having\s+)?suicidal\s+thoughts?\b/iu,
  /\bi\s+(?:want|plan)\s+to\s+self[-\s]?harm\b/iu,
  /^(?:i\s+)?have\s+a\s+plan[.!?]*$/iu,
  /\b(?:i\s+)?(?:want|plan|intend|decided)\s+to\s+(?:jump|leap)\s+(?:off|from)\s+(?:a\s+|the\s+)?(?:roof|bridge|building)\b/iu,
  /\b(?:i\s+)?(?:want|plan|intend|decided)\s+to\s+(?:overdose|hang\s+myself|cut\s+my\s+wrists?|take\s+all\s+the\s+pills)\b/iu,
  /\bi(?:'ve|\s+have)?\s+already\s+(?:cut|hurt|harmed|injured)\s+myself\b/iu,
  /\bi(?:'ve|\s+have)?\s+already\s+overdosed\b/iu,
  /\bi\s+(?:cut|hurt|harm|injure)\s+myself\b/iu,
];

export function normalizeCompanionSafetyText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(ZERO_WIDTH_RE, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("und");
}

export function isCompanionCrisisMessage(value) {
  const normalized = normalizeCompanionSafetyText(value);
  if (!normalized) return false;
  return [...RUSSIAN_CRISIS_PATTERNS, ...ENGLISH_CRISIS_PATTERNS]
    .some((pattern) => pattern.test(normalized));
}
