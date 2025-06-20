require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let currentChannel = null;

client.once('ready', () => {
  console.log(`🤖 Logged in as: ${client.user.tag}`);
});

client.login(process.env.TOKEN);

app.post('/connect', async (req, res) => {
  try {
    const { guildId, channelId } = req.body;
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);

    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({ error: 'Channel is not text-based.' });
    }

    currentChannel = channel;
    res.json({ message: `Connected to ${guild.name} → #${channel.name}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

io.on('connection', socket => {
  console.log('🌐 Web client connected');

  socket.on('sendMessage', async text => {
    if (!currentChannel) {
      return socket.emit('errorMessage', 'No channel selected.');
    }
    try {
      await currentChannel.send(text);
    } catch (err) {
      socket.emit('errorMessage', err.message);
    }
  });

  const listener = msg => {
    if (msg.channel.id === currentChannel?.id) {
      socket.emit('newMessage', {
        author: msg.author.tag,
        content: msg.content,
        id: msg.id
      });
    }
  };

  client.on('messageCreate', listener);

  socket.on('disconnect', () => {
    client.off('messageCreate', listener);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
