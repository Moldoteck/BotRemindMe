import { Context as BaseContext } from 'grammy'
import { DocumentType } from '@typegoose/typegoose'
import { I18nContext } from '@grammyjs/i18n/dist/source'
import { User } from '@/models/User'
import { Chat } from '@/models/Chat'

class Context extends BaseContext {
  readonly i18n!: I18nContext
  dbuser!: DocumentType<User>
  dbchat!: DocumentType<Chat> | undefined

  replyWithLocalization: this['reply'] = (text, other, ...rest) => {
    text = this.i18n.t(text)
    return this.reply(text, other, ...rest)
  }
}

export default Context
