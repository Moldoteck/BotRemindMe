import { Api, Bot, RawApi } from 'grammy'
import {
  findAllUsers,
  findOrCreateUser,
  MessageChat,
  User,
} from '@/models/User'
import Context from '@/models/Context'

export async function sendAllMessages(ctx: Bot<Context, Api<RawApi>>) {
  let users = await findAllUsers()
  for (let user of users) {
    sendMessageUser(ctx, user)
  }
}

export async function sendMessageUser(
  ctx: Bot<Context, Api<RawApi>>,
  user: User
) {
  let messageIDs = Object.keys(user.reminders)
  for (let messageID of messageIDs) {
    sendMessageChat(ctx, user.reminders[messageID], user, messageID)
  }
}

export async function sendMessageChat(
  ctx: Bot<Context, Api<RawApi>>,
  reminder: MessageChat,
  user: User,
  messageID: string
) {
  let userID = user.id
  let chatId = Object.keys(reminder)[0]
  let timeout = Object.keys(reminder[chatId])[0]
  let timeoutNumber = parseInt(timeout)
  let messageObj = reminder[chatId][timeout]

  //message and reply
  let message = Object.keys(messageObj)[0]
  let reply = messageObj[message]

  let repl = reply ? `\n\n${reply}` : ''
  let username = user.username != '' ? ` @${user.username}` : ''
  let finalMessage = `Reminder for ${username}:\n\n${message}\n\n${repl}`
  if (Date.now() > timeoutNumber) {
    sendMessageTimeout(ctx, chatId, finalMessage, userID, messageID)
  } else {
    setTimeout(() => {
      sendMessageTimeout(ctx, chatId, finalMessage, userID, messageID)
    }, timeoutNumber - Date.now())
  }
}

export async function sendMessageTimeout(
  ctx: Context | Bot<Context, Api<RawApi>>,
  chatId: string,
  message: string,
  userid: number,
  reminderid: string
) {
  await ctx.api.sendMessage(chatId, message).catch((err) => {
    console.log(err)
  })

  let user = await findOrCreateUser(userid)
  delete user.reminders[reminderid]
  user.markModified('reminders')
  await user.save()
}
