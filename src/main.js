const fs = require('fs');
const wajs = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');


const generateRandomNumbersTo = (to) => Math.floor(Math.random() * to);
let stickerSpamCounter = {
  contact: undefined,
  counter: 0,
  chats: []
};

// topics
const topicsRaw = fs.readFileSync('topics.json', 'utf-8');
const topicsObject = JSON.parse(topicsRaw);

// template
const topicTemplate = 'Hmm.. tampaknya group ini agak agak.. *SEPI*\n\nUntuk menyelesaikan masalah ini, ayo bahas tentang: *%TOPIC%*';
const welcomeTemplate = 'Welcome @%CONTACT%!, semoga betah disini :D';
const spamTemplate = '*Hai, tapi pesanmu yang ini melanggar aturan group NicDev nomor(5)*\n\n*Alasan*: Spam message yang sama';

// const groupID = '120363152709180523@g.us';
const groupID = '120363166409249157@g.us';
let isNewChat = true;

function isExpectGroup(id) {
  return groupID === id;
}

const client = new wajs.Client({ authStrategy: new wajs.LocalAuth() });
client.on('qr', qr => {
  qrcodeTerminal.generate(qr, { small: true })
});

client.on('ready', () => {
  console.info('ready');

  setInterval(async () => {
    // get target group
    const chats = await client.getChats();
    const group = chats.filter(chats => {
      return chats.id._serialized === groupID && chats.isGroup
    })[0];

    // is latest chat sended at 10 minutes ago
    const latestChatTimestamp = group.lastMessage.timestamp;
    const currentTimestamp = Date.now() / 1000;
    const isLatestChat10MinutesAgo = currentTimestamp - latestChatTimestamp >= 60 * 10;

    // get random index topic
    const randomTopicIndex = generateRandomNumbersTo(topicsObject.length);

    if(isLatestChat10MinutesAgo && isNewChat) {
      const topic = topicsObject[randomTopicIndex];

      const msg = topicTemplate.replace('%TOPIC%', topic);
      group.sendMessage(msg);
      isNewChat = false;
    }
  }, 60000);
});

client.on('message', async (message) => {
  if (isExpectGroup(message.id.remote) && message.author) {
    isNewChat = true;

    if (stickerSpamCounter?.counter >= 6) {
      await client.sendMessage(groupID, 'SPAM STICKER DETECT');
      await client.sendMessage(stickerSpamCounter.contact.id.user + '@c.us', spamTemplate);

      for (const chat of stickerSpamCounter?.chats) await chat.delete(true);        

      stickerSpamCounter = {
        chats: undefined,
        contact: undefined,
        counter: 0,
      };
    }

    if (message.type === wajs.MessageTypes.STICKER){
      const contact = await message.getContact();

      if(stickerSpamCounter?.contact?.number === contact.number) {
        stickerSpamCounter.counter++;
        stickerSpamCounter.chats.push(message);
      } else {
        stickerSpamCounter = {
          contact: contact,
          counter: 0,
          chats: []
        }
      }
    }

    latestChat = message;
  }
});

// welcome message
client.on('group_join', async (groupNotification) => {
  if(isExpectGroup(groupNotification.id.remote) && groupNotification.author) {
    const participant = groupNotification.id.participant;
    const message = welcomeTemplate.replace('%CONTACT%', participant.substring(0, participant.length - 5));

    groupNotification.reply(message, {
      mentions: [participant],
    });
  }
});

client.initialize();
