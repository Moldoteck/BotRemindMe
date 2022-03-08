import { sendMessageTimeout } from '@/helpers/sendReminder'
import Context from '@/models/Context'
import { MessageChat, MessageDate, MessageReply } from '@/models/User'
import { v4 as uuidv4 } from 'uuid'

export default async function handleRemind(ctx: Context) {
  if (ctx.msg?.text) {
    let text: string = ctx.msg.text.split('/remindme@BotRemindMeBot ')[1]
    if (!text) {
      text = ctx.msg.text.split('/remindme ')[1]
    }
    if (text) {
      let textArray = text.split(' ')
      let quantity = textArray[0]
      let unit = textArray[1]
      let message = textArray.slice(2).join(' ')
      if (quantity && unit) {
        let numQuantity = parseInt(quantity)
        let dateNumber = 0
        if (numQuantity) {
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
              date.setHours(date.getHours() + numQuantity * 24)
              informationSet = true
              timeoutSeconds = numQuantity * 1000 * 60 * 60 * 24
              break
            default:
              ctx.reply('Invalid unit').catch((err) => {
                console.log(err)
              })
              break
          }
          if (informationSet) {
            dateNumber = date.getTime()
            let reminderObj: MessageDate = {}
            let reminderChat: MessageChat = {}
            let reminderMsg: MessageReply = {}
            if (!message) {
              message = '-'
            }
            if (ctx.msg.reply_to_message && ctx.msg.reply_to_message.text) {
              let uname = ctx.msg.reply_to_message.from?.username
              let unames = ''
              if (uname) {
                unames = `@${uname}: `
              }
              reminderMsg[message] = `${unames}${ctx.msg.reply_to_message.text}`
              reminderObj[dateNumber] = reminderMsg
            } else {
              reminderMsg[message] = ''
              reminderObj[dateNumber] = reminderMsg
            }
            reminderChat[ctx.msg.chat.id] = reminderObj

            let uniqueId = uuidv4()
            ctx.dbuser.reminders[uniqueId] = reminderChat
            //mark modified
            ctx.dbuser.markModified('reminders')
            await ctx.dbuser.save()
            let repl = reminderObj[dateNumber][message]
              ? `\n\n${reminderObj[dateNumber][message]}`
              : ''

            let username =
              ctx.dbuser.username != '' ? ` @${ctx.dbuser.username}` : ''
            let finalMessage = `Reminder for${username}:\n\n${message}${repl}`
            let chatid = ctx.msg.chat.id

            setTimeout(() => {
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
          ctx.reply('Invalid number').catch((err) => {
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
}
