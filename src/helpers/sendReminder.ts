import { Api, Bot, RawApi } from 'grammy'
import {
  findAllUsers,
  findOrCreateUser,
  MessageChat,
  User,
} from '@/models/User'
import Context from '@/models/Context'
import { recursiveTimeout } from '@/handlers/reminder'

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
  let uniqueIDs = Object.keys(user.reminders)
  for (let uniqueID of uniqueIDs) {
    sendMessageChat(ctx, user.reminders[uniqueID], user, uniqueID)
  }
}

export async function sendMessageChat(
  ctx: Bot<Context, Api<RawApi>>,
  reminder: MessageChat,
  user: User,
  uniqueID: string
) {
  let userID = user.id
  let chatId = reminder.chatID
  let timeout = reminder.dateNumber
  let timeoutNumber = parseInt(timeout)

  //message and reply
  let message = reminder.message
  let reply = reminder.reply

  let msg = message == '-' ? '' : `\n\n${message}`
  let repl = reply ? `\n\n${reply}` : ''
  let username = user.username != '' ? ` @${user.username}` : ''
  let finalMessage = `Reminder for ${username}:${msg}${repl}`
  if (Date.now() > timeoutNumber) {
    sendMessageTimeout(ctx, chatId, finalMessage, userID, uniqueID)
  } else {
    recursiveTimeout(() => {
      sendMessageTimeout(ctx, chatId, finalMessage, userID, uniqueID)
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
  let user = await findOrCreateUser(userid)
  try {
    // let msg = message.replace('<', '&lt;')
    // msg = message.replace('>', '&gt;')
    // msg = message.replace('&', '&amp;')
    // msg = msg.split(':').slice(1).join(':')
    // msg = `<span class="tg-spoiler">${msg}</span>`

    // await ctx.api.sendMessage(chatId, message.split(':')[0] + msg, {
    //   reply_to_message_id: parseInt(user.reminders[reminderid].message_id),
    //   parse_mode: 'HTML',
    // })
    await ctx.api.sendMessage(chatId, message, {
      reply_to_message_id: parseInt(user.reminders[reminderid].message_id),
    })
  } catch (err: any) {
    console.log(err)
    try {
      await ctx.api.sendMessage(chatId, message)
    } catch (err: any) {
      console.log(err)
    }
  }

  delete user.reminders[reminderid]
  user.markModified('reminders')
  await user.save()
}
