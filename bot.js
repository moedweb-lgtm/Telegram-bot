TelegramBot = require("node-telegram-bot-api");
const Groq = require("groq-sdk");

const TELEGRAM_TOKEN = "8978274364:AAHdJjaqOHTsrhEh_xSvhHxPKRQ90DdBAiU";
const GROQ_API_KEY = "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";
const SYSTEM_PROMPT = " `Eres un agente de servicio al cliente amable y profesional de MOED, una plataforma educativa web https://moedweb.netlify.app.

Tu trabajo es:
- Responder preguntas sobre la plataforma MOED
- Ayudar a los usuarios con problemas o dudas
- Ser siempre cordial, paciente y claro
- Responder en el mismo idioma que el usuario
- Mantener respuestas cortas y útiles

Si no sabes algo, di que lo vas a consultar con el equipo y que se comunicarán pronto.
No inventes información. Si el usuario tiene un problema técnico serio, pídele su email para hacer seguimiento.`;
.";

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const groq = new Groq({ apiKey: GROQ_API_KEY });
const conversations = new Map();

console.log("Bot iniciado con Groq.");

bot.onText(/\/start/, (msg) => {
  conversations.delete(msg.chat.id);
  bot.sendMessage(msg.chat.id, "Hola! Soy tu asistente IA. Escríbeme lo que quieras.");
});

bot.onText(/\/clear/, (msg) => {
  conversations.delete(msg.chat.id);
  bot.sendMessage(msg.chat.id, "Historial borrado!");
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
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      max_tokens: 1024,
    });
    const reply = response.choices[0].message.content;
    history.push({ role: "assistant", content: reply });
    bot.sendMessage(chatId, reply);
  } catch (error) {
    console.error("Error:", error.message);
    bot.sendMessage(chatId, "Error al procesar tu mensaje.");
  }
});
