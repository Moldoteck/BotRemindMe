import i18n from '@/helpers/i18n'
import { sendMessageChat, sendMessageTimeout } from '@/helpers/sendReminder'
import { findAllChats } from '@/models/Chat'
import Context from '@/models/Context'
import { findAllUsers, findUser, MessageChat } from '@/models/User'
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
    let unit = textArray[1]

    let quantity = textArray[0]
    let numQuantity = Number(quantity)
    if (isNaN(numQuantity)) {
      //get first digits of number
      let firstDigits = quantity.match(/\d+/)
      if (firstDigits && Number(quantity[0])) {
        //if first digit is number
        numQuantity = Number(firstDigits)
        numQuantity = Math.abs(numQuantity)
        //try get the unit
        let firstNonDigitPosition = quantity.search(/\D/)
        unit = quantity.substring(firstNonDigitPosition)
      }
    } else {
      numQuantity = Math.abs(numQuantity)
    }

    let message = textArray.slice(2).join(' ')
    if (quantity && unit) {
      let dateNumber = 0
      if (numQuantity && numQuantity < 1000) {
        let date = new Date(Date.now())
        let informationSet = false
        let timeoutSeconds = 0
        let replyMessage = ''
        unit = unit.toLowerCase()
        switch (unit) {
          case 's':
          case 'sec':
          case 'second':
          case 'seconds':
            replyMessage = 'seconds'
            date.setSeconds(date.getSeconds() + numQuantity)
            informationSet = true
            timeoutSeconds = numQuantity * 1000
            break
          case 'm':
          case 'min':
          case 'minute':
          case 'minutes':
            replyMessage = 'minutes'
            date.setMinutes(date.getMinutes() + numQuantity)
            informationSet = true
            timeoutSeconds = numQuantity * 1000 * 60
            break
          case 'h':
          case 'hr':
          case 'hour':
          case 'hours':
            replyMessage = 'hours'
            date.setHours(date.getHours() + numQuantity)
            informationSet = true
            timeoutSeconds = numQuantity * 1000 * 60 * 60
            break
          case 'd':
          case 'day':
          case 'days':
            replyMessage = 'days'
            date.setDate(date.getDate() + numQuantity)
            informationSet = true
            timeoutSeconds = numQuantity * 1000 * 60 * 60 * 24
            break
          case 'w':
          case 'wk':
          case 'week':
          case 'weeks':
            replyMessage = 'weeks'
            if (numQuantity <= 260) {
              date.setDate(date.getDate() + 7 * numQuantity)
              informationSet = true
              timeoutSeconds = numQuantity * 1000 * 60 * 60 * 24 * 7 //7days
            } else {
              ctx.reply('Number too big').catch((err) => {
                console.log(err)
              })
            }
            break
          case 'mo':
          case 'mon':
          case 'month':
          case 'months':
            replyMessage = 'months'
            if (numQuantity <= 60) {
              date.setDate(date.getDate() + 30 * numQuantity)
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
            .reply(`Ok, will remind you in ${numQuantity} ${replyMessage}`, {
              reply_to_message_id: ctx.msg.message_id,
            })
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

export async function handleList(ctx: Context) {
  let remindersID = Object.keys(ctx.dbuser.reminders)
  for (let key of remindersID) {
    let reminder = ctx.dbuser.reminders[key]

    //message and reply
    let message = reminder.message
    let reply = reminder.reply

    let msg = message == '-' ? '' : `\n\n${message}`
    let repl = reply ? `\n\n${reply}` : ''
    let username = ctx.dbuser.username != '' ? ` @${ctx.dbuser.username}` : ''

    let timeout = reminder.dateNumber
    let timeoutNumber = parseInt(timeout)
    // let remaining = timeoutNumber-Date.now()
    //remaining to date
    let date = new Date(timeoutNumber)

    // get total seconds between the times
    var delta = Math.abs(timeoutNumber - Date.now()) / 1000

    // calculate (and subtract) whole days
    var days = Math.floor(delta / 86400)
    delta -= days * 86400

    // calculate (and subtract) whole hours
    var hours = Math.floor(delta / 3600) % 24
    delta -= hours * 3600

    // calculate (and subtract) whole minutes
    var minutes = Math.floor(delta / 60) % 60
    delta -= minutes * 60

    // what's left is seconds
    var seconds = Math.floor(delta % 60)

    let timeRemaining = `${days}d ${hours}h ${minutes}m ${seconds}s`

    let finalMessage = `Reminder for${username}\nWill trigger on: ${date.toDateString()}\nin ${timeRemaining}:${msg}${repl}`
    if (
      ctx?.dbchat?.id == ctx.dbuser.id ||
      ctx.dbchat?.id?.toString() == reminder.chatID
    ) {
      try {
        await ctx.reply(finalMessage)
      } catch (err) {
        console.log(err)
      }
    }
  }
}

export async function handleInline(ctx: Context) {
  if ('match' in ctx) {
    if (ctx.inlineQuery?.from?.id) {
      let chatexists = false
      try {
        await ctx.api.sendChatAction(ctx.inlineQuery.from.id, 'typing')
        chatexists = true
      } catch (err) {
        console.log(err)
      }
      if (chatexists) {
        let text = (ctx['match'] as RegExpMatchArray).input
        if (text) {
          if (isOk(text)) {
            if (text.endsWith('....')) {

              trySaveReminder(ctx, text.substring(0, text.length - 4))

              return ctx.answerInlineQuery(
                [
                  {
                    id: '0',
                    type: 'article',
                    title: ctx.i18n.t('saving_attempt'),
                    description: ctx.i18n.t('private_confirmation'),
                    input_message_content: {
                      message_text: '.',
                    },
                  },
                ],
                { cache_time: 0 }
              )
            } else {
              return ctx.answerInlineQuery(
                [
                  {
                    id: '0',
                    type: 'article',
                    title: ctx.i18n.t('instruction'),
                    description: ctx.i18n.t('type_end'),
                    input_message_content: {
                      message_text: '.',
                    },
                  },
                ],
                { cache_time: 0 }
              )
            }
          } else {
            return ctx.answerInlineQuery(
              [
                {
                  id: '1',
                  type: 'article',
                  title: 'Reminder',
                  description: `Invalid format for units`,
                  input_message_content: {
                    message_text: 'Check help for the correct format',
                  },
                },
              ],
              { cache_time: 0 }
            )
          }
        }
      } else {
        //user not registered
        return ctx.answerInlineQuery(
          [
            {
              id: '1',
              type: 'article',
              title: 'Reminder',
              description: `Please, start a conversation with bot first: @BotRemindMeBot`,
              input_message_content: {
                message_text:
                  'Please, start a conversation with bot first: @BotRemindMeBot',
              },
            },
          ],
          { cache_time: 0 }
        )
      }
    }
  }
}

function isOk(text: string) {
  let informationSet = false
  let textArray = text.split(' ')
  let unit = textArray[1]

  let quantity = textArray[0]
  let numQuantity = Number(quantity)
  if (isNaN(numQuantity)) {
    //get first digits of number
    let firstDigits = quantity.match(/\d+/)
    if (firstDigits && Number(quantity[0])) {
      //if first digit is number
      numQuantity = Number(firstDigits)
      numQuantity = Math.abs(numQuantity)
      //try get the unit
      let firstNonDigitPosition = quantity.search(/\D/)
      unit = quantity.substring(firstNonDigitPosition)
    }
  } else {
    numQuantity = Math.abs(numQuantity)
  }

  if (quantity && unit) {
    if (numQuantity && numQuantity < 1000) {
      let date = new Date(Date.now())
      let replyMessage = ''
      unit = unit.toLowerCase()
      switch (unit) {
        case 's':
        case 'sec':
        case 'second':
        case 'seconds':
          replyMessage = 'seconds'
          date.setSeconds(date.getSeconds() + numQuantity)
          informationSet = true
          break
        case 'm':
        case 'min':
        case 'minute':
        case 'minutes':
          replyMessage = 'minutes'
          date.setMinutes(date.getMinutes() + numQuantity)
          informationSet = true
          break
        case 'h':
        case 'hr':
        case 'hour':
        case 'hours':
          replyMessage = 'hours'
          date.setHours(date.getHours() + numQuantity)
          informationSet = true
          break
        case 'd':
        case 'day':
        case 'days':
          replyMessage = 'days'
          date.setDate(date.getDate() + numQuantity)
          informationSet = true
          break
        case 'w':
        case 'wk':
        case 'week':
        case 'weeks':
          replyMessage = 'weeks'
          if (numQuantity <= 260) {
            date.setDate(date.getDate() + 7 * numQuantity)
            informationSet = true
          }
          break
        case 'mo':
        case 'mon':
        case 'month':
        case 'months':
          replyMessage = 'months'
          if (numQuantity <= 60) {
            date.setDate(date.getDate() + 30 * numQuantity)
            informationSet = true
          }
          break
        default:
          break
      }
    }
  }
  return informationSet
}

async function trySaveReminder(ctx: Context, text: string) {
  // console.log(text)
  let textArray = text.split(' ')
  let unit = textArray[1]

  let quantity = textArray[0]
  let numQuantity = Number(quantity)
  if (isNaN(numQuantity)) {
    //get first digits of number
    let firstDigits = quantity.match(/\d+/)
    if (firstDigits && Number(quantity[0])) {
      //if first digit is number
      numQuantity = Number(firstDigits)
      numQuantity = Math.abs(numQuantity)
      //try get the unit
      let firstNonDigitPosition = quantity.search(/\D/)
      unit = quantity.substring(firstNonDigitPosition)
    }
  } else {
    numQuantity = Math.abs(numQuantity)
  }

  let message = textArray.slice(isNaN(Number(quantity)) ? 1 : 2).join(' ')
  // console.log(message)
  if (quantity && unit && ctx.from?.id) {
    let dateNumber = 0
    if (numQuantity && numQuantity < 1000) {
      let date = new Date(Date.now())
      let informationSet = false
      let timeoutSeconds = 0
      let replyMessage = ''
      unit = unit.toLowerCase()
      switch (unit) {
        case 's':
        case 'sec':
        case 'second':
        case 'seconds':
          replyMessage = 'seconds'
          date.setSeconds(date.getSeconds() + numQuantity)
          informationSet = true
          timeoutSeconds = numQuantity * 1000
          break
        case 'm':
        case 'min':
        case 'minute':
        case 'minutes':
          replyMessage = 'minutes'
          date.setMinutes(date.getMinutes() + numQuantity)
          informationSet = true
          timeoutSeconds = numQuantity * 1000 * 60
          break
        case 'h':
        case 'hr':
        case 'hour':
        case 'hours':
          replyMessage = 'hours'
          date.setHours(date.getHours() + numQuantity)
          informationSet = true
          timeoutSeconds = numQuantity * 1000 * 60 * 60
          break
        case 'd':
        case 'day':
        case 'days':
          replyMessage = 'days'
          date.setDate(date.getDate() + numQuantity)
          informationSet = true
          timeoutSeconds = numQuantity * 1000 * 60 * 60 * 24
          break
        case 'w':
        case 'wk':
        case 'week':
        case 'weeks':
          replyMessage = 'weeks'
          if (numQuantity <= 260) {
            date.setDate(date.getDate() + 7 * numQuantity)
            informationSet = true
            timeoutSeconds = numQuantity * 1000 * 60 * 60 * 24 * 7 //7days
          } else {
            ctx.reply('Number too big').catch((err) => {
              console.log(err)
            })
          }
          break
        case 'mo':
        case 'mon':
        case 'month':
        case 'months':
          replyMessage = 'months'
          if (numQuantity <= 60) {
            date.setDate(date.getDate() + 30 * numQuantity)
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
          chatID: ctx.from?.id.toString(),
          message: message,
          reply: '',
          dateNumber: dateNumber.toString(),
          message_id: '0',
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
        let chatid = ctx.chosenInlineResult?.from.id.toString()

        ctx.api
          .sendMessage(
            ctx.from.id,
            `Ok, will remind you in ${numQuantity} ${replyMessage} this: ${message}`
          )
          .catch((err) => {
            console.log(err)
          })

        recursiveTimeout(() => {
          sendMessageTimeout(
            ctx,
            ctx.dbuser.id.toString(),
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


export async function handleInlineResult(ctx: Context) {
  // let text = ctx.chosenInlineResult?.query
  // if (ctx.chosenInlineResult && ctx.chosenInlineResult?.result_id == '1') {
  //   return
  //   //ignore
  // }
  // if (ctx.chosenInlineResult && text) {
  //   let textArray = text.split(' ')
  //   let unit = textArray[1]

  //   let quantity = textArray[0]
  //   let numQuantity = Number(quantity)
  //   if (isNaN(numQuantity)) {
  //     //get first digits of number
  //     let firstDigits = quantity.match(/\d+/)
  //     if (firstDigits && Number(quantity[0])) {
  //       //if first digit is number
  //       numQuantity = Number(firstDigits)
  //       numQuantity = Math.abs(numQuantity)
  //       //try get the unit
  //       let firstNonDigitPosition = quantity.search(/\D/)
  //       unit = quantity.substring(firstNonDigitPosition)
  //     }
  //   } else {
  //     numQuantity = Math.abs(numQuantity)
  //   }

  //   let message = textArray.slice(2).join(' ')
  //   if (quantity && unit) {
  //     let dateNumber = 0
  //     if (numQuantity && numQuantity < 1000) {
  //       let date = new Date(Date.now())
  //       let informationSet = false
  //       let timeoutSeconds = 0
  //       let replyMessage = ''
  //       unit = unit.toLowerCase()
  //       switch (unit) {
  //         case 's':
  //         case 'sec':
  //         case 'second':
  //         case 'seconds':
  //           replyMessage = 'seconds'
  //           date.setSeconds(date.getSeconds() + numQuantity)
  //           informationSet = true
  //           timeoutSeconds = numQuantity * 1000
  //           break
  //         case 'm':
  //         case 'min':
  //         case 'minute':
  //         case 'minutes':
  //           replyMessage = 'minutes'
  //           date.setMinutes(date.getMinutes() + numQuantity)
  //           informationSet = true
  //           timeoutSeconds = numQuantity * 1000 * 60
  //           break
  //         case 'h':
  //         case 'hr':
  //         case 'hour':
  //         case 'hours':
  //           replyMessage = 'hours'
  //           date.setHours(date.getHours() + numQuantity)
  //           informationSet = true
  //           timeoutSeconds = numQuantity * 1000 * 60 * 60
  //           break
  //         case 'd':
  //         case 'day':
  //         case 'days':
  //           replyMessage = 'days'
  //           date.setDate(date.getDate() + numQuantity)
  //           informationSet = true
  //           timeoutSeconds = numQuantity * 1000 * 60 * 60 * 24
  //           break
  //         case 'w':
  //         case 'wk':
  //         case 'week':
  //         case 'weeks':
  //           replyMessage = 'weeks'
  //           if (numQuantity <= 260) {
  //             date.setDate(date.getDate() + 7 * numQuantity)
  //             informationSet = true
  //             timeoutSeconds = numQuantity * 1000 * 60 * 60 * 24 * 7 //7days
  //           } else {
  //             ctx.reply('Number too big').catch((err) => {
  //               console.log(err)
  //             })
  //           }
  //           break
  //         case 'mo':
  //         case 'mon':
  //         case 'month':
  //         case 'months':
  //           replyMessage = 'months'
  //           if (numQuantity <= 60) {
  //             date.setDate(date.getDate() + 30 * numQuantity)
  //             informationSet = true
  //             timeoutSeconds = numQuantity * 1000 * 60 * 60 * 24 * 30 //30days
  //           } else {
  //             ctx.reply('Number too big').catch((err) => {
  //               console.log(err)
  //             })
  //           }
  //           break
  //         default:
  //           ctx.reply('Invalid unit type').catch((err) => {
  //             console.log(err)
  //           })
  //           break
  //       }
  //       if (informationSet) {
  //         dateNumber = date.getTime()
  //         if (!message) {
  //           message = '-'
  //         }
  //         message = sanitize(message)

  //         let reminderChat: MessageChat = {
  //           chatID: ctx.chosenInlineResult?.from.id.toString(),
  //           message: message,
  //           reply: '',
  //           dateNumber: dateNumber.toString(),
  //           message_id: '0',
  //         }

  //         let uniqueId = uuidv4()
  //         ctx.dbuser.reminders[uniqueId] = reminderChat

  //         //mark modified
  //         ctx.dbuser.markModified('reminders')
  //         await ctx.dbuser.save()
  //         let repl = reminderChat.reply ? `\n\n${reminderChat.reply}` : ''

  //         let msg = message == '-' ? '' : `\n\n${message}`
  //         let username =
  //           ctx.dbuser.username != '' ? ` @${ctx.dbuser.username}` : ''
  //         let finalMessage = `Reminder for${username}:${msg}${repl}`
  //         let chatid = ctx.chosenInlineResult?.from.id.toString()

  //         ctx.api
  //           .sendMessage(
  //             ctx.chosenInlineResult?.from.id,
  //             `Ok, will remind you in ${numQuantity} ${replyMessage} this: ${message}`
  //           )
  //           .catch((err) => {
  //             console.log(err)
  //           })

  //         recursiveTimeout(() => {
  //           sendMessageTimeout(
  //             ctx,
  //             chatid.toString(),
  //             finalMessage,
  //             ctx.dbuser.id,
  //             uniqueId
  //           )
  //         }, timeoutSeconds)
  //       }
  //     } else {
  //       ctx.reply('Invalid number or too big').catch((err) => {
  //         console.log(err)
  //       })
  //     }
  //   } else {
  //     ctx.reply('Ill formated message').catch((err) => {
  //       console.log(err)
  //     })
  //   }
  // }
}

export async function notifyAllChats(ctx: Context) {
  if (ctx.from?.id == 180001222 && ctx.message?.reply_to_message?.text) {
    let msg = ctx.message.reply_to_message.text
    if (msg) {
      // let users = await findAllUsers()
      let chats = await findAllChats()
      for (let privateUser of chats) {
        let canSend = false
        try {
          await ctx.replyWithChatAction("typing")
          canSend = true
        } catch (err) {
          console.log(err)
        }
        if (canSend) {
          ctx.api.sendMessage(privateUser.id, msg).catch((err) => {
            console.log(err)
            ctx.reply(err.message).catch((err) => {
              console.log(err)
            })
          })
          //sleep 1 second
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    }
  }
}