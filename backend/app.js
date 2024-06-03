const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client/build')));

const db = 'mongodb+srv://manarkhaled2510:Vl1Gmdf4MMqcPUcA@cluster0.jvhlqel.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
mongoose.connect(db, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const User = require('./models/user');
const Message = require('./models/message');
const Chat = require('./models/chat');

// Routes
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  const user = new User({ username });
  await user.save();
  res.status(201).send(user);
});

app.get('/api/users', async (req, res) => {
  const users = await User.find();
  res.status(200).send(users);
});

app.get('/api/messages', async (req, res) => {
  const messages = await Message.find().populate('senderID').populate('chatId');
  res.status(200).send(messages);
});

app.get('/api/chats', async (req, res) => {
  const chats = await Chat.find().populate('users').populate({
    path: 'messages',
    populate: { path: 'senderID' }
  });
  res.status(200).send(chats);
});

// app.post('/api/chats', async (req, res) => {
//   const { userIds } = req.body;
//   const chat = new Chat({
//     users: userIds,
//     messages: []
//   });
//   await chat.save();
//   res.status(201).send(chat);
// });
app.post('/api/chats', async (req, res) => {
  const { userIds, messageId } = req.body;
  const chat = new Chat({
    users: userIds,
    messages: [messageId]
  });
  await chat.save();
  res.status(201).send(chat);
});

// Serve React App
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('chat message', async (msg) => {
    const { username, message, chatId } = msg;
    const user = await User.findOne({ username });
    if (!user) return;

    const messageDoc = new Message({
      senderID: user._id,
      message: message,
      chatId: chatId
    });
    await messageDoc.save();

    const chat = await Chat.findById(chatId);
    chat.messages.push(messageDoc._id);
    await chat.save();

    io.emit('chat message', messageDoc);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
