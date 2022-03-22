import { getModelForClass, modelOptions, prop } from '@typegoose/typegoose'

//chat id
export interface MessageChat {
  [key: string]: string
}

//message id
interface Reminder {
  [key: string]: MessageChat
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class User {
  @prop({ required: true, index: true, unique: true })
  id!: number

  @prop({ required: true, default: '' })
  username!: string
  @prop({ required: true, default: 'en' })
  language!: string

  @prop({ required: false, default: {} })
  reminders!: Reminder
}

const UserModel = getModelForClass(User)

export function findOrCreateUser(id: number) {
  return UserModel.findOneAndUpdate(
    { id },
    { username: `${id}` },
    {
      upsert: true,
      new: true,
    }
  )
}

export function findOrCreateUserName(id: number, username: string) {
  return UserModel.findOneAndUpdate(
    { id },
    { username: username },
    {
      upsert: true,
      new: true,
    }
  )
}

export async function findAllUsers() {
  return await UserModel.find({})
}
