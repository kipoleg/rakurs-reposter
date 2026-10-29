// Copies new posts of a private channel into your own public channel, so Rakurs can read
// them through the Cloudflare Worker without a VPN. Stateless: the newest post already in
// the target channel marks where to continue.
//
// env: TG_API_ID, TG_API_HASH, TG_SESSION, SOURCE (title or part of it), TARGET (public channel username)
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const { TG_API_ID, TG_API_HASH, TG_SESSION, SOURCE, TARGET } = process.env;
const FIRST_RUN = 20; // posts copied when the target channel is empty

(async () => {
  const client = new TelegramClient(new StringSession(TG_SESSION), Number(TG_API_ID), TG_API_HASH, { connectionRetries: 3 });
  client.setLogLevel('none');
  await client.connect();

  const dialogs = await client.getDialogs({ limit: 300 });
  const src = dialogs.find((d) => d.isChannel && d.title.toLowerCase().includes(SOURCE.toLowerCase()));
  if (!src) throw new Error(`Не нашёл канал «${SOURCE}» среди подписок`);
  const target = await client.getEntity(TARGET);

  // the newest real post of the target (service entries like «Канал создан» do not count)
  const last = (await client.getMessages(target, { limit: 10 })).find((m) => (m.message || '').trim());
  const since = last ? last.date : 0;
  const msgs = (await client.getMessages(src.entity, { limit: 60 }))
    .filter((m) => (m.message || '').trim() && m.date > since)
    .sort((a, b) => a.date - b.date);
  const batch = last ? msgs : msgs.slice(-FIRST_RUN);

  for (const m of batch) {
    await client.sendMessage(target, { message: m.message, formattingEntities: m.entities, linkPreview: false });
  }
  console.log(`copied ${batch.length} of ${msgs.length} new`);
  process.exit(0);
})().catch((e) => { console.error(e.errorMessage || e.message); process.exit(1); });
