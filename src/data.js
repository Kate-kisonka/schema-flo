export const SCHEMAS = [
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

export const MOODS = [
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

export const CYCLE_PHASES = [
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

export const PHYSICAL_SYMPTOMS = [
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

export const DISCHARGE_TYPES = [
  { id: "none", label: "Нет", emoji: "⭕" },
  { id: "dry", label: "Сухо", emoji: "🏜️" },
  { id: "white", label: "Белые/кремовые", emoji: "🤍" },
  { id: "clear", label: "Прозрачные тянущиеся", emoji: "💎" },
  { id: "watery", label: "Водянистые", emoji: "💧" },
  { id: "bloody", label: "Кровянистые", emoji: "🩸" },
];

export const DIGESTION = [
  { id: "normal", label: "Обычно", emoji: "✅" },
  { id: "bloating", label: "Вздутие", emoji: "🫧" },
  { id: "constipation", label: "Запор", emoji: "🪨" },
  { id: "diarrhea", label: "Диарея", emoji: "💨" },
  { id: "nausea", label: "Тошнота", emoji: "🤢" },
];

export const LIBIDO = [
  { id: "none", label: "Нет", emoji: "❄️" },
  { id: "low", label: "Низкое", emoji: "🌙" },
  { id: "medium", label: "Среднее", emoji: "🌤️" },
  { id: "high", label: "Высокое", emoji: "🔥" },
];

export const NEEDS = [
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

export const NEED_LEVELS = [
  { id: "physio", label: "Физиологические", color: "#E76F51" },
  { id: "safety", label: "Безопасность", color: "#E9C46A" },
  { id: "social", label: "Социальные", color: "#7EC8B0" },
  { id: "esteem", label: "Уважение и признание", color: "#74B3CE" },
  { id: "growth", label: "Творчество и познание", color: "#B5838D" },
  { id: "aesthetic", label: "Эстетические", color: "#9B7FD4" },
  { id: "self", label: "Самоактуализация", color: "#5C8A6B" },
];

export const EXERCISES = {
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

export const QUICK_STATES = [
  { id: "bad", label: "Мне плохо", emoji: "🌊", prompt: "Мне сейчас очень плохо. Просто побудь рядом и помоги разобраться что происходит." },
  { id: "anxious", label: "Тревожусь", emoji: "😰", prompt: "Я сейчас сильно тревожусь. Помоги мне успокоиться и понять откуда эта тревога." },
  { id: "talk", label: "Хочу поговорить", emoji: "💬", prompt: "Хочу просто поговорить о том что у меня на душе. Я готова рассказать." },
  { id: "technique", label: "Нужна техника", emoji: "🛠️", prompt: "Порекомендуй мне конкретную технику для моего состояния прямо сейчас." },
  { id: "schema_now", label: "Схема активна", emoji: "🌀", prompt: "Я чувствую что у меня активировалась схема. Помоги разобраться какая и что с этим делать." },
  { id: "angry_now", label: "Злость/вспышка", emoji: "💢", prompt: "У меня вспышка злости / раздражения. Помоги справиться прямо сейчас." },
];

export const DOMAINS = [...new Set(SCHEMAS.map(s => s.domain))];
