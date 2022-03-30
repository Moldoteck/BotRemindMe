import { NextFunction } from 'grammy'
import { findOrCreateChat } from '@/models/Chat'
import Context from '@/models/Context'

export default async function attachChat(ctx: Context, next: NextFunction) {
  let chat = undefined
  if (ctx.chat?.id) {
    chat = await findOrCreateChat(ctx.chat.id)
  }
  ctx.dbchat = chat
  return next()
}
