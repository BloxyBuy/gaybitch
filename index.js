const mineflayer = require('mineflayer');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalBlock } = require('mineflayer-pathfinder').goals;

const config = require('./settings.json');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// ===== Express + Socket.io setup =====
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // serve console frontend

server.listen(8000, '0.0.0.0', () => {
  console.log('Web server + Socket.io started on http://<your-vm-ip>:8000');
});

// ===== Log buffer for past messages =====
const logBuffer = [];
const MAX_LOGS = 1000; // store last 1000 lines

// ===== Patch console.log to send to browser =====
const oldLog = console.log;
console.log = (...args) => {
  const msg = args.join(" ");
  oldLog(msg); // still log in VM terminal

  // remove CMD color codes
  const cleanMsg = msg.replace(/\x1b\[[0-9;]*m/g, "");

  // add to buffer
  logBuffer.push(cleanMsg);
  if (logBuffer.length > MAX_LOGS) logBuffer.shift(); // maintain max buffer

  io.emit("log", cleanMsg); // broadcast to all clients
};

// ===== Send buffer to new clients =====
io.on("connection", (socket) => {
  logBuffer.forEach(line => socket.emit("log", line));
});

// ===== Utility: Random Username Generator =====
function randomUsername(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

let bot; // global reference

// ===== Restart Bot Helper =====
function restartBot() {
  if (bot) {
    console.log("[INFO] Restarting bot...");
    try {
      bot.removeAllListeners();
      bot.end();
    } catch (err) {
      console.error("[WARN] Error while ending bot:", err.message);
    }
  }

  setTimeout(() => {
    createBot();
  }, config.utils['auto-recconect-delay'] || 5000);
}

// ===== Main Bot Creation Function =====
function createBot() {
  // generate new username each time
  config["bot-account"]["username"] = randomUsername(16);
  console.log(`[INFO] Generated new username: ${config["bot-account"]["username"]}`);

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

  // ===== Debug Events =====
  bot.on('login', () => console.log('[DEBUG] Bot is logging in...'));
  bot.on('spawn', () => console.log('[DEBUG] Bot spawned successfully!'));
  bot.on('end', () => console.log('[DEBUG] Bot connection ended.'));

  // ===== Auto Register/Login =====
  function sendRegister(password) {
    return new Promise((resolve, reject) => {
      bot.chat(`/register ${password} ${password}`);
      console.log(`[Auth] Sent /register command.`);

      bot.once('chat', (username, message) => {
        console.log(`[ChatLog] <${username}> ${message}`);
        if (message.includes('successfully registered') || message.includes('already registered')) {
          console.log('[INFO] Registration confirmed.');
          resolve();
        } else if (message.includes('Invalid command')) {
          reject(`Registration failed: Invalid command. Message: "${message}"`);
        } else {
          reject(`Registration failed: unexpected message "${message}".`);
        }
      });
    });
  }

  function sendLogin(password) {
    return new Promise((resolve, reject) => {
      bot.chat(`/login ${password}`);
      console.log(`[Auth] Sent /login command.`);

      bot.once('chat', (username, message) => {
        console.log(`[ChatLog] <${username}> ${message}`);
        if (message.includes('successfully logged in')) {
          console.log('[INFO] Login successful.');
          resolve();
        } else if (message.includes('Invalid password')) {
          reject(`Login failed: Invalid password. Message: "${message}"`);
        } else if (message.includes('not registered')) {
          reject(`Login failed: Not registered. Message: "${message}"`);
        } else {
          reject(`Login failed: unexpected message "${message}".`);
        }
      });
    });
  }

  // ===== On Spawn =====
  bot.once('spawn', () => {
    console.log(`[AfkBot] Bot joined the server as ${config['bot-account']['username']}`);

    if (config.utils['auto-auth'].enabled) {
      console.log('[INFO] Started auto-auth module');
      const password = config.utils['auto-auth'].password;

      pendingPromise = pendingPromise
        .then(() => sendRegister(password))
        .then(() => sendLogin(password))
        .catch(error => console.error('[ERROR]', error));
    }

    if (config.utils['chat-messages'].enabled) {
      console.log('[INFO] Started chat-messages module');
      const messages = config.utils['chat-messages']['messages'];

      if (config.utils['chat-messages'].repeat) {
        const delay = config.utils['chat-messages']['repeat-delay'];
        let i = 0;

        setInterval(() => {
          bot.chat(`${messages[i]}`);
          i = (i + 1) % messages.length;
        }, delay * 1000);
      } else {
        messages.forEach(msg => bot.chat(msg));
      }
    }

    const pos = config.position;
    if (config.position.enabled) {
      console.log(`[AfkBot] Moving to target location (${pos.x}, ${pos.y}, ${pos.z})`);
      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
    }

    if (config.utils['anti-afk'].enabled) {
      bot.setControlState('jump', true);
      if (config.utils['anti-afk'].sneak) bot.setControlState('sneak', true);
    }
  });

  // ===== Bot Events =====
  bot.on('goal_reached', () => console.log(`[AfkBot] Bot arrived at the target location.`));
  bot.on('death', () => console.log(`[AfkBot] Bot has died and respawned.`));

  if (config.utils['auto-reconnect']) {
    bot.on('end', () => {
      console.log("[INFO] Bot ended, auto-restarting...");
      restartBot();
    });
  }

  bot.on('kicked', reason => {
    console.log(`[AfkBot] Bot was kicked. Reason: ${reason}`);
    restartBot();
  });

  bot.on('error', err => console.log(`[ERROR] ${err.message}`));
}

// ===== Start Bot =====
createBot();
