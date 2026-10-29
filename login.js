// One-time sign-in for the reposter: shows a QR in the terminal, prints a session string.
// Run it on the Mac with the VPN on:  TG_API_ID=… TG_API_HASH=… node login.js
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const QRCode = require('qrcode');

const apiId = Number(process.env.TG_API_ID), apiHash = process.env.TG_API_HASH;
if (!apiId || !apiHash) { console.error('Задайте TG_API_ID и TG_API_HASH'); process.exit(1); }

(async () => {
  const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 3 });
  client.setLogLevel('none');
  await client.connect();
  let asked = false;
  await client.signInUserWithQrCode({ apiId, apiHash }, {
    qrCode: async ({ token }) => {
      console.clear();
      console.log('Telegram на телефоне → Настройки → Устройства → Подключить устройство → наведите на QR\n');
      console.log(await QRCode.toString('tg://login?token=' + Buffer.from(token).toString('base64url'), { type: 'terminal', small: true }));
    },
    password: async () => { asked = true; return new Promise((res) => { process.stdout.write('Облачный пароль: '); process.stdin.once('data', (d) => res(String(d).trim())); }); },
    onError: async (e) => { console.error(e.errorMessage || e.message); return !asked; },
  });
  console.log('\nГотово. Строка сессии (держите в секрете, это доступ к аккаунту):\n');
  console.log(client.session.save());
  process.exit(0);
})();
