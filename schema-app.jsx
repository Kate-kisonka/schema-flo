import React, { useState, useEffect, useRef } from "react";

// ─── DATA ──────────────────────────────────────────────────────────────────────

const SCHEMAS = [
  { id: "abandonment", name: "Покинутость", domain: "Разлучение", emoji: "🌊", desc: "Страх что близкие уйдут или бросят" },
  { id: "mistrust", name: "Недоверие", domain: "Разлучение", emoji: "🔒", desc: "Ожидание что другие причинят вред или обманут" },
  { id: "deprivation", name: "Эмоциональная депривация", domain: "Разлучение", emoji: "🫙", desc: "Убеждение что никто не даст достаточно тепла и заботы" },
  { id: "defectiveness", name: "Дефективность / Стыд", domain: "Разлучение", emoji: "💔", desc: "Ощущение себя дефектной, нелюбимой, хуже других" },
  { id: "isolation", name: "Социальная изоляция", domain: "Разлучение", emoji: "🏝️", desc: "Чувство отчуждённости от других людей" },
  { id: "dependence", name: "Зависимость", domain: "Автономия", emoji: "🪡", desc: "Неспособность справляться с повседневной жизнью без помощи" },
  { id: "vulnerability", name: "Уязвимость", domain: "Автономия", emoji: "⚡", desc: "Страх что катастрофа случится в любой момент" },
  { id: "enmeshment", name: "Слияние / Неразвитость Я", domain: "Автономия", emoji: "🌀", desc: "Чрезмерная эмоциональная вовлечённость с близким" },
  { id: "failure", name: "Неудача", domain: "Автономия", emoji: "📉", desc: "Убеждение что ты неизбежно потерпишь неудачу" },
  { id: "entitlement", name: "Привилегированность", domain: "Границы", emoji: "👑", desc: "Убеждение что правила не для тебя" },
  { id: "self_control", name: "Недостаточный самоконтроль", domain: "Границы", emoji: "🌪️", desc: "Трудности с контролем импульсов и фрустрации" },
  { id: "subjugation", name: "Подчинение", domain: "Другие", emoji: "🎭", desc: "Подавление своих желаний ради других" },
  { id: "self_sacrifice", name: "Самопожертвование", domain: "Другие", emoji: "🕯️", desc: "Чрезмерная забота о других в ущерб себе" },
  { id: "approval", name: "Поиск одобрения", domain: "Другие", emoji: "🪞", desc: "Потребность в постоянном одобрении и признании" },
  { id: "negativity", name: "Негативизм", domain: "Сверхбдительность", emoji: "🌧️", desc: "Фокус на негативных сторонах жизни" },
  { id: "inhibition", name: "Эмоциональное подавление", domain: "Сверхбдительность", emoji: "🧊", desc: "Подавление спонтанных эмоций и импульсов" },
  { id: "standards", name: "Жёсткие стандарты", domain: "Сверхбдительность", emoji: "⚖️", desc: "Давление постоянно соответствовать высоким стандартам" },
  { id: "punitiveness", name: "Карательность", domain: "Сверхбдительность", emoji: "🔨", desc: "Убеждение что люди должны быть строго наказаны за ошибки" },
];

const MOODS = [
  { id: "calm", label: "Спокойствие", color: "#7EC8B0", emoji: "🌿" },
  { id: "joy", label: "Радость", color: "#E9C46A", emoji: "✨" },
  { id: "anxious", label: "Тревога", color: "#F4A261", emoji: "😰" },
  { id: "fear", label: "Страх", color: "#7B68A0", emoji: "😨" },
  { id: "sad", label: "Грусть", color: "#74B3CE", emoji: "🫧" },
  { id: "tearful", label: "Плаксивость", color: "#89B4CC", emoji: "😢" },
  { id: "irritable", label: "Раздражение", color: "#E8A838", emoji: "😤" },
  { id: "angry", label: "Злость", color: "#E76F51", emoji: "🔥" },
  { id: "rage", label: "Вспышка", color: "#C1392B", emoji: "💢" },
  { id: "shame", label: "Стыд", color: "#B5838D", emoji: "🌹" },
  { id: "numb", label: "Пустота", color: "#9B9B9B", emoji: "🌫️" },
  { id: "overwhelmed", label: "Перегрузка", color: "#6D4C7D", emoji: "🌊" },
];

const CYCLE_PHASES = [
  {
    days: [1,2,3,4,5], name: "Менструация", color: "#E76F51",
    tip: "Время отдыха и восстановления",
    gynComment: "Эстроген и прогестерон на минимуме. Матка сокращается, эндометрий отторгается. Норма — тянущие боли, усталость, снижение иммунитета.",
    mentalComment: "Схемы брошенности и дефективности активнее. Потребность в уединении — физиологична. Снизь планку требований к себе.",
  },
  {
    days: [6,7,8,9,10,11,12,13], name: "Фолликулярная", color: "#E9C46A",
    tip: "Энергия растёт, хорошее время для новых начинаний",
    gynComment: "Эстроген растёт — фолликулы созревают. Выделения становятся тянущимися. Энергия, настроение и когнитивные функции улучшаются.",
    mentalComment: "Схемы активируются меньше. Хорошее время для сложных разговоров, новых решений, терапевтической работы.",
  },
  {
    days: [14,15,16], name: "Овуляция", color: "#7EC8B0",
    tip: "Пик энергии — ты на подъёме",
    gynComment: "Пик эстрогена, ЛГ и ФСГ. Прозрачные тянущиеся выделения. Возможны боли сбоку. Пик либидо.",
    mentalComment: "Социальные потребности на пике. Хорошее время для близости и сотрудничества.",
  },
  {
    days: [17,18,19,20,21,22,23,24,25,26,27,28], name: "Лютеиновая", color: "#B5838D",
    tip: "Схемы активнее — будь нежна с собой",
    gynComment: "Прогестерон растёт, потом падает. Задержка жидкости, отёчность, чувствительность груди — норма. ПМС в дни 21–28.",
    mentalComment: "Время наибольшей уязвимости. Раздражительность, плаксивость — биохимия, не слабость. Требуется больше заботы о себе.",
  },
];

const PHYSICAL_SYMPTOMS = [
  { id: "cramps", label: "Спазмы", emoji: "🌀" },
  { id: "headache", label: "Голова", emoji: "🤯" },
  { id: "breast_pain", label: "Грудь", emoji: "💗" },
  { id: "back_pain", label: "Спина", emoji: "🦴" },
  { id: "fatigue", label: "Усталость", emoji: "😴" },
  { id: "acne", label: "Акне", emoji: "😞" },
  { id: "insomnia", label: "Бессонница", emoji: "🌙" },
  { id: "appetite_up", label: "Аппетит ↑", emoji: "🍫" },
  { id: "appetite_down", label: "Аппетит ↓", emoji: "🥗" },
  { id: "swelling", label: "Отёки", emoji: "💧" },
  { id: "nausea", label: "Тошнота", emoji: "🤢" },
  { id: "hot_flash", label: "Приливы", emoji: "🔥" },
];

const DISCHARGE_TYPES = [
  { id: "none", label: "Нет", emoji: "⭕" },
  { id: "dry", label: "Сухо", emoji: "🏜️" },
  { id: "white", label: "Белые/кремовые", emoji: "🤍" },
  { id: "clear", label: "Прозрачные тянущиеся", emoji: "💎" },
  { id: "watery", label: "Водянистые", emoji: "💧" },
  { id: "bloody", label: "Кровянистые", emoji: "🩸" },
];

const DIGESTION = [
  { id: "normal", label: "Обычно", emoji: "✅" },
  { id: "bloating", label: "Вздутие", emoji: "🫧" },
  { id: "constipation", label: "Запор", emoji: "🪨" },
  { id: "diarrhea", label: "Диарея", emoji: "💨" },
  { id: "nausea", label: "Тошнота", emoji: "🤢" },
];

const LIBIDO = [
  { id: "none", label: "Нет", emoji: "❄️" },
  { id: "low", label: "Низкое", emoji: "🌙" },
  { id: "medium", label: "Среднее", emoji: "🌤️" },
  { id: "high", label: "Высокое", emoji: "🔥" },
];

const NEEDS = [
  { id: "food", label: "Еда", level: "physio", emoji: "🍽️" },
  { id: "sleep", label: "Сон", level: "physio", emoji: "😴" },
  { id: "water", label: "Вода", level: "physio", emoji: "💧" },
  { id: "movement", label: "Движение", level: "physio", emoji: "🚶" },
  { id: "safety", label: "Безопасность", level: "safety", emoji: "🛡️" },
  { id: "stability", label: "Стабильность", level: "safety", emoji: "⚓" },
  { id: "confidence", label: "Уверенность", level: "safety", emoji: "💪" },
  { id: "communication", label: "Общение", level: "social", emoji: "💬" },
  { id: "support", label: "Поддержка", level: "social", emoji: "🤝" },
  { id: "love", label: "Любовь", level: "social", emoji: "💗" },
  { id: "care", label: "Забота", level: "social", emoji: "🌸" },
  { id: "respect", label: "Уважение", level: "esteem", emoji: "🌟" },
  { id: "recognition", label: "Признание", level: "esteem", emoji: "🏅" },
  { id: "attachment", label: "Привязанность", level: "esteem", emoji: "🔗" },
  { id: "creativity", label: "Творчество", level: "growth", emoji: "🎨" },
  { id: "development", label: "Развитие", level: "growth", emoji: "🌱" },
  { id: "knowledge", label: "Познание", level: "growth", emoji: "📚" },
  { id: "skill", label: "Мастерство", level: "growth", emoji: "⚡" },
  { id: "beauty", label: "Красота", level: "aesthetic", emoji: "🌸" },
  { id: "travel", label: "Путешествия", level: "aesthetic", emoji: "✈️" },
  { id: "art", label: "Искусство", level: "aesthetic", emoji: "🎭" },
  { id: "leadership", label: "Лидерство", level: "self", emoji: "👑" },
  { id: "mentorship", label: "Менторство", level: "self", emoji: "🤲" },
  { id: "self_dev", label: "Самореализация", level: "self", emoji: "🦋" },
];

const NEED_LEVELS = [
  { id: "physio", label: "Физиологические", color: "#E76F51" },
  { id: "safety", label: "Безопасность", color: "#E9C46A" },
  { id: "social", label: "Социальные", color: "#7EC8B0" },
  { id: "esteem", label: "Уважение и признание", color: "#74B3CE" },
  { id: "growth", label: "Творчество и познание", color: "#B5838D" },
  { id: "aesthetic", label: "Эстетические", color: "#9B7FD4" },
  { id: "self", label: "Самоактуализация", color: "#5C8A6B" },
];

const EXERCISES = {
  crisis: [
    { id: "breathing_478", name: "Дыхание 4-7-8", icon: "🌬️", duration: "2 мин", desc: "Вдох 4 сек → задержка 7 сек → выдох 8 сек. 4 цикла. Активирует парасимпатику." },
    { id: "cold_water", name: "Холодная вода", icon: "💧", duration: "1 мин", desc: "Умойся холодной водой. Активирует рефлекс ныряния — замедляет сердце." },
    { id: "tapping", name: "EFT-постукивание", icon: "👆", duration: "5 мин", desc: "Постукивай по точкам называя чувство: «Я чувствую тревогу и принимаю себя»" },
    { id: "grounding", name: "5-4-3-2-1", icon: "🌱", duration: "3 мин", desc: "5 видишь, 4 слышишь, 3 чувствуешь, 2 пахнут, 1 на вкус" },
  ],
  schema: [
    { id: "safe_place", name: "Безопасное место", icon: "🏡", duration: "10 мин", desc: "Визуализация места где ты в безопасности и принята" },
    { id: "inner_child", name: "Внутренний ребёнок", icon: "🧸", duration: "15 мин", desc: "Поговори с той частью себя, которой сейчас больно" },
    { id: "healthy_adult", name: "Здоровый Взрослый", icon: "💪", duration: "8 мин", desc: "Что сказал бы тебе мудрый, заботливый взрослый?" },
    { id: "chair_work", name: "Работа со стулом", icon: "🪑", duration: "20 мин", desc: "Письмо от схемы и ответ от Здорового Взрослого" },
    { id: "needs_ex", name: "Базовая потребность", icon: "💛", duration: "5 мин", desc: "Какая базовая потребность сейчас не удовлетворена?" },
  ],
  cbt: [
    { id: "thought_record", name: "Дневник мыслей", icon: "📝", duration: "10 мин", desc: "Запиши автоматическую мысль и найди альтернативу" },
    { id: "behavioral_act", name: "Поведенческая активация", icon: "🚶", duration: "5 мин", desc: "Одно маленькое действие которое принесёт удовольствие" },
    { id: "decatastrophizing", name: "Декатастрофизация", icon: "🔍", duration: "8 мин", desc: "Что самое плохое? Насколько вероятно? Что сделаешь?" },
    { id: "resource_state", name: "Ресурсное состояние", icon: "🌟", duration: "7 мин", desc: "Вспомни момент когда ты чувствовала себя хорошо. Погрузись в него." },
  ],
};

const QUICK_STATES = [
  { id: "bad", label: "Мне плохо", emoji: "🌊", prompt: "Мне сейчас очень плохо. Просто побудь рядом и помоги разобраться что происходит." },
  { id: "anxious", label: "Тревожусь", emoji: "😰", prompt: "Я сейчас сильно тревожусь. Помоги мне успокоиться и понять откуда эта тревога." },
  { id: "talk", label: "Хочу поговорить", emoji: "💬", prompt: "Хочу просто поговорить о том что у меня на душе. Я готова рассказать." },
  { id: "technique", label: "Нужна техника", emoji: "🛠️", prompt: "Порекомендуй мне конкретную технику для моего состояния прямо сейчас." },
  { id: "schema_now", label: "Схема активна", emoji: "🌀", prompt: "Я чувствую что у меня активировалась схема. Помоги разобраться какая и что с этим делать." },
  { id: "angry_now", label: "Злость/вспышка", emoji: "💢", prompt: "У меня вспышка злости / раздражения. Помоги справиться прямо сейчас." },
];

const DOMAINS = [...new Set(SCHEMAS.map(s => s.domain))];

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function getPhase(day) {
  return CYCLE_PHASES.find(p => p.days.includes(day)) || CYCLE_PHASES[3];
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function getDayOfWeek(dateStr) {
  return ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"][new Date(dateStr).getDay()];
}

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── THEME ─────────────────────────────────────────────────────────────────────

const T = {
  bg: "#F5F0EB", card: "#FFFDF9", border: "#E8E0D5",
  text: "#2C2416", muted: "#8B7355", accent: "#B5838D",
  font: "'Georgia','Times New Roman',serif",
};

// ─── APP ───────────────────────────────────────────────────────────────────────

export default function App() {
  // Navigation
  const [screen, setScreen] = useState("home");

  // Cycle
  const [cycleDay, setCycleDay] = useState(load("cycleDay", 14));
  const [periodStartDate, setPeriodStartDate] = useState(load("period_start_date", null));
  const [periodActive, setPeriodActive] = useState(load("period_active", false));
  const [periodHistory, setPeriodHistory] = useState(load("period_history", []));
  const [showPeriodConfirm, setShowPeriodConfirm] = useState(false);
  const [showFlowQuestion, setShowFlowQuestion] = useState(false);

  // Daily diary — step-by-step
  const [diaryStep, setDiaryStep] = useState(0); // 0=mood 1=body 2=schemas 3=notes 4=done
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [intensity, setIntensity] = useState(5);
  const [discharge, setDischarge] = useState(null);
  const [digestion, setDigestion] = useState(null);
  const [symptoms, setSymptoms] = useState([]);
  const [libido, setLibido] = useState(null);
  const [symptomNotes, setSymptomNotes] = useState("");
  const [activeSchemas, setActiveSchemas] = useState([]);
  const [notes, setNotes] = useState("");
  const [completedExercises, setCompletedExercises] = useState([]);

  // Logs
  const [logs, setLogs] = useState(load("schema_logs", []));

  // AI / Support
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showQuickStates, setShowQuickStates] = useState(true);
  const [aiSessions, setAiSessions] = useState(load("ai_sessions", []));
  const [currentSession, setCurrentSession] = useState(null);
  const [phaseExpanded, setPhaseExpanded] = useState(false);
  const [schemaPopup, setSchemaPopup] = useState(null); // schema object to show in popup

  // Exercises
  const [activeExercise, setActiveExercise] = useState(null);
  const [exerciseTab, setExerciseTab] = useState("crisis");

  // Silence
  const [silenceActive, setSilenceActive] = useState(load("silence_active", false));
  const [silenceStartDate, setSilenceStartDate] = useState(load("silence_start_date", null));
  const [silenceDays, setSilenceDays] = useState(load("silence_days", 14));
  const [silenceLogs, setSilenceLogs] = useState(load("silence_logs", []));
  const [needsChecked, setNeedsChecked] = useState([]);
  const [morningNote, setMorningNote] = useState("");
  const [goodDone, setGoodDone] = useState("");
  const [goodTomorrow, setGoodTomorrow] = useState("");

  // History
  const [selectedLog, setSelectedLog] = useState(null);
  const [historyTab, setHistoryTab] = useState("list");

  const [saved, setSaved] = useState(false);
  const messagesEndRef = useRef(null);
  const phase = getPhase(cycleDay);

  // Auto-calc cycle day every time app opens
  useEffect(() => {
    if (periodStartDate) {
      const diff = Math.floor((new Date(getTodayKey()) - new Date(periodStartDate)) / 86400000) + 1;
      const day = Math.min(Math.max(diff, 1), 28);
      setCycleDay(day); save("cycleDay", day);
    }
  }, []); // runs on mount - recalcs from stored periodStartDate

  // Auto-end period day 6
  useEffect(() => {
    if (periodActive && cycleDay >= 6) { setPeriodActive(false); save("period_active", false); }
  }, [cycleDay]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages]);

  // ── Period ────────────────────────────────────────────────────────────────

  const startPeriod = (flowIntensity) => {
    const today = getTodayKey();
    const cycleLength = periodStartDate ? Math.floor((new Date(today) - new Date(periodStartDate)) / 86400000) : null;
    const newHistory = [{ date: today, flowIntensity, cycleLength }, ...periodHistory];
    setPeriodHistory(newHistory); setPeriodStartDate(today);
    setCycleDay(1); setPeriodActive(true);
    setShowPeriodConfirm(false); setShowFlowQuestion(false);
    save("period_start_date", today); save("period_history", newHistory);
    save("cycleDay", 1); save("period_active", true);
  };

  const endPeriod = () => { setPeriodActive(false); save("period_active", false); };

  // ── Save day ──────────────────────────────────────────────────────────────

  const saveDay = () => {
    const entry = {
      date: getTodayKey(), cycleDay, phase: phase.name,
      moods: selectedMoods, intensity, schemas: activeSchemas, notes,
      discharge, digestion, symptoms, libido, symptomNotes,
      exercises: completedExercises,
    };
    const newLogs = [entry, ...logs.filter(l => l.date !== getTodayKey())];
    setLogs(newLogs); save("schema_logs", newLogs);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    setDiaryStep(4);
  };

  // ── Silence ───────────────────────────────────────────────────────────────

  const startSilence = () => {
    const today = getTodayKey();
    setSilenceStartDate(today); setSilenceActive(true);
    save("silence_start_date", today); save("silence_days", silenceDays); save("silence_active", true);
  };

  const saveSilenceDay = () => {
    const entry = { date: getTodayKey(), dayNum: silenceDayNum(), needsChecked, morningNote, goodDone, goodTomorrow };
    const newLogs = [entry, ...silenceLogs.filter(l => l.date !== getTodayKey())];
    setSilenceLogs(newLogs); save("silence_logs", newLogs);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const silenceDayNum = () => {
    if (!silenceStartDate) return 0;
    return Math.min(Math.floor((new Date(getTodayKey()) - new Date(silenceStartDate)) / 86400000) + 1, silenceDays);
  };

  // ── AI ────────────────────────────────────────────────────────────────────

  const sendToAI = async (overrideInput) => {
    const text = overrideInput || aiInput;
    if (!text.trim()) return;
    setShowQuickStates(false);
    const userMsg = { role: "user", content: text };
    const newMessages = [...aiMessages, userMsg];
    setAiMessages(newMessages); setAiInput(""); setAiLoading(true);

    const ctx = `Ты — тёплый психологический ассистент, специализируешься на схема-терапии Янга и КПТ.
Контекст: день цикла ${cycleDay} (${phase.name}), схемы: ${activeSchemas.map(id=>SCHEMAS.find(s=>s.id===id)?.name).join(", ")||"не указаны"}, настроение: ${selectedMoods.map(id=>MOODS.find(m=>m.id===id)?.label).join(", ")||"не указано"}, интенсивность: ${intensity}/10.
Стиль: тёплый, без осуждения, конкретный. Сначала валидируй — потом предлагай. Отвечай на русском.`;

    try {
  const res = await fetch("http://localhost:3001/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text }),
  });
  const data = await res.json();
  const reply = data.reply || "Что-то пошло не так.";
  const finalMessages = [...newMessages, { role: "assistant", content: reply }];
  setAiMessages(finalMessages);
  saveAiSession(finalMessages);
} catch {
  const errMessages = [...newMessages, { role: "assistant", content: "Я пока заглушка 🤖" }];
  setAiMessages(errMessages);
}
setAiLoading(false);

  const getAIRecommendations = async () => {
    const schemaNames = activeSchemas.map(id => SCHEMAS.find(s=>s.id===id)?.name).filter(Boolean).join(", ");
    const prompt = `На основании заметки предложи 2-3 конкретные техники (схема-терапия или КПТ). Для каждой: название + одна фраза почему подходит.

Заметка: "${notes}"
Схемы: ${schemaNames || "не указаны"}, Фаза: ${phase.name}, Настроение: ${selectedMoods.map(id=>MOODS.find(m=>m.id===id)?.label).join(", ")||"не указано"}

Отвечай коротко, без вступлений.`;
    setScreen("support"); setShowQuickStates(false);
    const userMsg = { role: "user", content: prompt };
    setAiMessages(prev => [...prev, userMsg]); setAiLoading(true);
    try {
      const res = await fetch("https://localhost:3001/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text,
          system: "Ты психологический ассистент. Кратко и конкретно на русском.", messages: [userMsg] }),
      });
      const data = await res.json();
      const reply = data.content?.map(b=>b.text||"").join("") || "Не удалось получить рекомендации.";
      setAiMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch { setAiMessages(prev => [...prev, { role: "assistant", content: "Не удалось подключиться." }]); }
    setAiLoading(false);
  };

  // ── Toggles ───────────────────────────────────────────────────────────────

  const toggleMood = (id) => setSelectedMoods(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  const toggleSchema = (id) => setActiveSchemas(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  const toggleSymptom = (id) => setSymptoms(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  const toggleNeed = (id) => setNeedsChecked(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);

  // ── Styles ────────────────────────────────────────────────────────────────

  const S = {
    app: { minHeight: "100vh", background: T.bg, fontFamily: T.font, color: T.text, maxWidth: 430, margin: "0 auto" },
    nav: { display: "flex", borderTop: `1px solid ${T.border}`, background: T.card, position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, zIndex: 20 },
    navBtn: (a) => ({ flex: 1, padding: "10px 2px 12px", border: "none", background: "none", fontSize: 9, color: a ? T.text : T.muted, cursor: "pointer", fontFamily: T.font, borderTop: a ? `2px solid ${T.text}` : "2px solid transparent" }),
    content: { padding: "0 15px 90px" },
    card: { background: T.card, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${T.border}` },
    st: { fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, marginBottom: 10, marginTop: 0 },
    textarea: { width: "100%", padding: "10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, fontFamily: T.font, fontSize: 13, color: T.text, resize: "none", boxSizing: "border-box", outline: "none" },
    chip: (a, color) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 9px", borderRadius: 16, border: `1px solid ${a ? color : T.border}`, background: a ? color+"22" : "transparent", cursor: "pointer", fontSize: 11, marginRight: 5, marginBottom: 5, fontFamily: T.font }),
    primaryBtn: (color) => ({ width: "100%", padding: "13px", background: color||T.text, color: T.bg, border: "none", borderRadius: 11, fontSize: 14, cursor: "pointer", fontFamily: T.font, letterSpacing: "0.03em" }),
    ghostBtn: { width: "100%", padding: "11px", background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 11, fontSize: 13, cursor: "pointer", fontFamily: T.font },
    stepDot: (active, done) => ({ width: 8, height: 8, borderRadius: "50%", background: done ? "#7EC8B0" : active ? T.text : T.border, transition: "all 0.3s" }),
  };

  const cycleColors = CYCLE_PHASES.flatMap(p => p.days.map(d => ({ day: d, color: p.color })));

  // ── RENDER HOME (step-by-step diary) ─────────────────────────────────────

  const DIARY_STEPS = ["Настроение", "Тело", "Схемы", "Заметки"];

  const renderHome = () => {
    const todayLog = logs.find(l => l.date === getTodayKey());
    const topSchemas = activeSchemas.length
      ? SCHEMAS.filter(s => activeSchemas.includes(s.id)).slice(0, 3)
      : logs.flatMap(l => l.schemas||[]).reduce((acc, id) => {
          acc[id] = (acc[id]||0)+1; return acc;
        }, {});

    return (
      <div>
        {/* Header */}
        <div style={{ padding: "20px 15px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 24, lineHeight: 1 }}>{new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{new Date().toLocaleDateString("ru-RU", { weekday: "long" })}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: phase.color, fontWeight: "bold" }}>{phase.name}</div>
              <div style={{ fontSize: 22, color: T.text, lineHeight: 1 }}>День {cycleDay}</div>
            </div>
          </div>

          {/* Phase bar */}
          <div style={{ background: phase.color+"20", borderLeft: `3px solid ${phase.color}`, borderRadius: 8, padding: "10px 13px", marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#5C4A32", lineHeight: 1.6 }}>{phase.mentalComment}</div>
          </div>

          {/* Cycle strip */}
          <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
            {Array.from({length:28},(_,i)=>i+1).map(d => {
              const cc = cycleColors.find(x=>x.day===d);
              return <div key={d} onClick={() => { setCycleDay(d); save("cycleDay",d); }}
                style={{ flex:1, height:4, borderRadius:2, background: cc?cc.color:T.border, opacity: d===cycleDay?1:0.3, cursor:"pointer", outline: d===cycleDay?`2px solid ${cc?.color}`:"none", outlineOffset:1 }} />;
            })}
          </div>

          {/* Period button */}
          {periodActive && cycleDay <= 5 ? (
            <button onClick={endPeriod} style={{ ...S.ghostBtn, marginBottom: 14, color: "#5C9E8A", borderColor: "#7EC8B066" }}>✓ Месячные завершились</button>
          ) : showFlowQuestion ? (
            <div style={{ background: "#E76F5110", borderRadius: 10, padding: 12, marginBottom: 14, border: "1px solid #E76F5144" }}>
              <div style={{ fontSize: 12, color: "#E76F51", marginBottom: 9 }}>Интенсивность выделений?</div>
              <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
                {[{id:"light",e:"🌸",l:"Скудные"},{id:"medium",e:"🩸",l:"Умеренные"},{id:"heavy",e:"💧",l:"Обильные"},{id:"very_heavy",e:"🌊",l:"Очень"}].map(f => (
                  <button key={f.id} onClick={() => startPeriod(f.id)}
                    style={{ flex:1, padding:"7px 2px", borderRadius:8, border:"1px solid #E76F5144", background:"#E76F5108", cursor:"pointer", fontFamily:T.font, fontSize:10, color:"#E76F51", textAlign:"center" }}>
                    <div>{f.e}</div><div style={{marginTop:2}}>{f.l}</div>
                  </button>
                ))}
              </div>
              <button onClick={()=>{setShowFlowQuestion(false);setShowPeriodConfirm(false);}} style={{...S.ghostBtn, fontSize:11, padding:"6px"}}>Отмена</button>
            </div>
          ) : showPeriodConfirm ? (
            <div style={{ background:"#E76F5110", borderRadius:10, padding:12, marginBottom:14, border:"1px solid #E76F5144" }}>
              <div style={{ fontSize:12, color:"#E76F51", marginBottom:9 }}>Начать новый цикл сегодня?</div>
              <div style={{ display:"flex", gap:7 }}>
                <button onClick={()=>{setShowPeriodConfirm(false);setShowFlowQuestion(true);}} style={{flex:1,padding:"7px",borderRadius:8,border:"none",background:"#E76F51",color:"#fff",cursor:"pointer",fontFamily:T.font,fontSize:12}}>Да</button>
                <button onClick={()=>setShowPeriodConfirm(false)} style={{flex:1,padding:"7px",borderRadius:8,border:`1px solid ${T.border}`,background:"none",cursor:"pointer",fontFamily:T.font,fontSize:12,color:T.muted}}>Отмена</button>
              </div>
            </div>
          ) : !periodActive && (
            <button onClick={()=>setShowPeriodConfirm(true)} style={{...S.ghostBtn, marginBottom:14, color:"#E76F51", borderColor:"#E76F5166"}}>🩸 Начались месячные</button>
          )}
        </div>

        {/* Step-by-step diary */}
        <div style={{ padding: "0 15px" }}>
          {diaryStep === 4 && todayLog ? (
            // Done state
            <div style={{ ...S.card, textAlign:"center", background: "#7EC8B010", borderColor:"#7EC8B044" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>✓</div>
              <div style={{ fontSize:15, marginBottom:4 }}>День сохранён</div>
              <div style={{ fontSize:12, color:T.muted, marginBottom:14 }}>Молодец — ты отследила своё состояние</div>
              <button onClick={()=>setDiaryStep(0)} style={{...S.ghostBtn}}>Редактировать</button>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:16 }}>
                {DIARY_STEPS.map((label,i) => (
                  <React.Fragment key={i}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer" }} onClick={()=>setDiaryStep(i)}>
                      <div style={S.stepDot(diaryStep===i, diaryStep>i)} />
                      <div style={{ fontSize:9, color: diaryStep===i ? T.text : T.muted }}>{label}</div>
                    </div>
                    {i < DIARY_STEPS.length-1 && <div style={{ flex:1, height:1, background: diaryStep>i ? "#7EC8B0" : T.border, marginBottom:12, maxWidth:30 }} />}
                  </React.Fragment>
                ))}
              </div>

              {/* Step 0 — Moods */}
              {diaryStep === 0 && (
                <div style={S.card}>
                  <p style={S.st}>Как ты сейчас? (выбери всё что есть)</p>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:14 }}>
                    {MOODS.map(m => (
                      <button key={m.id} style={{ padding:"8px 2px", borderRadius:10, border:`2px solid ${selectedMoods.includes(m.id)?m.color:T.border}`, background:selectedMoods.includes(m.id)?m.color+"22":"transparent", cursor:"pointer", textAlign:"center", fontFamily:T.font }} onClick={()=>toggleMood(m.id)}>
                        <div style={{fontSize:19}}>{m.emoji}</div>
                        <div style={{fontSize:9,color:"#5C4A32",marginTop:2}}>{m.label}</div>
                      </button>
                    ))}
                  </div>
                  <p style={S.st}>Интенсивность · {intensity}/10</p>
                  <input type="range" min={1} max={10} value={intensity} onChange={e=>setIntensity(Number(e.target.value))} style={{width:"100%",accentColor:T.accent,marginBottom:4}} />
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.muted}}><span>Лёгко</span><span>Невыносимо</span></div>
                  <button style={{...S.primaryBtn(), marginTop:14}} onClick={()=>setDiaryStep(1)}>Далее →</button>
                </div>
              )}

              {/* Step 1 — Body */}
              {diaryStep === 1 && (
                <div style={S.card}>
                  <p style={S.st}>Тело сегодня</p>
                  <div style={{fontSize:10,color:T.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Выделения</div>
                  <div style={{display:"flex",flexWrap:"wrap",marginBottom:10}}>
                    {DISCHARGE_TYPES.map(d=><button key={d.id} style={S.chip(discharge===d.id,T.accent)} onClick={()=>setDischarge(discharge===d.id?null:d.id)}>{d.emoji} {d.label}</button>)}
                  </div>
                  <div style={{fontSize:10,color:T.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Пищеварение</div>
                  <div style={{display:"flex",flexWrap:"wrap",marginBottom:10}}>
                    {DIGESTION.map(d=><button key={d.id} style={S.chip(digestion===d.id,"#7EC8B0")} onClick={()=>setDigestion(digestion===d.id?null:d.id)}>{d.emoji} {d.label}</button>)}
                  </div>
                  <div style={{fontSize:10,color:T.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Либидо</div>
                  <div style={{display:"flex",flexWrap:"wrap",marginBottom:10}}>
                    {LIBIDO.map(l=><button key={l.id} style={S.chip(libido===l.id,"#E9C46A")} onClick={()=>setLibido(libido===l.id?null:l.id)}>{l.emoji} {l.label}</button>)}
                  </div>
                  <div style={{fontSize:10,color:T.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Симптомы</div>
                  <div style={{display:"flex",flexWrap:"wrap",marginBottom:12}}>
                    {PHYSICAL_SYMPTOMS.map(s=><button key={s.id} style={S.chip(symptoms.includes(s.id),"#E76F51")} onClick={()=>toggleSymptom(s.id)}>{s.emoji} {s.label}</button>)}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button style={{...S.ghostBtn,flex:1}} onClick={()=>setDiaryStep(0)}>← Назад</button>
                    <button style={{...S.primaryBtn(),flex:2}} onClick={()=>setDiaryStep(2)}>Далее →</button>
                  </div>
                </div>
              )}

              {/* Step 2 — Schemas */}
              {diaryStep === 2 && (
                <div style={S.card}>
                  <p style={S.st}>Активные схемы сегодня</p>
                  {/* Frequent schemas first */}
                  {(() => {
                    const freq = {};
                    logs.flatMap(l=>l.schemas||[]).forEach(id=>{freq[id]=(freq[id]||0)+1;});
                    const topIds = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id])=>id);
                    return topIds.length > 0 ? (
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:10,color:T.muted,marginBottom:6}}>Твои частые схемы</div>
                        {SCHEMAS.filter(s=>topIds.includes(s.id)).map(schema=>(
                          <div key={schema.id} style={{display:"flex",alignItems:"center",padding:"8px 10px",borderRadius:8,border:`1px solid ${activeSchemas.includes(schema.id)?T.accent:T.border}`,background:activeSchemas.includes(schema.id)?T.accent+"15":"transparent",marginBottom:4,cursor:"pointer"}} onClick={()=>toggleSchema(schema.id)} onDoubleClick={()=>setSchemaPopup(schema)}>
                            <span style={{marginRight:8,fontSize:14}}>{schema.emoji}</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:12}}>{schema.name}</div>
                              <div style={{fontSize:10,color:T.muted}}>{schema.desc}</div>
                            </div>
                            {activeSchemas.includes(schema.id)&&<span style={{color:T.accent}}>✓</span>}
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  <details style={{marginBottom:12}}>
                    <summary style={{fontSize:12,color:T.muted,cursor:"pointer",marginBottom:8}}>Все 18 схем ▾ (нажми чтобы раскрыть)</summary>
                    {DOMAINS.map(domain=>(
                      <div key={domain}>
                        <div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4,marginTop:8}}>{domain}</div>
                        {SCHEMAS.filter(sc=>sc.domain===domain).map(schema=>(
                          <div key={schema.id} style={{display:"flex",alignItems:"center",padding:"7px 9px",borderRadius:7,border:`1px solid ${activeSchemas.includes(schema.id)?T.accent:T.border}`,background:activeSchemas.includes(schema.id)?T.accent+"15":"transparent",marginBottom:3,cursor:"pointer"}} onClick={()=>toggleSchema(schema.id)} onDoubleClick={()=>setSchemaPopup(schema)}>
                            <span style={{marginRight:7,fontSize:13}}>{schema.emoji}</span>
                            <span style={{fontSize:11}}>{schema.name}</span>
                            {activeSchemas.includes(schema.id)&&<span style={{marginLeft:"auto",color:T.accent}}>✓</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </details>
                  <div style={{display:"flex",gap:8}}>
                    <button style={{...S.ghostBtn,flex:1}} onClick={()=>setDiaryStep(1)}>← Назад</button>
                    <button style={{...S.primaryBtn(),flex:2}} onClick={()=>setDiaryStep(3)}>Далее →</button>
                  </div>
                </div>
              )}

              {/* Step 3 — Notes */}
              {diaryStep === 3 && (
                <div style={S.card}>
                  <p style={S.st}>Заметки дня</p>
                  <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} placeholder="Что происходит? Что заметила? Можно просто поток мыслей..." style={{...S.textarea, marginBottom:10}} />
                  {notes.trim().length > 20 && (
                    <button onClick={getAIRecommendations} style={{width:"100%",padding:"9px",borderRadius:8,border:`1px solid ${T.accent}66`,background:T.accent+"10",color:T.accent,cursor:"pointer",fontFamily:T.font,fontSize:12,marginBottom:10}}>
                      ✨ Получить рекомендации по заметке
                    </button>
                  )}
                  <div style={{display:"flex",gap:8}}>
                    <button style={{...S.ghostBtn,flex:1}} onClick={()=>setDiaryStep(2)}>← Назад</button>
                    <button style={{...S.primaryBtn(saved?"#7EC8B0":T.text),flex:2}} onClick={saveDay}>{saved?"✓ Сохранено":"Сохранить день"}</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Phase medical card - collapsible */}
          <div style={{...S.card, borderLeft:`3px solid ${phase.color}`, cursor:"pointer"}} onClick={()=>setPhaseExpanded(e=>!e)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{...S.st,color:phase.color,margin:0}}>Что происходит в теле</p>
              <span style={{fontSize:11,color:T.muted,transition:"transform 0.2s",display:"inline-block",transform:phaseExpanded?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
            </div>
            {!phaseExpanded && <p style={{fontSize:12,color:T.muted,margin:"6px 0 0",lineHeight:1.5,fontStyle:"italic"}}>{phase.tip}</p>}
            {phaseExpanded && (
              <div style={{marginTop:10}}>
                <p style={{fontSize:12,color:"#5C4A32",lineHeight:1.7,margin:"0 0 8px"}}>{phase.gynComment}</p>
                <div style={{fontSize:10,color:phase.color,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Психологически</div>
                <p style={{fontSize:12,color:"#5C4A32",lineHeight:1.7,margin:0}}>{phase.mentalComment}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER PRACTICES ──────────────────────────────────────────────────────

  const renderPractices = () => {
    const tabs = [
      { id: "crisis", label: "🆘 Кризис", color: "#E76F51" },
      { id: "schema", label: "🧸 Схема", color: T.accent },
      { id: "cbt", label: "🧠 КПТ", color: "#74B3CE" },
      { id: "silence", label: "🤫 Тишина", color: "#5C8A6B" },
    ];
    const currentColor = tabs.find(t=>t.id===exerciseTab)?.color || T.accent;

    if (activeExercise) {
      return (
        <div style={S.content}>
          <button onClick={()=>setActiveExercise(null)} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",marginBottom:12,fontFamily:T.font,fontSize:13,padding:"16px 0 0"}}>← Назад</button>
          <div style={{...S.card, borderLeft:`3px solid ${currentColor}`}}>
            <div style={{fontSize:26,marginBottom:8}}>{activeExercise.icon}</div>
            <div style={{fontSize:18,marginBottom:5}}>{activeExercise.name}</div>
            <div style={{fontSize:11,color:T.muted,marginBottom:12}}>⏱ {activeExercise.duration}</div>
            <div style={{fontSize:13,lineHeight:1.7,marginBottom:16}}>{activeExercise.desc}</div>
            {activeExercise.id === "breathing_478" && <Breathing478 />}
            {activeExercise.id === "thought_record" && (
              <div>
                {["Ситуация","Автоматическая мысль","Эмоция (0–100%)","Альтернативная мысль","Результат"].map(label=>(
                  <div key={label} style={{marginBottom:9}}>
                    <div style={{fontSize:10,color:T.muted,marginBottom:3}}>{label}</div>
                    <textarea rows={2} style={S.textarea} placeholder="..." />
                  </div>
                ))}
              </div>
            )}
            {activeExercise.id === "inner_child" && <textarea rows={6} style={{...S.textarea,marginTop:4}} placeholder="Дорогая маленькая я..." />}
            {activeExercise.id === "healthy_adult" && <textarea rows={5} style={{...S.textarea,marginTop:4}} placeholder="Я слышу тебя..." />}
            {activeExercise.id === "needs_ex" && <textarea rows={4} style={{...S.textarea,marginTop:4}} placeholder="Прямо сейчас мне нужно..." />}
            <button onClick={()=>{setCompletedExercises(p=>[...new Set([...p,activeExercise.id])]);setActiveExercise(null);}} style={{...S.primaryBtn("#7EC8B0"),marginTop:16}}>✓ Выполнено</button>
          </div>
        </div>
      );
    }

    // Silence tab
    if (exerciseTab === "silence") {
      const dayNum = silenceDayNum();
      const progress = silenceDays > 0 ? (dayNum / silenceDays) * 100 : 0;
      return (
        <div style={S.content}>
          <div style={{padding:"16px 0 0"}}>
          <div style={{display:"flex",gap:3,marginBottom:14,background:T.card,padding:3,borderRadius:9,border:`1px solid ${T.border}`}}>
            {[{id:"crisis",label:"🆘 Кризис"},{id:"schema",label:"🧸 Схема"},{id:"cbt",label:"🧠 КПТ"},{id:"silence",label:"🤫 Тишина"}].map(t=><button key={t.id} style={{flex:1,padding:"7px 2px",border:"none",background:exerciseTab===t.id?T.text:"transparent",color:exerciseTab===t.id?T.bg:T.muted,borderRadius:7,cursor:"pointer",fontFamily:T.font,fontSize:10}} onClick={()=>setExerciseTab(t.id)}>{t.label}</button>)}
          </div>
          {!silenceActive ? (
            <>
              <div style={{...S.card,textAlign:"center"}}>
                <div style={{fontSize:28,marginBottom:8}}>🤫</div>
                <div style={{fontSize:17,marginBottom:6}}>Практика #Тишины</div>
                <div style={{fontSize:12,color:T.muted,lineHeight:1.7,marginBottom:14}}>Ежедневная практика для перехода через кризис — чек-ап потребностей, движение, письменный монолог, два вопроса дня.</div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,color:T.muted,marginBottom:5}}>Длительность (дней)</div>
                  <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}>
                    <button onClick={()=>setSilenceDays(d=>Math.max(14,d-7))} style={{width:28,height:28,borderRadius:"50%",border:`1px solid ${T.border}`,background:"none",fontSize:16,cursor:"pointer"}}>−</button>
                    <div style={{fontSize:32}}>{silenceDays}</div>
                    <button onClick={()=>setSilenceDays(d=>d+7)} style={{width:28,height:28,borderRadius:"50%",border:`1px solid ${T.border}`,background:"none",fontSize:16,cursor:"pointer"}}>+</button>
                  </div>
                </div>
                <button onClick={startSilence} style={S.primaryBtn("#5C8A6B")}>Начать практику</button>
              </div>
              <div style={{...S.card,background:"#2C241608"}}>
                <p style={{...S.st,marginBottom:8}}>Как работает</p>
                {["Утром: чек-ап потребностей по пирамиде Маслоу","В течение дня: движение / танец в своём состоянии","После движения: записать мысли и чувства","Вечером: два вопроса дня"].map((text,i)=>(
                  <div key={i} style={{display:"flex",gap:9,marginBottom:9,alignItems:"flex-start"}}>
                    <div style={{width:20,height:20,borderRadius:"50%",background:T.text,color:T.bg,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                    <div style={{fontSize:12,color:"#5C4A32",lineHeight:1.5}}>{text}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{...S.card,background:T.text,color:T.bg,marginTop:0}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:12,opacity:0.7}}>Практика тишины</div>
                  <div style={{fontSize:11,opacity:0.6}}>{dayNum} из {silenceDays}</div>
                </div>
                <div style={{fontSize:36,lineHeight:1,marginBottom:8}}>{dayNum}</div>
                <div style={{background:"rgba(255,255,255,0.15)",borderRadius:3,height:3,marginBottom:6}}>
                  <div style={{background:"#7EC8B0",height:3,borderRadius:3,width:progress+"%",transition:"width 0.5s"}} />
                </div>
                <div style={{fontSize:10,opacity:0.6}}>Начало: {formatDate(silenceStartDate)}</div>
              </div>
              <div style={S.card}>
                <p style={S.st}>🌅 Чек-ап потребностей (утро)</p>
                {NEED_LEVELS.map(level=>(
                  <div key={level.id} style={{marginBottom:10}}>
                    <div style={{fontSize:9,color:level.color,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:5,fontWeight:"bold"}}>{level.label}</div>
                    <div style={{display:"flex",flexWrap:"wrap"}}>
                      {NEEDS.filter(n=>n.level===level.id).map(need=>(
                        <button key={need.id} onClick={()=>toggleNeed(need.id)}
                          style={{display:"inline-flex",alignItems:"center",gap:3,padding:"5px 8px",borderRadius:14,border:`1px solid ${needsChecked.includes(need.id)?level.color:T.border}`,background:needsChecked.includes(need.id)?level.color+"22":"transparent",cursor:"pointer",fontFamily:T.font,fontSize:11,marginRight:4,marginBottom:4}}>
                          {need.emoji} {need.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <p style={S.st}>💃 После движения</p>
                <div style={{fontSize:11,color:T.muted,marginBottom:7,fontStyle:"italic"}}>Включи музыку которая отражает состояние. Подвигайся. Потом запиши.</div>
                <textarea value={morningNote} onChange={e=>setMorningNote(e.target.value)} rows={4} placeholder="Что живёт во мне сегодня..." style={S.textarea} />
              </div>
              <div style={S.card}>
                <p style={S.st}>🌙 Два вопроса вечера</p>
                <div style={{fontSize:11,color:T.muted,marginBottom:4}}>Что хорошего / важного для себя я сделала сегодня?</div>
                <textarea value={goodDone} onChange={e=>setGoodDone(e.target.value)} rows={2} placeholder="..." style={{...S.textarea,marginBottom:10}} />
                <div style={{fontSize:11,color:T.muted,marginBottom:4}}>Что хорошего / важного хочу сделать завтра?</div>
                <textarea value={goodTomorrow} onChange={e=>setGoodTomorrow(e.target.value)} rows={2} placeholder="..." style={S.textarea} />
              </div>
              <button style={S.primaryBtn(saved?"#7EC8B0":"#5C8A6B")} onClick={saveSilenceDay}>{saved?"✓ Сохранено":"Сохранить день тишины"}</button>
            </>
          )}
          </div>
        </div>
      );
    }

    return (
      <div style={S.content}>
        <div style={{padding:"16px 0 0"}}>
          <div style={{display:"flex",gap:3,marginBottom:14,background:T.card,padding:3,borderRadius:9,border:`1px solid ${T.border}`}}>
            {tabs.map(t=><button key={t.id} style={{flex:1,padding:"7px 2px",border:"none",background:exerciseTab===t.id?T.text:"transparent",color:exerciseTab===t.id?T.bg:T.muted,borderRadius:7,cursor:"pointer",fontFamily:T.font,fontSize:10}} onClick={()=>setExerciseTab(t.id)}>{t.label}</button>)}
          </div>
          {exerciseTab==="crisis" && (
            <div style={{...S.card,background:"#E76F5108",borderColor:"#E76F5144",marginBottom:12}}>
              <p style={{margin:"0 0 4px",fontSize:13,color:"#E76F51"}}>Сейчас очень тяжело?</p>
              <p style={{margin:0,fontSize:12,color:"#5C4A32",lineHeight:1.5}}>Выбери любую технику. Та, что откликается — и есть нужная.</p>
            </div>
          )}
          {EXERCISES[exerciseTab]?.map(ex=>(
            <div key={ex.id} style={{background:T.card,border:`1px solid ${currentColor}44`,borderLeft:`3px solid ${completedExercises.includes(ex.id)?"#7EC8B0":currentColor}`,borderRadius:10,padding:13,marginBottom:8,cursor:"pointer"}} onClick={()=>setActiveExercise(ex)}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22}}>{ex.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,marginBottom:2}}>{ex.name}</div>
                  <div style={{fontSize:10,color:T.muted}}>⏱ {ex.duration}</div>
                </div>
                {completedExercises.includes(ex.id)&&<span style={{color:"#7EC8B0",fontSize:14}}>✓</span>}
              </div>
              <div style={{fontSize:12,color:"#5C4A32",marginTop:8,lineHeight:1.5}}>{ex.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── RENDER SUPPORT ────────────────────────────────────────────────────────

  const [supportTab, setSupportTab] = useState("chat"); // chat | history

  const renderSupport = () => (
    <div style={{ paddingBottom: 80 }}>
      <div style={{display:"flex",borderBottom:`1px solid ${T.border}`,background:T.card,position:"sticky",top:0,zIndex:5}}>
        {[{id:"chat",label:"💬 Чат"},{id:"history",label:"📖 Сессии"}].map(t=>(
          <button key={t.id} style={{flex:1,padding:"10px 2px",border:"none",background:"none",fontSize:12,color:supportTab===t.id?T.text:T.muted,borderBottom:supportTab===t.id?`2px solid ${T.text}`:"2px solid transparent",cursor:"pointer",fontFamily:T.font}} onClick={()=>setSupportTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {supportTab==="history" && (
        <div style={S.content}>
          <div style={{paddingTop:14}}>
            {aiSessions.length===0 ? (
              <div style={{textAlign:"center",padding:36,color:T.muted,fontStyle:"italic",fontSize:13}}>Пока нет сохранённых разговоров</div>
            ) : aiSessions.map(session=>(
              <div key={session.id} style={{...S.card,cursor:"pointer",borderLeft:`3px solid ${T.accent}`}} onClick={()=>{setAiMessages(session.messages);setCurrentSession(session.id);setSupportTab("chat");setShowQuickStates(false);}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{fontSize:10,color:T.muted}}>{formatDate(session.date)} · {session.phase}</div>
                  <div style={{fontSize:10,color:T.muted}}>День {session.cycleDay}</div>
                </div>
                <div style={{fontSize:13,color:T.text,lineHeight:1.5}}>{session.title}</div>
                <div style={{fontSize:10,color:T.muted,marginTop:5}}>{session.messages.length} сообщений</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {supportTab==="chat" && <div style={{ ...S.content }}>
        {showQuickStates && aiMessages.length === 0 && (
          <div style={{padding:"16px 0 0"}}>
            <div style={{...S.card,background:"#2C241608",borderColor:"#2C241620"}}>
              <p style={{margin:"0 0 5px",fontSize:14}}>Как я могу помочь?</p>
              <p style={{margin:0,fontSize:12,color:T.muted,lineHeight:1.6}}>Я знаю твоё состояние сегодня — день цикла, настроение, активные схемы.</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {QUICK_STATES.map(qs=>(
                <button key={qs.id} onClick={()=>sendToAI(qs.prompt)}
                  style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:"12px 10px",cursor:"pointer",fontFamily:T.font,textAlign:"center"}}>
                  <div style={{fontSize:22,marginBottom:5}}>{qs.emoji}</div>
                  <div style={{fontSize:12,color:T.text}}>{qs.label}</div>
                </button>
              ))}
            </div>
            <div style={{textAlign:"center",marginBottom:8}}>
              <button onClick={()=>setShowQuickStates(false)} style={{background:"none",border:"none",fontSize:12,color:T.muted,cursor:"pointer",fontFamily:T.font}}>или написать самой →</button>
            </div>
          </div>
        )}
        <div>
          {aiMessages.length === 0 && !showQuickStates && (
            <div style={{textAlign:"center",padding:"40px 20px",color:T.muted}}>
              <div style={{fontSize:28,marginBottom:8}}>🌿</div>
              <div style={{fontSize:13,fontStyle:"italic"}}>Напиши что сейчас происходит</div>
            </div>
          )}
          {aiMessages.map((msg,i)=>(
            <div key={i} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",marginBottom:9,paddingTop:i===0?16:0}}>
              <div style={msg.role==="user"
                ?{background:T.text,color:T.bg,padding:"8px 12px",borderRadius:"13px 13px 3px 13px",maxWidth:"80%",fontSize:13,lineHeight:1.5}
                :{background:T.card,color:T.text,padding:"8px 12px",borderRadius:"13px 13px 13px 3px",maxWidth:"82%",fontSize:13,lineHeight:1.6,border:`1px solid ${T.border}`}}>
                {msg.content}
              </div>
            </div>
          ))}
          {aiLoading&&<div style={{display:"flex",paddingTop:8}}><div style={{background:T.card,padding:"8px 12px",borderRadius:"13px 13px 13px 3px",fontSize:13,color:T.muted,border:`1px solid ${T.border}`}}>печатает...</div></div>}
          <div ref={messagesEndRef} />
        </div>
      </div>}
      {supportTab==="chat" && <div style={{display:"flex",gap:7,position:"fixed",bottom:60,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,padding:"10px 15px",background:T.bg,borderTop:`1px solid ${T.border}`,boxSizing:"border-box"}}>
        {aiMessages.length>0&&<button onClick={()=>{setAiMessages([]);setCurrentSession(null);setShowQuickStates(true);}} style={{width:36,height:36,borderRadius:"50%",border:`1px solid ${T.border}`,background:"none",cursor:"pointer",fontSize:14,flexShrink:0}}>↩</button>}
        <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendToAI()} placeholder="Напиши что чувствуешь..." style={{flex:1,padding:"8px 12px",borderRadius:18,border:`1px solid ${T.border}`,background:T.card,fontFamily:T.font,fontSize:13,color:T.text,outline:"none"}} />
        <button style={{width:36,height:36,borderRadius:"50%",background:T.text,color:T.bg,border:"none",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} onClick={()=>sendToAI()}>↑</button>
      </div>}
    </div>
  );

  // ── RENDER HISTORY ────────────────────────────────────────────────────────

  const avgCycleLength = () => {
    const lens = periodHistory.filter(p=>p.cycleLength&&p.cycleLength>15&&p.cycleLength<50).map(p=>p.cycleLength);
    return lens.length ? Math.round(lens.reduce((a,b)=>a+b,0)/lens.length) : null;
  };

  // Smart insights generator
  const generateInsights = () => {
    const insights = [];
    if (logs.length < 3) return insights;
    const last14 = logs.slice(0,14);

    // Most intense phase
    const byPhase = {};
    logs.forEach(l => {
      const p = l.phase||"Лютеиновая";
      if (!byPhase[p]) byPhase[p] = [];
      byPhase[p].push(l.intensity||5);
    });
    const phaseAvgs = Object.entries(byPhase).map(([p,vals])=>({phase:p,avg:vals.reduce((a,b)=>a+b,0)/vals.length})).sort((a,b)=>b.avg-a.avg);
    if (phaseAvgs.length > 1) insights.push({ emoji:"🌙", text:`В ${phaseAvgs[0].phase} фазу интенсивность состояния выше всего (${phaseAvgs[0].avg.toFixed(1)}/10)` });

    // Most frequent mood
    const moodCount = {};
    last14.flatMap(l=>l.moods||[]).forEach(id=>{moodCount[id]=(moodCount[id]||0)+1;});
    const topMood = Object.entries(moodCount).sort((a,b)=>b[1]-a[1])[0];
    if (topMood) { const m=MOODS.find(x=>x.id===topMood[0]); if(m) insights.push({emoji:m.emoji,text:`Самое частое состояние за 14 дней — "${m.label}" (${topMood[1]} раз)`}); }

    // Most active schema
    const schCount = {};
    last14.flatMap(l=>l.schemas||[]).forEach(id=>{schCount[id]=(schCount[id]||0)+1;});
    const topSch = Object.entries(schCount).sort((a,b)=>b[1]-a[1])[0];
    if (topSch) { const sc=SCHEMAS.find(s=>s.id===topSch[0]); if(sc) insights.push({emoji:sc.emoji,text:`Схема "${sc.name}" активировалась чаще всего — ${topSch[1]} раз за 2 недели`}); }

    // Schema + phase correlation
    const lutLogs = logs.filter(l=>l.phase==="Лютеиновая"&&l.schemas?.length>0);
    if (lutLogs.length >= 2) {
      const lutSchemas = {};
      lutLogs.flatMap(l=>l.schemas).forEach(id=>{lutSchemas[id]=(lutSchemas[id]||0)+1;});
      const top = Object.entries(lutSchemas).sort((a,b)=>b[1]-a[1])[0];
      if (top) { const sc=SCHEMAS.find(s=>s.id===top[0]); if(sc) insights.push({emoji:"⚡",text:`В лютеиновую фазу схема "${sc.name}" активна в ${Math.round((top[1]/lutLogs.length)*100)}% дней`}); }
    }

    // Intensity trend
    if (last14.length >= 5) {
      const first = last14.slice(Math.floor(last14.length/2)).reduce((s,l)=>s+(l.intensity||5),0)/Math.ceil(last14.length/2);
      const recent = last14.slice(0,Math.floor(last14.length/2)).reduce((s,l)=>s+(l.intensity||5),0)/Math.floor(last14.length/2);
      if (recent < first - 0.5) insights.push({emoji:"📉",text:`Интенсивность состояния снижается — в последние дни в среднем ${recent.toFixed(1)}/10`});
      else if (recent > first + 0.5) insights.push({emoji:"📈",text:`Интенсивность нарастает — в последние дни в среднем ${recent.toFixed(1)}/10`});
    }

    return insights;
  };

  const getCalendarDays = () => {
    const today = new Date(), year = today.getFullYear(), month = today.getMonth();
    const firstDay = new Date(year,month,1).getDay();
    const daysInMonth = new Date(year,month+1,0).getDate();
    const days = [];
    for (let i=0;i<(firstDay===0?6:firstDay-1);i++) days.push(null);
    for (let d=1;d<=daysInMonth;d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      days.push({d,dateStr,log:logs.find(l=>l.date===dateStr)});
    }
    return days;
  };

  const last14 = logs.slice(0,14).reverse();
  const insights = generateInsights();

  if (selectedLog) {
    const log = selectedLog, lp = getPhase(log.cycleDay||1);
    return (
      <div style={S.app}>
        <div style={{padding:"0 15px",paddingBottom:80}}>
          <button onClick={()=>setSelectedLog(null)} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontFamily:T.font,fontSize:13,padding:"16px 0 10px"}}>← История</button>
          <div style={{...S.card,background:lp.color+"15",borderColor:lp.color+"44"}}>
            <div style={{fontSize:16,marginBottom:3}}>{getDayOfWeek(log.date)}, {formatDate(log.date)}</div>
            <div style={{fontSize:12,color:lp.color}}>День цикла {log.cycleDay} · {log.phase}</div>
          </div>
          <div style={{...S.card,borderLeft:`3px solid ${lp.color}`}}>
            <p style={S.st}>Медицинский контекст фазы</p>
            <p style={{fontSize:12,color:"#5C4A32",lineHeight:1.7,margin:0}}>{lp.gynComment}</p>
          </div>
          {log.moods?.length>0&&<div style={S.card}><p style={S.st}>Эмоции</p><div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>{log.moods.map(id=>{const m=MOODS.find(x=>x.id===id);return m?<span key={id} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 9px",borderRadius:14,background:m.color+"22",border:`1px solid ${m.color}`,fontSize:12}}>{m.emoji} {m.label}</span>:null;})}</div><div style={{fontSize:12,color:T.muted}}>Интенсивность: <b>{log.intensity}/10</b></div></div>}
          {log.schemas?.length>0&&<div style={S.card}><p style={S.st}>Активные схемы</p>{log.schemas.map(id=>{const sc=SCHEMAS.find(s=>s.id===id);return sc?<div key={id} style={{display:"flex",alignItems:"flex-start",gap:7,marginBottom:7}}><span style={{fontSize:14,marginTop:1}}>{sc.emoji}</span><div><div style={{fontSize:12}}>{sc.name}</div><div style={{fontSize:11,color:T.muted}}>{sc.desc}</div></div></div>:null;})}</div>}
          {(log.symptoms?.length>0||log.discharge||log.libido)&&<div style={S.card}><p style={S.st}>Тело</p>{log.discharge&&<div style={{fontSize:12,marginBottom:5}}>Выделения: {DISCHARGE_TYPES.find(d=>d.id===log.discharge)?.emoji} {DISCHARGE_TYPES.find(d=>d.id===log.discharge)?.label}</div>}{log.libido&&<div style={{fontSize:12,marginBottom:5}}>Либидо: {LIBIDO.find(l=>l.id===log.libido)?.emoji} {LIBIDO.find(l=>l.id===log.libido)?.label}</div>}{log.symptoms?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5}}>{log.symptoms.map(id=>{const s=PHYSICAL_SYMPTOMS.find(x=>x.id===id);return s?<span key={id} style={{fontSize:12}}>{s.emoji} {s.label}</span>:null;})}</div>}</div>}
          {log.exercises?.length>0&&<div style={S.card}><p style={S.st}>Практики дня</p>{log.exercises.map(id=>{const ex=[...EXERCISES.crisis,...EXERCISES.schema,...EXERCISES.cbt].find(e=>e.id===id);return ex?<div key={id} style={{fontSize:12,marginBottom:4}}>{ex.icon} {ex.name}</div>:null;})}</div>}
          {log.notes&&<div style={S.card}><p style={S.st}>Заметки</p><p style={{fontSize:13,color:"#5C4A32",lineHeight:1.7,margin:0,fontStyle:"italic"}}>{log.notes}</p></div>}
        </div>
      </div>
    );
  }

  const renderHistory = () => (
    <div style={S.content}>
      <div style={{padding:"16px 0 0"}}>
        <div style={{display:"flex",gap:3,marginBottom:10,background:T.card,padding:3,borderRadius:9,border:`1px solid ${T.border}`}}>
          {[{id:"list",label:"📋 Дни"},{id:"calendar",label:"📅 Кал."},{id:"charts",label:"📊 Графики"},{id:"insights",label:"💡 Инсайты"}].map(t=>(
            <button key={t.id} style={{flex:1,padding:"7px 2px",border:"none",background:historyTab===t.id?T.text:"transparent",color:historyTab===t.id?T.bg:T.muted,borderRadius:7,cursor:"pointer",fontFamily:T.font,fontSize:10}} onClick={()=>setHistoryTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          <button onClick={exportData} style={{flex:1,padding:"7px",borderRadius:8,border:`1px solid ${T.border}`,background:T.card,cursor:"pointer",fontFamily:T.font,fontSize:11,color:T.text}}>⬇ CSV</button>
          <button onClick={exportJson} style={{flex:1,padding:"7px",borderRadius:8,border:`1px solid ${T.border}`,background:T.card,cursor:"pointer",fontFamily:T.font,fontSize:11,color:T.text}}>⬇ JSON (полный бэкап)</button>
        </div>

        {historyTab==="list"&&(
          <div>
            {periodHistory.length>0&&(
              <div style={{...S.card,background:"#E76F5108",borderColor:"#E76F5144"}}>
                <p style={{...S.st,color:"#E76F51"}}>Статистика цикла</p>
                <div style={{display:"flex",gap:8}}>
                  {[{label:"средний цикл",val:avgCycleLength()?avgCycleLength()+"д":"—"},{label:"циклов записано",val:periodHistory.length},{...(periodHistory.filter(p=>p.cycleLength).length>=2?{label:"разброс",val:Math.min(...periodHistory.filter(p=>p.cycleLength).map(p=>p.cycleLength))+"–"+Math.max(...periodHistory.filter(p=>p.cycleLength).map(p=>p.cycleLength))+"д"}:{label:"",val:""})}].filter(x=>x.label).map((item,i)=>(
                    <div key={i} style={{flex:1,textAlign:"center",background:T.card,borderRadius:9,padding:"9px 4px",border:`1px solid ${T.border}`}}>
                      <div style={{fontSize:20,fontWeight:"bold",color:"#E76F51"}}>{item.val}</div>
                      <div style={{fontSize:9,color:T.muted,marginTop:2}}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {logs.length===0&&<div style={{textAlign:"center",padding:36,color:T.muted,fontStyle:"italic",fontSize:13}}>Пока нет записей</div>}
            {logs.map((log,i)=>{const lp=getPhase(log.cycleDay||1);return(
              <div key={i} style={{...S.card,borderLeft:`3px solid ${lp.color}`,cursor:"pointer"}} onClick={()=>setSelectedLog(log)}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{fontSize:13}}>{getDayOfWeek(log.date)}, {formatDate(log.date)}</div>
                  <div style={{fontSize:10,color:lp.color}}>День {log.cycleDay}</div>
                </div>
                {log.moods?.length>0&&<div style={{display:"flex",gap:4,marginBottom:4}}>{log.moods.slice(0,6).map(id=>{const m=MOODS.find(x=>x.id===id);return m?<span key={id} style={{fontSize:15}}>{m.emoji}</span>:null;})}</div>}
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div style={{fontSize:10,color:T.muted}}>Интенсивность: {log.intensity}/10</div>
                  <div style={{fontSize:10,color:T.muted}}>→</div>
                </div>
              </div>
            );})}
          </div>
        )}

        {historyTab==="calendar"&&(
          <div style={S.card}>
            <p style={{...S.st,marginBottom:10}}>{new Date().toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
              {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:T.muted,padding:"3px 0"}}>{d}</div>)}
              {getCalendarDays().map((day,i)=>{
                if(!day)return<div key={i}/>;
                const lp=day.log?getPhase(day.log.cycleDay||1):null;
                const isToday=day.dateStr===getTodayKey();
                return(<div key={i} onClick={()=>day.log&&setSelectedLog(day.log)} style={{textAlign:"center",padding:"5px 1px",borderRadius:6,background:lp?lp.color+"33":isToday?"#2C241615":"transparent",border:isToday?`1px solid ${T.text}`:"1px solid transparent",cursor:day.log?"pointer":"default",fontSize:11}}>
                  {day.d}
                  {day.log?.moods?.length>0&&<div style={{fontSize:7,marginTop:1}}>{MOODS.find(m=>m.id===day.log.moods[0])?.emoji}</div>}
                </div>);
              })}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
              {CYCLE_PHASES.map(p=><div key={p.name} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.muted}}><div style={{width:8,height:8,borderRadius:2,background:p.color}}/>{p.name}</div>)}
            </div>
          </div>
        )}

        {historyTab==="charts"&&(
          <div>
            {last14.length<2?<div style={{textAlign:"center",padding:36,color:T.muted,fontStyle:"italic",fontSize:13}}>Нужно минимум 2 записи</div>:(
              <>
                <div style={S.card}>
                  <p style={S.st}>Интенсивность (14 дней)</p>
                  <div style={{display:"flex",alignItems:"flex-end",gap:3,height:80}}>
                    {last14.map((log,i)=>{const h=((log.intensity||5)/10)*70;const lp=getPhase(log.cycleDay||1);return(
                      <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                        <div style={{width:"100%",background:lp.color,borderRadius:"3px 3px 0 0",height:h+"px",minHeight:3,opacity:0.7}}/>
                        <div style={{fontSize:8,color:T.muted,transform:"rotate(-45deg)",transformOrigin:"right",whiteSpace:"nowrap"}}>{log.date.slice(5)}</div>
                      </div>
                    );})}
                  </div>
                </div>
                <div style={S.card}>
                  <p style={S.st}>Частые эмоции</p>
                  {(()=>{const c={};last14.forEach(l=>l.moods?.forEach(id=>{c[id]=(c[id]||0)+1;}));const s=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,6);const max=s[0]?.[1]||1;return s.map(([id,count])=>{const m=MOODS.find(x=>x.id===id);return m?(<div key={id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}><span style={{fontSize:16,width:20}}>{m.emoji}</span><div style={{flex:1,background:T.border,borderRadius:3,height:7,overflow:"hidden"}}><div style={{width:`${(count/max)*100}%`,height:"100%",background:m.color,borderRadius:3}}/></div><span style={{fontSize:11,color:T.muted,width:20,textAlign:"right"}}>{count}</span></div>):null;})})()}
                </div>
                <div style={S.card}>
                  <p style={S.st}>Топ схем</p>
                  {(()=>{const c={};last14.forEach(l=>l.schemas?.forEach(id=>{c[id]=(c[id]||0)+1;}));const s=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,5);if(!s.length)return<div style={{fontSize:12,color:T.muted}}>Схемы не отмечались</div>;const max=s[0]?.[1]||1;return s.map(([id,count])=>{const sc=SCHEMAS.find(x=>x.id===id);return sc?(<div key={id} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span>{sc.emoji} {sc.name}</span><span style={{color:T.muted}}>{count}×</span></div><div style={{background:T.border,borderRadius:3,height:5,overflow:"hidden"}}><div style={{width:`${(count/max)*100}%`,height:"100%",background:T.accent,borderRadius:3}}/></div></div>):null;})})()}
                </div>
                <div style={S.card}>
                  <p style={S.st}>Интенсивность по фазам</p>
                  {CYCLE_PHASES.map(cp=>{const pl=logs.filter(l=>cp.days.includes(l.cycleDay||1));if(!pl.length)return null;const avg=pl.reduce((s,l)=>s+(l.intensity||5),0)/pl.length;return(<div key={cp.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}><div style={{width:8,height:8,borderRadius:2,background:cp.color,flexShrink:0}}/><div style={{fontSize:11,width:90,flexShrink:0}}>{cp.name}</div><div style={{flex:1,background:T.border,borderRadius:3,height:7,overflow:"hidden"}}><div style={{width:`${(avg/10)*100}%`,height:"100%",background:cp.color,borderRadius:3}}/></div><span style={{fontSize:11,color:T.muted}}>{avg.toFixed(1)}</span></div>);})}
                </div>
              </>
            )}
          </div>
        )}

        {historyTab==="insights"&&(
          <div>
            {insights.length===0?(
              <div style={{...S.card,textAlign:"center",padding:36}}>
                <div style={{fontSize:28,marginBottom:8}}>📊</div>
                <div style={{fontSize:13,color:T.muted}}>Нужно больше записей — минимум 3-5 дней</div>
              </div>
            ):insights.map((ins,i)=>(
              <div key={i} style={{...S.card,display:"flex",gap:12,alignItems:"flex-start",borderLeft:`3px solid ${T.accent}`}}>
                <div style={{fontSize:24,flexShrink:0}}>{ins.emoji}</div>
                <div style={{fontSize:13,color:"#5C4A32",lineHeight:1.6}}>{ins.text}</div>
              </div>
            ))}
            {logs.length>=5&&(
              <div style={{...S.card,background:"#2C241608"}}>
                <p style={{...S.st,marginBottom:8}}>Что это значит?</p>
                <p style={{fontSize:12,color:"#5C4A32",lineHeight:1.7,margin:0}}>
                  Паттерны помогают увидеть связь между циклом, схемами и состоянием. Поделись этими наблюдениями с терапевтом — это ценный материал для работы.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );


  const exportData = () => {
    const rows = ["Дата,День цикла,Фаза,Настроение,Интенсивность,Схемы,Выделения,Либидо,Симптомы,Заметки"];
    logs.forEach(l => {
      const moods = l.moods?.map(id=>MOODS.find(m=>m.id===id)?.label).filter(Boolean).join("|") || "";
      const schemas = l.schemas?.map(id=>SCHEMAS.find(s=>s.id===id)?.name).filter(Boolean).join("|") || "";
      const symptoms = l.symptoms?.map(id=>PHYSICAL_SYMPTOMS.find(s=>s.id===id)?.label).filter(Boolean).join("|") || "";
      const discharge = DISCHARGE_TYPES.find(d=>d.id===l.discharge)?.label || "";
      const libido = LIBIDO.find(x=>x.id===l.libido)?.label || "";
      const notes = (l.notes||"").replace(/,/g,";").replace(/\n/g," ");
      rows.push([l.date,l.cycleDay,l.phase,moods,l.intensity||"",schemas,discharge,libido,symptoms,notes].join(","));
    });
    const csv = rows.join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`schema-flo-${getTodayKey()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const data = { exported: getTodayKey(), logs, periodHistory, silenceLogs, aiSessions };
    const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`schema-flo-backup-${getTodayKey()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── ROOT ──────────────────────────────────────────────────────────────────

  const navItems = [
    { id: "home", icon: "🌙", label: "День" },
    { id: "practices", icon: "🌿", label: "Практики" },
    { id: "support", icon: "💬", label: "Поддержка" },
    { id: "history", icon: "📋", label: "История" },
  ];

  return (
    <div style={S.app}>
      {screen === "home" && renderHome()}
      {screen === "practices" && renderPractices()}
      {screen === "support" && renderSupport()}
      {screen === "history" && renderHistory()}
      {/* Schema popup */}
      {schemaPopup && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,display:"flex",alignItems:"flex-end"}} onClick={()=>setSchemaPopup(null)}>
          <div style={{background:T.card,borderRadius:"16px 16px 0 0",padding:24,width:"100%",maxWidth:430,margin:"0 auto",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:32,marginBottom:8}}>{schemaPopup.emoji}</div>
            <div style={{fontSize:18,marginBottom:6}}>{schemaPopup.name}</div>
            <div style={{fontSize:11,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>{schemaPopup.domain}</div>
            <div style={{fontSize:13,color:"#5C4A32",lineHeight:1.7,marginBottom:14}}>{schemaPopup.desc}</div>
            <div style={{background:T.accent+"15",borderRadius:10,padding:12,marginBottom:16,border:`1px solid ${T.accent}44`}}>
              <div style={{fontSize:10,color:T.accent,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Как проявляется</div>
              <div style={{fontSize:12,color:"#5C4A32",lineHeight:1.6}}>
                {schemaPopup.id==="abandonment"&&"Ты цепляешься за отношения, боишься что тебя бросят, остро реагируешь на любые признаки ухода."}
                {schemaPopup.id==="mistrust"&&"Ты ждёшь обмана, трудно доверяешь даже близким, часто видишь скрытые мотивы."}
                {schemaPopup.id==="deprivation"&&"Чувство что тебя не понимают, не дают достаточно тепла — даже когда объективно всё хорошо."}
                {schemaPopup.id==="defectiveness"&&"Глубокое чувство стыда, что ты «не такая», что если кто-то узнает тебя настоящую — отвергнет."}
                {schemaPopup.id==="isolation"&&"Ощущение что ты принципиально другая, не вписываешься ни в какую группу."}
                {schemaPopup.id==="dependence"&&"Трудно принимать решения самостоятельно, постоянно нужна поддержка и одобрение."}
                {schemaPopup.id==="vulnerability"&&"Постоянная фоновая тревога что случится что-то плохое — болезнь, катастрофа, потеря."}
                {schemaPopup.id==="enmeshment"&&"Границы размыты с кем-то близким — ты живёшь его жизнью или чувствуешь что не имеешь своей."}
                {schemaPopup.id==="failure"&&"Убеждение что ты в итоге провалишься, что другие лучше, что твои достижения — случайность."}
                {schemaPopup.id==="entitlement"&&"Сложно принимать ограничения, раздражение когда правила распространяются на тебя."}
                {schemaPopup.id==="self_control"&&"Трудно сдерживать эмоции, откладываешь дела, действуешь импульсивно."}
                {schemaPopup.id==="subjugation"&&"Подавляешь свои желания ради других, боишься конфликта, говоришь «всё хорошо» когда плохо."}
                {schemaPopup.id==="self_sacrifice"&&"Ставишь чужие нужды выше своих, потом чувствуешь обиду и истощение."}
                {schemaPopup.id==="approval"&&"Постоянно нужно знать что тебя одобряют, трудно действовать без подтверждения извне."}
                {schemaPopup.id==="negativity"&&"Фокус автоматически идёт на плохое — угрозы, потери, то что может пойти не так."}
                {schemaPopup.id==="inhibition"&&"Подавляешь эмоции, спонтанность, боишься потерять контроль или выглядеть слабой."}
                {schemaPopup.id==="standards"&&"Постоянное давление делать лучше, критика себя за ошибки, никогда не достаточно хорошо."}
                {schemaPopup.id==="punitiveness"&&"Строгость к себе и другим за ошибки, трудно прощать, убеждение что наказание заслужено."}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{toggleSchema(schemaPopup.id);setSchemaPopup(null);}} style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:activeSchemas.includes(schemaPopup.id)?T.muted:T.accent,color:T.bg,cursor:"pointer",fontFamily:T.font,fontSize:13}}>
                {activeSchemas.includes(schemaPopup.id)?"Убрать":"Отметить активной"}
              </button>
              <button onClick={()=>setSchemaPopup(null)} style={{width:44,padding:"10px",borderRadius:9,border:`1px solid ${T.border}`,background:"none",cursor:"pointer",fontFamily:T.font,fontSize:13}}>✕</button>
            </div>
          </div>
        </div>
      )}

      <div style={S.nav}>
        {navItems.map(item => (
          <button key={item.id} style={S.navBtn(screen===item.id)} onClick={()=>{setScreen(item.id);setSelectedLog(null);if(item.id==="practices"){setActiveExercise(null);}if(item.id==="home"){const tl=logs.find(l=>l.date===getTodayKey());if(tl)setDiaryStep(4);}}}>
            <div style={{fontSize:16}}>{item.icon}</div>
            <div style={{marginTop:1}}>{item.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── BREATHING 4-7-8 ───────────────────────────────────────────────────────────

function Breathing478() {
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(0);
  const [round, setRound] = useState(0);
  const totalRounds = 4;
  const steps = [
    { label: "Готова?", duration: 0, color: "#8B7355", hint: "" },
    { label: "Вдох", duration: 4, color: "#7EC8B0", hint: "через нос, медленно" },
    { label: "Задержка", duration: 7, color: "#E9C46A", hint: "не дышать" },
    { label: "Выдох", duration: 8, color: "#74B3CE", hint: "через рот, со звуком" },
  ];
  const cur = steps[step];

  useEffect(() => {
    if (step === 0) return;
    if (count > 0) { const t = setTimeout(() => setCount(c=>c-1), 1000); return () => clearTimeout(t); }
    if (step < 3) { const ns = step+1; setStep(ns); setCount(steps[ns].duration); }
    else if (round+1 < totalRounds) { setRound(r=>r+1); setStep(1); setCount(steps[1].duration); }
    else { setStep(0); setRound(0); }
  }, [step, count]);

  const start = () => { setStep(1); setCount(steps[1].duration); setRound(0); };
  const stop = () => { setStep(0); setCount(0); setRound(0); };
  const scale = step === 1 ? 1.35 : step === 3 ? 0.8 : 1;
  const progress = step > 0 ? ((steps[step].duration - count) / steps[step].duration) * 100 : 0;
  const r = 48, circ = 2 * Math.PI * r;

  return (
    <div style={{ textAlign: "center", marginTop: 18 }}>
      {step > 0 && <div style={{ fontSize: 10, color: "#8B7355", marginBottom: 7 }}>Цикл {round+1} из {totalRounds}</div>}
      <div style={{ position: "relative", width: 110, height: 110, margin: "0 auto 14px" }}>
        <svg width="110" height="110" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
          <circle cx="55" cy="55" r={r} fill="none" stroke={cur.color+"22"} strokeWidth="4" />
          {step > 0 && <circle cx="55" cy="55" r={r} fill="none" stroke={cur.color} strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={circ*(1-progress/100)}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s" }} />}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", transform: `scale(${scale})`, transition: "transform 1s ease" }}>
          {step > 0 && <div style={{ fontSize: 24, fontWeight: "bold", color: cur.color, lineHeight: 1 }}>{count}</div>}
          <div style={{ fontSize: step>0?10:11, color: "#5C4A32", marginTop: step>0?2:0 }}>{cur.label}</div>
        </div>
      </div>
      {step > 0 && <div style={{ fontSize: 11, color: "#8B7355", marginBottom: 11, fontStyle: "italic" }}>{cur.hint}</div>}
      <button onClick={step===0?start:stop} style={{ padding: "8px 22px", borderRadius: 16, border: "1px solid #E8E0D5", background: step>0?"#E76F51":"#2C2416", color: "#F5F0EB", cursor: "pointer", fontFamily: "'Georgia',serif", fontSize: 13 }}>
        {step > 0 ? "Стоп" : "Начать"}
      </button>
      {step===0&&round===0&&<div style={{fontSize:10,color:"#8B7355",marginTop:7}}>4 цикла · ~1.5 минуты</div>}
      {step===0&&round>0&&<div style={{fontSize:13,color:"#7EC8B0",marginTop:8}}>✓ Готово! Как ты?</div>}
    </div>
  );
}
