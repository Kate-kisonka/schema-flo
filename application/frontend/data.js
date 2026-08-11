export const SCHEMAS = [
  {
    id: "abandonment", name: "Покинутость", domain: "Разлучение", icon: "wave",
    desc: "Страх что близкие уйдут или бросят",
    manifestation: "Ты цепляешься за отношения, боишься что тебя бросят, остро реагируешь на любые признаки ухода.",
  },
  {
    id: "mistrust", name: "Недоверие", domain: "Разлучение", icon: "lock",
    desc: "Ожидание что другие причинят вред или обманут",
    manifestation: "Ты ждёшь обмана, трудно доверяешь даже близким, часто видишь скрытые мотивы.",
  },
  {
    id: "deprivation", name: "Эмоциональная депривация", domain: "Разлучение", icon: "jar",
    desc: "Убеждение что никто не даст достаточно тепла и заботы",
    manifestation: "Чувство что тебя не понимают, не дают достаточно тепла — даже когда объективно всё хорошо.",
  },
  {
    id: "defectiveness", name: "Дефективность / Стыд", domain: "Разлучение", icon: "heartCrack",
    desc: "Ощущение себя дефектной, нелюбимой, хуже других",
    manifestation: "Глубокое чувство стыда, что ты «не такая», что если кто-то узнает тебя настоящую — отвергнет.",
  },
  {
    id: "isolation", name: "Социальная изоляция", domain: "Разлучение", icon: "island",
    desc: "Чувство отчуждённости от других людей",
    manifestation: "Ощущение что ты принципиально другая, не вписываешься ни в какую группу.",
  },
  {
    id: "dependence", name: "Зависимость", domain: "Автономия", icon: "thread",
    desc: "Неспособность справляться с повседневной жизнью без помощи",
    manifestation: "Трудно принимать решения самостоятельно, постоянно нужна поддержка и одобрение.",
  },
  {
    id: "vulnerability", name: "Уязвимость", domain: "Автономия", icon: "bolt",
    desc: "Страх что катастрофа случится в любой момент",
    manifestation: "Постоянная фоновая тревога что случится что-то плохое — болезнь, катастрофа, потеря.",
  },
  {
    id: "enmeshment", name: "Слияние / Неразвитость Я", domain: "Автономия", icon: "spiral",
    desc: "Чрезмерная эмоциональная вовлечённость с близким",
    manifestation: "Границы размыты с кем-то близким — ты живёшь его жизнью или чувствуешь что не имеешь своей.",
  },
  {
    id: "failure", name: "Неудача", domain: "Автономия", icon: "trendDown",
    desc: "Убеждение что ты неизбежно потерпишь неудачу",
    manifestation: "Убеждение что ты в итоге провалишься, что другие лучше, что твои достижения — случайность.",
  },
  {
    id: "entitlement", name: "Привилегированность", domain: "Границы", icon: "crown",
    desc: "Убеждение что правила не для тебя",
    manifestation: "Сложно принимать ограничения, раздражение когда правила распространяются на тебя.",
  },
  {
    id: "self_control", name: "Недостаточный самоконтроль", domain: "Границы", icon: "tornado",
    desc: "Трудности с контролем импульсов и фрустрации",
    manifestation: "Трудно сдерживать эмоции, откладываешь дела, действуешь импульсивно.",
  },
  {
    id: "subjugation", name: "Подчинение", domain: "Другие", icon: "masks",
    desc: "Подавление своих желаний ради других",
    manifestation: "Подавляешь свои желания ради других, боишься конфликта, говоришь «всё хорошо» когда плохо.",
  },
  {
    id: "self_sacrifice", name: "Самопожертвование", domain: "Другие", icon: "candle",
    desc: "Чрезмерная забота о других в ущерб себе",
    manifestation: "Ставишь чужие нужды выше своих, потом чувствуешь обиду и истощение.",
  },
  {
    id: "approval", name: "Поиск одобрения", domain: "Другие", icon: "mirror",
    desc: "Потребность в постоянном одобрении и признании",
    manifestation: "Постоянно нужно знать что тебя одобряют, трудно действовать без подтверждения извне.",
  },
  {
    id: "negativity", name: "Негативизм", domain: "Сверхбдительность", icon: "rainCloud",
    desc: "Фокус на негативных сторонах жизни",
    manifestation: "Фокус автоматически идёт на плохое — угрозы, потери, то что может пойти не так.",
  },
  {
    id: "inhibition", name: "Эмоциональное подавление", domain: "Сверхбдительность", icon: "iceCube",
    desc: "Подавление спонтанных эмоций и импульсов",
    manifestation: "Подавляешь эмоции, спонтанность, боишься потерять контроль или выглядеть слабой.",
  },
  {
    id: "standards", name: "Жёсткие стандарты", domain: "Сверхбдительность", icon: "scales",
    desc: "Давление постоянно соответствовать высоким стандартам",
    manifestation: "Постоянное давление делать лучше, критика себя за ошибки, никогда не достаточно хорошо.",
  },
  {
    id: "punitiveness", name: "Карательность", domain: "Сверхбдительность", icon: "hammer",
    desc: "Убеждение что люди должны быть строго наказаны за ошибки",
    manifestation: "Строгость к себе и другим за ошибки, трудно прощать, убеждение что наказание заслужено.",
  },
];

// 8 базовых эмоций по кругу Плутчика
export const MOODS_BASIC = [
  { id: "joy",          label: "Радость",      color: "#E9C46A", icon: "faceJoy" },
  { id: "trust",        label: "Доверие",      color: "#7EC8B0", icon: "handshake" },
  { id: "fear",         label: "Страх",        color: "#7B68A0", icon: "faceFear" },
  { id: "surprise",     label: "Удивление",    color: "#74B3CE", icon: "faceSurprise" },
  { id: "sad",          label: "Грусть",       color: "#89B4CC", icon: "faceSad" },
  { id: "disgust",      label: "Отвращение",   color: "#8D9E7A", icon: "faceDisgust" },
  { id: "angry",        label: "Злость",       color: "#E76F51", icon: "faceAngry" },
  { id: "anticipation", label: "Ожидание",     color: "#F4A261", icon: "sunrise" },
];

// Полутона: производные Плутчика + эмоции схема-терапии
export const MOODS_EXTENDED = [
  // Позитивные и смешанные
  { id: "ecstasy",       label: "Восторг",        color: "#FFD166", icon: "sparkle" },
  { id: "love",          label: "Любовь",          color: "#FFB3BA", icon: "heart" },
  { id: "optimism",      label: "Оптимизм",        color: "#A8D8A8", icon: "sprout" },
  { id: "interest",      label: "Интерес",         color: "#B8D4E8", icon: "search" },
  { id: "admiration",    label: "Восхищение",      color: "#6EC6A8", icon: "star" },
  { id: "gratitude",     label: "Благодарность",   color: "#F8C8D4", icon: "flower" },
  { id: "pride",         label: "Гордость",        color: "#C8A8E9", icon: "medal" },
  { id: "tenderness",    label: "Нежность",        color: "#FFD4E8", icon: "tenderHeart" },
  { id: "inspiration",   label: "Вдохновение",     color: "#B8E8D4", icon: "butterfly" },
  // Негативные и полутона
  { id: "anxious",       label: "Тревога",         color: "#F4A261", icon: "faceAnxious" },
  { id: "terror",        label: "Ужас",            color: "#5A4A8A", icon: "faceTerror" },
  { id: "sorrow",        label: "Печаль",          color: "#A8C0D8", icon: "rainCloud" },
  { id: "grief",         label: "Горе",            color: "#4A6080", icon: "heartCrack" },
  { id: "irritable",     label: "Раздражение",     color: "#E8A838", icon: "flame" },
  { id: "rage",          label: "Ярость",          color: "#C1392B", icon: "burst" },
  { id: "contempt",      label: "Презрение",       color: "#7A8870", icon: "faceContempt" },
  { id: "disappointment",label: "Разочарование",   color: "#C8B8C8", icon: "faceDisappointed" },
  { id: "nostalgia",     label: "Ностальгия",      color: "#C8A8D8", icon: "photo" },
  { id: "longing",       label: "Тоска",           color: "#8B9BC0", icon: "moon" },
  { id: "hurt",          label: "Обида",           color: "#89ABE3", icon: "droplet" },
  { id: "embarrassment", label: "Смущение",        color: "#F4C8A8", icon: "faceEmbarrassed" },
  { id: "confusion",     label: "Растерянность",   color: "#B8C8E8", icon: "spiral" },
  // Эмоции схема-терапии
  { id: "shame",         label: "Стыд",            color: "#B5838D", icon: "rose" },
  { id: "guilt",         label: "Вина",            color: "#8B8BA8", icon: "anchor" },
  { id: "loneliness",    label: "Одиночество",     color: "#9AB8D8", icon: "candle" },
  { id: "numb",          label: "Пустота",         color: "#9B9B9B", icon: "mist" },
  { id: "overwhelmed",   label: "Перегрузка",      color: "#6D4C7D", icon: "wave" },
];

// Объединённый массив — для поиска по id в сохранённых записях
export const MOODS = [...MOODS_BASIC, ...MOODS_EXTENDED];

export const CYCLE_PHASES = [
  {
    key: "menstrual", days: [1,2,3,4,5], name: "Менструация", color: "#B07C79",
    tip: "Время отдыха и восстановления",
    gynComment: "Эстроген и прогестерон на минимуме. Матка сокращается, эндометрий отторгается. Норма — тянущие боли, усталость, снижение иммунитета.",
    mentalComment: "Схемы брошенности и дефективности активнее. Потребность в уединении — физиологична. Снизь планку требований к себе.",
  },
  {
    key: "follicular", days: [6,7,8,9,10,11,12,13], name: "Фолликулярная", color: "#8FA97E",
    tip: "Энергия растёт, хорошее время для новых начинаний",
    gynComment: "Эстроген растёт — фолликулы созревают. Выделения становятся тянущимися. Энергия, настроение и когнитивные функции улучшаются.",
    mentalComment: "Схемы активируются меньше. Хорошее время для сложных разговоров, новых решений, терапевтической работы.",
  },
  {
    key: "ovulation", days: [14,15,16], name: "Овуляция", color: "#D2A85F",
    tip: "Пик энергии — ты на подъёме",
    gynComment: "Пик эстрогена, ЛГ и ФСГ. Прозрачные тянущиеся выделения. Возможны боли сбоку. Пик либидо.",
    mentalComment: "Социальные потребности на пике. Хорошее время для близости и сотрудничества.",
  },
  {
    key: "luteal", days: [17,18,19,20,21,22,23,24,25,26,27,28], name: "Лютеиновая", color: "#8E7C93",
    tip: "Схемы активнее — будь нежна с собой",
    gynComment: "Прогестерон растёт, потом падает. Задержка жидкости, отёчность, чувствительность груди — норма. ПМС в дни 21–28.",
    mentalComment: "Время наибольшей уязвимости. Раздражительность, плаксивость — биохимия, не слабость. Требуется больше заботы о себе.",
  },
];

export const PHYSICAL_SYMPTOMS = [
  { id: "cramps", label: "Спазмы", icon: "spiral" },
  { id: "headache", label: "Голова", icon: "headache" },
  { id: "breast_pain", label: "Грудь", icon: "tenderHeart" },
  { id: "back_pain", label: "Спина", icon: "bone" },
  { id: "fatigue", label: "Усталость", icon: "sleep" },
  { id: "acne", label: "Акне", icon: "faceDisappointed" },
  { id: "insomnia", label: "Бессонница", icon: "moon" },
  { id: "appetite_up", label: "Аппетит", icon: "trendUp" },
  { id: "appetite_down", label: "Аппетит", icon: "trendDown" },
  { id: "swelling", label: "Отёки", icon: "droplet" },
  { id: "nausea", label: "Тошнота", icon: "faceSick" },
  { id: "hot_flash", label: "Приливы", icon: "flame" },
];

export const DISCHARGE_TYPES = [
  { id: "none", label: "Нет", icon: "circleEmpty" },
  { id: "dry", label: "Сухо", icon: "dry" },
  { id: "white", label: "Белые/кремовые", icon: "mist" },
  { id: "clear", label: "Прозрачные тянущиеся", icon: "gem" },
  { id: "watery", label: "Водянистые", icon: "droplet" },
  { id: "bloody", label: "Кровянистые", icon: "bloodDrop" },
];

export const DIGESTION = [
  { id: "normal", label: "Обычно", icon: "check" },
  { id: "bloating", label: "Вздутие", icon: "bubbles" },
  { id: "constipation", label: "Запор", icon: "rock" },
  { id: "diarrhea", label: "Диарея", icon: "windGust" },
  { id: "nausea", label: "Тошнота", icon: "faceSick" },
];

export const LIBIDO = [
  { id: "none", label: "Нет", icon: "snowflake" },
  { id: "low", label: "Низкое", icon: "moon" },
  { id: "medium", label: "Среднее", icon: "cloudSun" },
  { id: "high", label: "Высокое", icon: "flame" },
];

export const NEEDS = [
  { id: "food", label: "Еда", level: "physio", icon: "plate" },
  { id: "sleep", label: "Сон", level: "physio", icon: "sleep" },
  { id: "water", label: "Вода", level: "physio", icon: "droplet" },
  { id: "movement", label: "Движение", level: "physio", icon: "walk" },
  { id: "safety", label: "Безопасность", level: "safety", icon: "shield" },
  { id: "stability", label: "Стабильность", level: "safety", icon: "anchor" },
  { id: "confidence", label: "Уверенность", level: "safety", icon: "flex" },
  { id: "communication", label: "Общение", level: "social", icon: "chat" },
  { id: "support", label: "Поддержка", level: "social", icon: "handshake" },
  { id: "love", label: "Любовь", level: "social", icon: "heart" },
  { id: "care", label: "Забота", level: "social", icon: "flower" },
  { id: "respect", label: "Уважение", level: "esteem", icon: "star" },
  { id: "recognition", label: "Признание", level: "esteem", icon: "medal" },
  { id: "attachment", label: "Привязанность", level: "esteem", icon: "link" },
  { id: "creativity", label: "Творчество", level: "growth", icon: "palette" },
  { id: "development", label: "Развитие", level: "growth", icon: "sprout" },
  { id: "knowledge", label: "Познание", level: "growth", icon: "book" },
  { id: "skill", label: "Мастерство", level: "growth", icon: "bolt" },
  { id: "beauty", label: "Красота", level: "aesthetic", icon: "flower" },
  { id: "travel", label: "Путешествия", level: "aesthetic", icon: "plane" },
  { id: "art", label: "Искусство", level: "aesthetic", icon: "masks" },
  { id: "leadership", label: "Лидерство", level: "self", icon: "crown" },
  { id: "mentorship", label: "Менторство", level: "self", icon: "openHands" },
  { id: "self_dev", label: "Самореализация", level: "self", icon: "butterfly" },
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
    { id: "breathing_478", name: "Дыхание 4-7-8", icon: "breath", duration: "2 мин", desc: "Вдох 4 сек → задержка 7 сек → выдох 8 сек. 4 цикла. Активирует парасимпатику." },
    { id: "cold_water", name: "Холодная вода", icon: "droplet", duration: "1 мин", desc: "Умойся холодной водой. Активирует рефлекс ныряния — замедляет сердце." },
    { id: "tapping", name: "EFT-постукивание", icon: "tap", duration: "5 мин", desc: "Постукивай по точкам называя чувство: «Я чувствую тревогу и принимаю себя»" },
    { id: "grounding", name: "5-4-3-2-1", icon: "sprout", duration: "3 мин", desc: "5 видишь, 4 слышишь, 3 чувствуешь, 2 пахнут, 1 на вкус" },
  ],
  schema: [
    { id: "safe_place", name: "Безопасное место", icon: "home", duration: "10 мин", desc: "Визуализация места где ты в безопасности и принята" },
    { id: "inner_child", name: "Внутренний ребёнок", icon: "teddyBear", duration: "15 мин", desc: "Поговори с той частью себя, которой сейчас больно" },
    { id: "healthy_adult", name: "Здоровый Взрослый", icon: "flex", duration: "8 мин", desc: "Что сказал бы тебе мудрый, заботливый взрослый?" },
    { id: "chair_work", name: "Работа со стулом", icon: "chair", duration: "20 мин", desc: "Письмо от схемы и ответ от Здорового Взрослого" },
    { id: "needs_ex", name: "Базовая потребность", icon: "heart", duration: "5 мин", desc: "Какая базовая потребность сейчас не удовлетворена?" },
  ],
  cbt: [
    { id: "thought_record", name: "Дневник мыслей", icon: "notebook", duration: "10 мин", desc: "Запиши автоматическую мысль и найди альтернативу" },
    { id: "behavioral_act", name: "Поведенческая активация", icon: "walk", duration: "5 мин", desc: "Одно маленькое действие которое принесёт удовольствие" },
    { id: "decatastrophizing", name: "Декатастрофизация", icon: "search", duration: "8 мин", desc: "Что самое плохое? Насколько вероятно? Что сделаешь?" },
    { id: "resource_state", name: "Ресурсное состояние", icon: "star", duration: "7 мин", desc: "Вспомни момент когда ты чувствовала себя хорошо. Погрузись в него." },
  ],
};

export const QUICK_STATES = [
  { id: "bad", label: "Мне плохо", icon: "wave", prompt: "Мне сейчас очень плохо. Просто побудь рядом и помоги разобраться что происходит." },
  { id: "anxious", label: "Тревожусь", icon: "faceAnxious", prompt: "Я сейчас сильно тревожусь. Помоги мне успокоиться и понять откуда эта тревога." },
  { id: "talk", label: "Хочу поговорить", icon: "chat", prompt: "Хочу просто поговорить о том что у меня на душе. Я готова рассказать." },
  { id: "technique", label: "Нужна техника", icon: "wrench", prompt: "Порекомендуй мне конкретную технику для моего состояния прямо сейчас." },
  { id: "schema_now", label: "Схема активна", icon: "spiral", prompt: "Я чувствую что у меня активировалась схема. Помоги разобраться какая и что с этим делать." },
  { id: "angry_now", label: "Злость/вспышка", icon: "burst", prompt: "У меня вспышка злости / раздражения. Помоги справиться прямо сейчас." },
];

export const DOMAINS = [...new Set(SCHEMAS.map(s => s.domain))];
