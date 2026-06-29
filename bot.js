const TelegramBot = require("node-telegram-bot-api");
const Anthropic = require("@anthropic-ai/sdk");

// ─── CONFIGURACIÓN ───────────────────────────────────────────────
const TELEGRAM_TOKEN = "TU_TOKEN_DE_TELEGRAM"; // @BotFather
const ANTHROPIC_API_KEY = "TU_API_KEY_DE_CLAUDE"; // console.anthropic.com
const SYSTEM_PROMPT = `Eres un asistente útil, amable y conciso. 
Respondes en el mismo idioma que te hablan.
Eres un bot de Telegram, así que mantén respuestas cortas y claras.`;
// ─────────────────────────────────────────────────────────────────

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const claude = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Historial de conversación por usuario (memoria en RAM)
const conversations = new Map();
const MAX_HISTORY = 20; // máximo de mensajes por usuario

console.log("🤖 Bot iniciado. Escuchando mensajes...");

// Comando /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "amigo";
  conversations.delete(chatId); // limpiar historial al iniciar
  bot.sendMessage(
    chatId,
    `👋 ¡Hola, ${name}! Soy un asistente con IA.\n\nPuedes hablarme de lo que quieras. Uso:\n/start — reiniciar conversación\n/clear — borrar historial\n/help — ayuda`
  );
});

// Comando /clear
bot.onText(/\/clear/, (msg) => {
  conversations.delete(msg.chat.id);
  bot.sendMessage(msg.chat.id, "🗑️ Historial borrado. ¡Nueva conversación!");
});

// Comando /help
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "ℹ️ *Comandos disponibles:*\n\n/start — Reiniciar el bot\n/clear — Borrar historial de conversación\n/help — Mostrar esta ayuda\n\nSimplemente escríbeme y te respondo con IA 🧠",
    { parse_mode: "Markdown" }
  );
});

// Mensajes normales
bot.on("message", async (msg) => {
  // Ignorar comandos
  if (msg.text && msg.text.startsWith("/")) return;

  const chatId = msg.chat.id;
  const userText = msg.text || msg.caption;

  // Ignorar mensajes sin texto
  if (!userText) {
    bot.sendMessage(chatId, "Solo puedo procesar mensajes de texto por ahora.");
    return;
  }

  // Indicador de escritura
  bot.sendChatAction(chatId, "typing");

  // Obtener o inicializar historial
  if (!conversations.has(chatId)) {
    conversations.set(chatId, []);
  }
  const history = conversations.get(chatId);

  // Agregar mensaje del usuario
  history.push({ role: "user", content: userText });

  // Limitar historial
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  try {
    const response = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: history,
    });

    const reply = response.content[0].text;

    // Guardar respuesta en historial
    history.push({ role: "assistant", content: reply });

    // Enviar respuesta (con fallback si falla Markdown)
    try {
      await bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
    } catch {
      await bot.sendMessage(chatId, reply);
    }
  } catch (error) {
    console.error("Error Claude API:", error.message);
    bot.sendMessage(
      chatId,
      "⚠️ Hubo un error al procesar tu mensaje. Intenta de nuevo."
    );
  }
});

// Errores de polling
bot.on("polling_error", (error) => {
  console.error("Polling error:", error.message);
});
