const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// ✅ Allow requests from your GitHub Pages site
app.use(cors({
  origin: 'https://airplanefox77.github.io'
}));

app.use(express.json());

// Discord Bot Setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

let currentGuild = null;
let currentChannel = null;

// Middleware: Secure routes with API key
function auth(req, res, next) {
  const key = req.headers['authorization'];
  if (key !== API_KEY) {
    return res.status(403).json({ error: 'Invalid API Key' });
  }
  next();
}

// POST /connect
app.post('/connect', auth, async (req, res) => {
  const { guildId } = req.body;
  try {
    currentGuild = await client.guilds.fetch(guildId);
    const channels = await currentGuild.channels.fetch();
    const textChannels = [...channels.values()]
      .filter(c => c.isTextBased() && c.type === 0)
      .map(c => ({ name: c.name, id: c.id }));
    res.json({ guild: currentGuild.name, channels: textChannels });
  } catch (err) {
    res.status(500).json({ error: 'Failed to connect to guild', details: err.message });
  }
});

// POST /select-channel
app.post('/select-channel', auth, async (req, res) => {
  const { channelId } = req.body;
  try {
    currentChannel = await currentGuild.channels.fetch(channelId);
    res.json({ channel: currentChannel.name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to select channel', details: err.message });
  }
});

// POST /send
app.post('/send', auth, async (req, res) => {
  const { message } = req.body;
  if (!currentChannel) return res.status(400).json({ error: 'No channel selected' });
  try {
    await currentChannel.send(message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
});

// POST /embed
app.post('/embed', auth, async (req, res) => {
  const { title, description, color, footer } = req.body;
  if (!currentChannel) return res.status(400).json({ error: 'No channel selected' });

  const embed = new EmbedBuilder()
    .setTitle(title || 'Untitled')
    .setDescription(description || '')
    .setColor(color || 0xA200FF)
    .setTimestamp();

  if (footer) embed.setFooter({ text: footer });

  try {
    await currentChannel.send({ embeds: [embed] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send embed', details: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend listening on port ${PORT}`);
});

// Log in to Discord
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
