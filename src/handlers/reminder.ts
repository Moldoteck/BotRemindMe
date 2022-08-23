import { sendMessageTimeout } from '@/helpers/sendReminder'
import Context from '@/models/Context'
import { MessageChat } from '@/models/User'
import { v4 as uuidv4 } from 'uuid'
var sanitize = require('mongo-sanitize')

export function recursiveTimeout(func: () => void, timeout: number) {
  if (timeout > 0x7fffffff)
    //setTimeout limit is MAX_INT32=(2^31-1)
    setTimeout(function () {
      recursiveTimeout(func, timeout - 0x7fffffff)
    }, 0x7fffffff)
  else {
    setTimeout(func, timeout)
  }
}

async function handleMsg(ctx: Context, text: string) {
  if (ctx.msg) {
    let textArray = text.split(' ')
    let quantity = textArray[0]
    let unit = textArray[1]
    let message = textArray.slice(2).join(' ')
    if (quantity && unit) {
      let numQuantity = parseInt(quantity)
      numQuantity = Math.abs(numQuantity)
      let dateNumber = 0
      if (numQuantity && numQuantity < 1000) {
        let date = new Date(Date.now())
        let informationSet = false
        let timeoutSeconds = 0
        switch (unit) {
          case 's':
          case 'sec':
          case 'second':
          case 'seconds':
            date.setSeconds(date.getSeconds() + numQuantity)
            informationSet = true
            timeoutSeconds = numQuantity * 1000
            break
          case 'm':
          case 'min':
          case 'minute':
          case 'minutes':
            date.setMinutes(date.getMinutes() + numQuantity)
            informationSet = true
            timeoutSeconds = numQuantity * 1000 * 60
            break
          case 'h':
          case 'hr':
          case 'hour':
          case 'hours':
            date.setHours(date.getHours() + numQuantity)
            informationSet = true
            timeoutSeconds = numQuantity * 1000 * 60 * 60
            break
          case 'd':
          case 'day':
          case 'days':
            date.setDate(date.getDate() + numQuantity)
            informationSet = true
            timeoutSeconds = numQuantity * 1000 * 60 * 60 * 24
            break
          case 'month':
          case 'months':
            if (numQuantity <= 60) {
              date.setDate(date.getDate() + numQuantity)
              informationSet = true
              timeoutSeconds = numQuantity * 1000 * 60 * 60 * 24 * 30 //30days
            } else {
              ctx.reply('Number too big').catch((err) => {
                console.log(err)
              })
            }
            break
          default:
            ctx.reply('Invalid unit type').catch((err) => {
              console.log(err)
            })
            break
        }
        if (informationSet) {
          dateNumber = date.getTime()
          if (!message) {
            message = '-'
          }
          message = sanitize(message)

          let reminderChat: MessageChat = {
            chatID: ctx.msg.chat.id.toString(),
            message: message,
            reply: '',
            dateNumber: dateNumber.toString(),
            message_id: ctx.msg.message_id.toString(),
          }

          if (
            ctx.msg.reply_to_message &&
            (ctx.msg.reply_to_message.text || ctx.msg.reply_to_message.caption)
          ) {
            let uname = ctx.msg.reply_to_message.from?.username
            let unames = ''
            if (uname) {
              unames = `@${uname}: `
            }
            let re = ctx.msg.reply_to_message.text
              ? ctx.msg.reply_to_message.text
              : ctx.msg.reply_to_message.caption
            re = sanitize(re)
            reminderChat.reply = `${unames}${re}`
          }

          let uniqueId = uuidv4()
          ctx.dbuser.reminders[uniqueId] = reminderChat

          //mark modified
          ctx.dbuser.markModified('reminders')
          await ctx.dbuser.save()
          let repl = reminderChat.reply ? `\n\n${reminderChat.reply}` : ''

          let msg = message == '-' ? '' : `\n\n${message}`
          let username =
            ctx.dbuser.username != '' ? ` @${ctx.dbuser.username}` : ''
          let finalMessage = `Reminder for${username}:${msg}${repl}`
          let chatid = ctx.msg.chat.id

          ctx
            .reply('Ok', { reply_to_message_id: ctx.msg.message_id })
            .catch((err) => {
              console.log(err)
            })

          recursiveTimeout(() => {
            sendMessageTimeout(
              ctx,
              chatid.toString(),
              finalMessage,
              ctx.dbuser.id,
              uniqueId
            )
          }, timeoutSeconds)
        }
      } else {
        ctx.reply('Invalid number or too big').catch((err) => {
          console.log(err)
        })
      }
    } else {
      ctx.reply('Ill formated message').catch((err) => {
        console.log(err)
      })
    }
  }
}

export default async function handleRemind(ctx: Context) {
  if (ctx.msg?.text) {
    let text: string = ctx.msg.text.split('/remindme@BotRemindMeBot ')[1]
    if (!text) {
      text = ctx.msg.text.split('/remindme ')[1]
    }
    if (text) {
      handleMsg(ctx, text)
    }
  }
}

export async function handleTextRemind(ctx: Context) {
  if (ctx.msg?.text && ctx.msg.text.startsWith('!remindme')) {
    let text: string = ctx.msg.text.split('!remindme ')[1]
    if (text) {
      handleMsg(ctx, text)
    }
  }
}
