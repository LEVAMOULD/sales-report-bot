const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN_ID = process.env.ADMIN_ID;

const sessions = {};

const questions = [
  'Сколько сообщений отправил сегодня?',
  'Сколько человек заинтересовались?',
  'Сколько сделок закрыл?',
  '💬 Комментарий + 📸 прикрепи скриншот переписок:'
];

const keys = ['messages', 'interested', 'deals', 'comment'];

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { step: 0, data: {} };
  bot.sendMessage(chatId, '👋 Привет! Начинаем отчёт.\n\n' + questions[0]);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  if (msg.text && msg.text.startsWith('/')) return;
  if (!sessions[chatId]) return;

  const session = sessions[chatId];
  const step = session.step;

  // Последний шаг — принимаем фото или текст
  if (step === questions.length - 1) {
    if (msg.photo) {
      session.data[keys[step]] = '📸 Скриншот прикреплён';
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      const name = msg.from.username ? '@' + msg.from.username : (msg.from.first_name || 'Менеджер');
      const report = `📊 Отчёт от ${name}:\n\n` +
        `📨 Сообщений: ${session.data.messages}\n` +
        `👀 Заинтересовались: ${session.data.interested}\n` +
        `✅ Сделок закрыто: ${session.data.deals}\n` +
        `💬 Комментарий: ${session.data.comment || '—'}`;

      bot.sendPhoto(ADMIN_ID, fileId, { caption: report });
      bot.sendMessage(chatId, '✅ Отчёт отправлен! Молодец, так держать 💪');
      delete sessions[chatId];
    } else if (msg.text) {
      session.data[keys[step]] = msg.text;
      const name = msg.from.username ? '@' + msg.from.username : (msg.from.first_name || 'Менеджер');
      const report = `📊 Отчёт от ${name}:\n\n` +
        `📨 Сообщений: ${session.data.messages}\n` +
        `👀 Заинтересовались: ${session.data.interested}\n` +
        `✅ Сделок закрыто: ${session.data.deals}\n` +
        `💬 Комментарий: ${session.data.comment}`;

      bot.sendMessage(ADMIN_ID, report);
      bot.sendMessage(chatId, '✅ Отчёт отправлен! Молодец, так держать 💪');
      delete sessions[chatId];
    }
    return;
  }

  // Остальные шаги — только текст
  if (!msg.text) return;
  session.data[keys[step]] = msg.text;
  session.step++;
  bot.sendMessage(chatId, questions[session.step]);
});
