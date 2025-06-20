const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

app.use(cors());
app.use(express.json());

// Bot client setup
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

// Middleware: Protect routes
function auth(req, res, next) {
  const key = req.headers['authorization'];
  if (key !== API_KEY) {
    return res.status(403).json({ error: 'Invalid API Key' });
  }
  next();
}

// Route: Connect to guild
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

// Route: Select channel
app.post('/select-channel', auth, async (req, res) => {
  const { channelId } = req.body;
  try {
    currentChannel = await currentGuild.channels.fetch(channelId);
    res.json({ channel: currentChannel.name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to select channel', details: err.message });
  }
});

// Route: Send plain message
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

// Route: Send embed
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

// Start app
app.listen(PORT, () => {
  console.log(`✅ Backend listening on port ${PORT}`);
});

// Login bot
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
