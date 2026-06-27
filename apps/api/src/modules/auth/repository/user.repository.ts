import type { HydratedDocument } from "mongoose"

import { UserModel, type User } from "../../../entities/user"

export type UserDocument = HydratedDocument<User>

export class UserRepository {
  findByEmail(email: string) {
    return UserModel.findOne({ email: email.toLowerCase() })
  }

  findById(id: string) {
    return UserModel.findById(id)
  }

  findByIds(ids: string[]) {
    if (ids.length === 0) {
      return Promise.resolve([])
    }

    return UserModel.find({ _id: { $in: ids } }).select("name email")
  }

  create(email: string, passwordHash: string, name: string) {
    return UserModel.create({ email, passwordHash, name })
  }
}
