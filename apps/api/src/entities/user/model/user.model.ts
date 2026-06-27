import { Schema, model } from "mongoose"

export type User = {
  email: string
  passwordHash: string
  name: string
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<User>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

export const UserModel = model<User>("User", userSchema)
