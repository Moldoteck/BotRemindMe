import { getModelForClass, modelOptions, prop } from '@typegoose/typegoose'

@modelOptions({ schemaOptions: { timestamps: true } })
export class Chat {
  @prop({ required: true, index: true, unique: true })
  id!: number
}

const ChatModel = getModelForClass(Chat)

export function findOrCreateChat(id: number) {
  return ChatModel.findOneAndUpdate(
    { id },
    {},
    {
      upsert: true,
      new: true,
    }
  )
}

export async function findAllChats() {
  return await ChatModel.find({})
}

export async function countChats() {
  return await ChatModel.countDocuments({})
}
// delete chat
export async function deleteChat(id: number) {
  return await ChatModel.deleteOne({ id })
}
