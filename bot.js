const TelegramBot = require("node-telegram-bot-api");
const Groq = require("groq-sdk");
const { MOED_CONTEXT } = require("./moed-context");

// ─── CONFIGURACIÓN ───────────────────────────────────────────────
const TELEGRAM_TOKEN = "8978274364:AAHoEGj8HN2fapCzxKN3Nsalo8BXG3Kr8lM";
const GROQ_API_KEY = "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";
// ─────────────────────────────────────────────────────────────────

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const groq = new Groq({ apiKey: GROQ_API_KEY });
const conversations = new Map();
console.log("🤖 Bot MOED servicio al cliente iniciado.");

bot.onText(/\/start/, (msg) => {
  conversations.delete(msg.chat.id);
  const name = msg.from.first_name || "usuario";
  bot.sendMessage(
    msg.chat.id,
    `👋 ¡Hola, ${name}! Soy el asistente de MOED.\n\nPuedo ayudarte con:\n🪙 Tokens\n🃏 Disefichas\n🏠 Salas de intercambio\n📰 Periódico\n📌 El Mural\n\nEscríbeme tu pregunta 😊`
  );
});

bot.onText(/\/clear/, (msg) => {
  conversations.delete(msg.chat.id);
  bot.sendMessage(msg.chat.id, "🗑️ Conversación reiniciada.");
});

bot.on("message", async (msg) => {
  if (msg.text && msg.text.startsWith("/")) return;
  const chatId = msg.chat.id;
  const userText = msg.text;
  if (!userText) return;

  bot.sendChatAction(chatId, "typing");

  if (!conversations.has(chatId)) conversations.set(chatId, []);
  const history = conversations.get(chatId);
  history.push({ role: "user", content: userText });
  if (history.length > 20) history.splice(0, history.length - 20);

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: MOED_CONTEXT },
        ...history,
      ],
      max_tokens: 1024,
    });
    const reply = response.choices[0].message.content;
    history.push({ role: "assistant", content: reply });
    bot.sendMessage(chatId, reply);
  } catch (error) {
    console.error("Error:", error.message);
    bot.sendMessage(chatId, "⚠️ Error al procesar tu mensaje. Intenta de nuevo.");
  }
});

bot.on("polling_error", (error) => {
  console.error("Polling error:", error.message);
});
