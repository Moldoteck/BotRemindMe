import Context from '@/models/Context'
import sendOptions from '@/helpers/sendOptions'
import { findAllChats } from '@/models/Chat'

export default function handleHelp(ctx: Context) {
  return ctx.replyWithLocalization('help', sendOptions(ctx))
}

export async function handleCount(ctx: Context) {
  if (ctx.msg.from?.id == 180001222) {
    let chats = await findAllChats()
    let users_tot = 0
    let chat_nr = 0
    let users_pr = 0
    for (let element of chats) {
      try {
        let chatObj = await ctx.api.getChat(element.id)
        if (chatObj.type == 'private') {
          users_pr += 1
        } else {
          chat_nr += 1
          users_tot += await ctx.api.getChatMemberCount(element.id)
        }
      } catch (err) {
        console.log(err)
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
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
