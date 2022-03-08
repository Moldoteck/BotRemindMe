import { NextFunction } from 'grammy'
import { findOrCreateUser, findOrCreateUserName } from '@/models/User'
import Context from '@/models/Context'

export default async function attachUser(ctx: Context, next: NextFunction) {
  if (!ctx.from) {
    throw new Error('No from field found')
  }
  let user = undefined
  if (ctx.from.username) {
    user = await findOrCreateUserName(ctx.from.id, ctx.from.username)
  } else {
    user = await findOrCreateUser(ctx.from.id)
  }
  if (!user) {
    throw new Error('User not found')
  }
  ctx.dbuser = user
  return next()
}
