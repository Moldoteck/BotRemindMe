import Context from '@/models/Context'
import sendOptions from '@/helpers/sendOptions'
import { deleteChat, findAllChats } from '@/models/Chat'

export default function handleHelp(ctx: Context) {
  return ctx.replyWithLocalization('help', sendOptions(ctx))
}

export async function handleCount(ctx: Context) {
  if (ctx?.from?.id == 180001222) {
    let chats = await findAllChats()
    let users_tot = 0
    let chat_nr = 0
    let users_pr = 0
    for (let element of chats) {
      try {
        let chatObj = await customFunction(async () => {
          let ch = undefined
          try {
            ch = await ctx.api.getChat(element.id)
          } catch (err: any) {
            console.log(err)
          }
          return ch
        })
        if (!chatObj) {
          continue
        }
        if (chatObj.type == 'private') {
          users_pr += 1
        } else {
          chat_nr += 1
          users_tot += await customFunction(async () => {
            let ch = 0
            try {
              ch = await ctx.api.getChatMemberCount(element.id)
            } catch (err: any) {
              console.log(err)
            }
            return ch
          })
        }
      } catch (err: any) {
        if (
          err.message.includes('kicked') ||
          err.message.includes('not found')
        ) {
          await deleteChat(element.id)
        } else {
          console.log(err)
        }
      }
    }
    ctx
      .reply(
        'Chat users ' +
          users_tot +
          '\nPrivate Users ' +
          users_pr +
          '\nChats ' +
          chat_nr
      )
      .catch((err) => console.log(err))
  }
}

//delay method
function delay(scnd: number) {
  return new Promise((resolve) => setTimeout(resolve, scnd * 1000))
}

async function customFunction(myfunction: Function): Promise<any> {
  try {
    return await myfunction()
  } catch (err: any) {
    let msg = '' + err.message
    if (msg.includes('retry after')) {
      let st = msg.indexOf('retry after') + 'retry after '.length
      msg = msg.substring(st).split(' ')[0]
      await delay(parseInt(msg))
      return await customFunction(myfunction)
    } else {
      console.log('Error', err.stack)
      console.log('Error', err.name)
      console.log('Error', err.message)
      return undefined
    }
  }
}
