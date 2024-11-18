import { Jwt, JwtPayload } from 'jsonwebtoken'
import { TokenType } from '~/constants/enums'
import { ParsedQs } from 'qs'
//file lưu các định nghĩa về request body, query, param của các api
export interface RegisterRequestBody {
  name: string
  email: string
  password: string
  confirmPassword: string
  date_of_birth: string
}
export interface LoginReqBody {
  email: string
  password: string
}
//payload của token
export interface TokenPayload extends JwtPayload {
  user_id: string
  token_type: TokenType
}

export interface LogoutReqBody {
  refresh_token: string
}

export interface VerifyEmailReqQuery extends ParsedQs {
  email_verify_token: string
}
export interface VerifyForgotPassswordTokenReqBody {
  forgot_password_token: string
}

export interface VerifyForgotPassswordTokenReqQuery {
  forgot_password_token: string
}
export interface ResetPasswordReqBody {
  password: string
  confirmPassword: string
  forgot_password_token: string
}
export interface UpdateMeReqBody {
  name?: string
  date_of_birth?: Date
  bio?: string // optional
  location?: string // optional
  website?: string // optional
  username?: string // optional
  avatar?: string // optional
  cover_photo?: string // optional}
}
export interface ChangePasswordReqBody {
  old_password: string
  password: string
  confirm_password: string
}
export interface RefreshTokenReqBody {
  refresh_token: string
}
