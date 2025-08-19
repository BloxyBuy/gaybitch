const mineflayer = require('mineflayer');
const { Movements, pathfinder, goals: { GoalBlock } } = require('mineflayer-pathfinder');
const config = require('./settings.json');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// ===== Express + Socket.io setup =====
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const PORT = 8000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Web server + Socket.io started on http://<your-vm-ip>:${PORT}`);
});

// ===== Log Buffer for browser =====
const MAX_LOGS = 500;
let logBuffer = [];

// ===== Helper: Remove color codes =====
function stripColors(msg) {
  if (!msg) return "";
  return msg.toString().replace(/\x1b\[[0-9;]*m/g, "");
}

// ===== Patch console.log =====
const oldLog = console.log;
console.log = (...args) => {
  const msg = args.join(" ");
  const cleanMsg = stripColors(msg);

  oldLog(cleanMsg); // CMD
  logBuffer.push(cleanMsg); // buffer
  if (logBuffer.length > MAX_LOGS) logBuffer.shift();

  io.emit("log", cleanMsg); // browser
};

// ===== Serve full log on connect =====
io.on("connection", (socket) => {
  logBuffer.forEach(msg => socket.emit("log", msg));
});

// ===== Utility: Random Username =====
function randomUsername(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

let bot;

// ===== Restart Bot =====
function restartBot() {
  if (bot) {
    console.log("[INFO] Restarting bot...");
    try { bot.removeAllListeners(); bot.end(); } catch(err) {
      console.error("[WARN] Error ending bot:", stripColors(err.message));
    }
  }
  setTimeout(createBot, config.utils['auto-recconect-delay'] || 5000);
}

// ===== Create Bot =====
function createBot() {
  config["bot-account"]["username"] = randomUsername(16);
  console.log(`[INFO] Generated username: ${config["bot-account"]["username"]}`);

  bot = mineflayer.createBot({
    username: config['bot-account']['username'],
    password: config['bot-account']['password'],
    auth: config['bot-account']['type'],
    host: config.server.ip,
    port: config.server.port,
    version: config.server.version || false,
    timeout: 60000
  });

  bot.loadPlugin(pathfinder);
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  bot.settings.colorsEnabled = false;

  let pendingPromise = Promise.resolve();

  // ===== Bot Events =====
  bot.on('login', () => console.log('[DEBUG] Bot logging in...'));
  bot.on('spawn', () => console.log('[DEBUG] Bot spawned successfully!'));
  bot.on('end', () => console.log('[DEBUG] Bot connection ended.'));
  bot.on('error', err => console.log(`[ERROR] ${stripColors(err.message)}`));
  bot.on('kicked', reason => {
    console.log(`[AfkBot] Bot was kicked. Reason: ${stripColors(reason)}`);
    restartBot();
  });

  bot.on('chat', (username, message) => {
    console.log(`[Chat] <${username}> ${stripColors(message)}`);
  });

  bot.on('goal_reached', () => {
    console.log(`[AfkBot] Bot arrived at target location: ${bot.entity.position}`);
  });

  bot.on('death', () => {
    console.log(`[AfkBot] Bot died and respawned at ${bot.entity.position}`);
  });

  if (config.utils['auto-reconnect']) {
    bot.on('end', () => {
      console.log("[INFO] Bot ended, auto-restarting...");
      restartBot();
    });
  }

  // ===== Auto Auth =====
  function sendRegister(password) {
    return new Promise((resolve, reject) => {
      bot.chat(`/register ${password} ${password}`);
      console.log(`[Auth] Sent /register`);
      bot.once('chat', (username, message) => {
        message = stripColors(message);
        console.log(`[ChatLog] <${username}> ${message}`);
        if (message.includes('successfully registered') || message.includes('already registered')) resolve();
        else if (message.includes('Invalid command')) reject(`Registration failed: Invalid command. Message: "${message}"`);
        else reject(`Registration failed: unexpected message "${message}".`);
      });
    });
  }

  function sendLogin(password) {
    return new Promise((resolve, reject) => {
      bot.chat(`/login ${password}`);
      console.log(`[Auth] Sent /login`);
      bot.once('chat', (username, message) => {
        message = stripColors(message);
        console.log(`[ChatLog] <${username}> ${message}`);
        if (message.includes('successfully logged in')) resolve();
        else if (message.includes('Invalid password')) reject(`Login failed: Invalid password. Message: "${message}"`);
        else if (message.includes('not registered')) reject(`Login failed: Not registered. Message: "${message}"`);
        else reject(`Login failed: unexpected message "${message}".`);
      });
    });
  }

  bot.once('spawn', () => {
    console.log(`[AfkBot] Bot joined as ${config['bot-account']['username']}`);

    if (config.utils['auto-auth'].enabled) {
      console.log('[INFO] Auto-auth module started');
      const password = config.utils['auto-auth'].password;

      pendingPromise = pendingPromise
        .then(() => sendRegister(password))
        .then(() => sendLogin(password))
        .catch(error => console.error('[ERROR]', stripColors(error)));
    }

    if (config.utils['chat-messages'].enabled) {
      console.log('[INFO] Chat-messages module started');
      const messages = config.utils['chat-messages']['messages'];
      if (config.utils['chat-messages'].repeat) {
        let i = 0;
        const delay = config.utils['chat-messages']['repeat-delay'];
        setInterval(() => {
          bot.chat(messages[i]);
          i = (i + 1) % messages.length;
        }, delay * 1000);
      } else {
        messages.forEach(msg => bot.chat(msg));
      }
    }

    if (config.position.enabled) {
      const pos = config.position;
      console.log(`[AfkBot] Moving to target (${pos.x}, ${pos.y}, ${pos.z})`);
      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
    }

    if (config.utils['anti-afk'].enabled) {
      bot.setControlState('jump', true);
      if (config.utils['anti-afk'].sneak) bot.setControlState('sneak', true);
    }
  });
}

createBot();
