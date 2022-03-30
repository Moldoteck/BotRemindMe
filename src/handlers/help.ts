import Context from '@/models/Context'
import sendOptions from '@/helpers/sendOptions'
import { findAllChats } from '@/models/Chat'

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
      console.log(element)
      try {
        users_tot += await ctx.api.getChatMemberCount(element.id)
        chat_nr += 1
      } catch (err) {
        console.log(err)
        users_pr += 1
      }
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    ctx.reply('Total users ' + users_tot)
    ctx.reply('Private Users ' + users_pr)
    ctx.reply('Chats ' + chat_nr)
  }
}
