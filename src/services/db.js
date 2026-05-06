//вызываем библиотеку pg - клиент для нод.js
const { Pool } = require('pg');

//создай мне объект который умеет работать с бд
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'new_base',
  password: process.env.DB_PASSWORD,//проверить пароль в файле env
  
  port: 5432,
  //прописали атрибуты, порт- стандартный для постгрескл
});

module.exports = pool;


//pool - менеджер подключения к базе, создает набор соединений
//модульэкспорт - экспортирую пул наружу, чтобы использовать в других файлах
