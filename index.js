const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN_ID = process.env.ADMIN_ID;

const sessions = {};
const users = new Set();

const questions = [
  'Сколько сообщений отправил сегодня?',
  'Сколько человек заинтересовались?',
  'Сколько сделок закрыл?',
  '💬 Комментарий + 📸 прикрепи скриншот переписок:'
];

const keys = ['messages', 'interested', 'deals', 'comment'];

function startReport(chatId) {
  sessions[chatId] = { step: 0, data: {} };
  bot.sendMessage(chatId, '👋 Начинаем отчёт!\n\n' + questions[0]);
}
bot.onText(/\/test/, (msg) => {
  bot.sendMessage(msg.chat.id, '🔔 Время сдать отчёт за сегодня!', {
    reply_markup: {
      inline_keyboard: [[
        { text: '📊 Начать отчёт', callback_data: 'start_report' }
      ]]
    }
  });
});
bot.onText(/\/start/, (msg) => {
  users.add(msg.chat.id);
  startReport(msg.chat.id);
});

bot.on('callback_query', (query) => {
  if (query.data === 'start_report') {
    bot.answerCallbackQuery(query.id);
    startReport(query.message.chat.id);
  }
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  users.add(chatId);
  if (msg.text && msg.text.startsWith('/')) return;
  if (!sessions[chatId]) return;

  const session = sessions[chatId];
  const step = session.step;
  const name = msg.from.username ? '@' + msg.from.username : (msg.from.first_name || 'Менеджер');

  if (step < questions.length - 1) {
    if (!msg.text) return;
    session.data[keys[step]] = msg.text;
    session.step++;
    bot.sendMessage(chatId, questions[session.step]);
    return;
  }

  if (msg.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const caption = msg.caption || '—';
    const report = `📊 Отчёт от ${name}:\n\n` +
      `📨 Сообщений: ${session.data.messages}\n` +
      `👀 Заинтересовались: ${session.data.interested}\n` +
      `✅ Сделок закрыто: ${session.data.deals}\n` +
      `💬 Комментарий: ${caption}`;
    bot.sendPhoto(ADMIN_ID, fileId, { caption: report });
    bot.sendMessage(chatId, '✅ Отчёт отправлен! Молодец 💪');
    delete sessions[chatId];
  } else if (msg.text) {
    session.data[keys[step]] = msg.text;
    const report = `📊 Отчёт от ${name}:\n\n` +
      `📨 Сообщений: ${session.data.messages}\n` +
      `👀 Заинтересовались: ${session.data.interested}\n` +
      `✅ Сделок закрыто: ${session.data.deals}\n` +
      `💬 Комментарий: ${session.data.comment}`;
    bot.sendMessage(ADMIN_ID, report);
    bot.sendMessage(chatId, '✅ Отчёт отправлен! Молодец 💪');
    delete sessions[chatId];
  }
});

// Напоминание каждый день в 20:00
function scheduleReminder() {
  const now = new Date();
  const next = new Date();
  next.setHours(17, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next - now;

  setTimeout(() => {
    users.forEach(chatId => {
      bot.sendMessage(chatId, '🔔 Время сдать отчёт за сегодня!', {
        reply_markup: {
          inline_keyboard: [[
            { text: '📊 Начать отчёт', callback_data: 'start_report' }
          ]]
        }
      });
    });
    scheduleReminder();
  }, delay);
}

scheduleReminder();
