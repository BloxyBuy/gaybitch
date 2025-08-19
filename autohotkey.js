PowerShell 7.4.11

   A new PowerShell stable release is available: v7.5.2
   Upgrade now, or check out the release page at:
     https://aka.ms/PowerShell-Release?tag=v7.5.2

PS C:\Users\kbercismp\Documents\Slobos-Aternos-AFK-Bot> node index.js
[INFO] Generated new username: puWEs6R2mqYJl8C6
Web server + Socket.io started on http://<your-vm-ip>:8000
[AfkBot] Bot joined the server as puWEs6R2mqYJl8C6
[INFO] Started chat-messages module
[Afk Bot] Starting to move to target location (-108, 68, -6)
Error: client timed out after 30000 milliseconds
[ERROR] client timed out after 30000 milliseconds
[INFO] Bot ended, auto-restarting...
[INFO] Restarting bot...
[INFO] Generated new username: PYOm9mxzSMBEYfmi
[AfkBot] Bot joined the server as PYOm9mxzSMBEYfmi
[INFO] Started chat-messages module
[Afk Bot] Starting to move to target location (-108, 68, -6)
node:events:496
      throw er; // Unhandled 'error' event
      ^

Error: client timed out after 30000 milliseconds
    at Timeout._onTimeout (C:\Users\kbercismp\Documents\Slobos-Aternos-AFK-Bot\node_modules\minecraft-protocol\src\client\keepalive.js:18:28)
    at listOnTimeout (node:internal/timers:588:17)
    at process.processTimers (node:internal/timers:523:7)
Emitted 'error' event at:
    at Client.<anonymous> (C:\Users\kbercismp\Documents\Slobos-Aternos-AFK-Bot\node_modules\mineflayer\lib\loader.js:99:9)
    at Client.emit (node:events:518:28)
    at Timeout._onTimeout (C:\Users\kbercismp\Documents\Slobos-Aternos-AFK-Bot\node_modules\minecraft-protocol\src\client\keepalive.js:18:14)
    at listOnTimeout (node:internal/timers:588:17)
    at process.processTimers (node:internal/timers:523:7)

Node.js v22.18.0
PS C:\Users\kbercismp\Documents\Slobos-Aternos-AFK-Bot>
