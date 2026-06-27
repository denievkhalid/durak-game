import type { AuthUser, UserDTO } from "../../../shared/types/auth-user"
import { AppError } from "../../../shared/errors/app-error"
import { hashPassword, verifyPassword } from "../../../shared/lib/password"
import { signAccessToken } from "../../../shared/lib/jwt"
import type { UserDocument } from "../repository/user.repository"
import { UserRepository } from "../repository/user.repository"

type AuthResult = {
  token: string
  user: UserDTO
}

export class AuthService {
  private readonly userRepository: UserRepository

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository
  }

  async register(email: string, password: string, name: string): Promise<AuthResult> {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedName = name.trim()

    this.assertValidCredentials(normalizedEmail, password, normalizedName)

    const existingUser = await this.userRepository.findByEmail(normalizedEmail)
    if (existingUser) {
      throw new AppError("Email is already registered", 409)
    }

    const passwordHash = await hashPassword(password)
    const user = await this.userRepository.create(normalizedEmail, passwordHash, normalizedName)
    const authUser = this.toAuthUser(user)

    return {
      token: signAccessToken(authUser),
      user: authUser,
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      throw new AppError("Email and password are required", 400)
    }

    const user = await this.userRepository.findByEmail(normalizedEmail)
    if (!user) {
      throw new AppError("Invalid email or password", 401)
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      throw new AppError("Invalid email or password", 401)
    }

    const authUser = this.toAuthUser(user)

    return {
      token: signAccessToken(authUser),
      user: authUser,
    }
  }

  async getCurrentUser(userId: string): Promise<UserDTO> {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new AppError("User not found", 404)
    }

    return this.toAuthUser(user)
  }

  private toAuthUser(user: UserDocument): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  }

  private assertValidCredentials(email: string, password: string, name: string): void {
    if (!email || !password || !name) {
      throw new AppError("Email, password and name are required", 400)
    }

    if (password.length < 6) {
      throw new AppError("Password must be at least 6 characters", 400)
    }

    if (!email.includes("@")) {
      throw new AppError("Invalid email format", 400)
    }
  }
}
