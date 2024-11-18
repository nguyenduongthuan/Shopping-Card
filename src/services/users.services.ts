import User from '~/models/schemas/User.schema'
import databaseServices from './database.services'
import { LoginReqBody, RegisterRequestBody, UpdateMeReqBody } from '~/models/schemas/requests/users.request'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import dotenv from 'dotenv'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import { ObjectId } from 'mongodb'
dotenv.config()

class UsersService {
  private signAccessToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.AccessToken },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN }
    })
  }

  private signRefreshToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.RefreshToken },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN }
    })
  }

  private signEmailVerifyToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.EmailVerificationToken },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      options: { expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRE_IN }
    })
  }

  private signForgotPasswordToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.ForgotPasswordToken },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      options: { expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRE_IN }
    })
  }

  async checkEmailExist(email: string): Promise<boolean> {
    //code here
    //kiểm tra email đã tồn tại trong database chưa
    //tìm user nào đangt xài email này, không có ai xài thì nghĩa là email chưa tồn tại
    return Boolean(await databaseServices.users.findOne({ email }))
  }

  async checkRefreshToken({ user_id, refresh_token }: { user_id: string; refresh_token: string }) {
    //code here
    //kiểm tra refresh token có trong database không
    //nếu có thì trả về refresh token

    const refreshToken = await databaseServices.refresh_tokens.findOne({
      user_id: new ObjectId(user_id),
      token: refresh_token
    })
    if (!refreshToken) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED, //401
        message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID
      })
      //không có khi refresh token đã hết hạn, hoặc đã logout, chặn, thu hồi rồi
    }
    return refreshToken
  }

  async checkEmailVerifyToken({
    user_id,
    email_verify_token
  }: {
    user_id: string //
    email_verify_token: string
  }) {
    //tìm user trong database dựa vào user_id và email_verify_token
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id),
      email_verify_token
    })
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND, //404
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }
    return user
  }

  async checkForgotPasswordToken({
    user_id, //
    forgot_password_token
  }: {
    user_id: string
    forgot_password_token: string
  }) {
    //dùng hai thông tin user_id và forgot_password_token để tìm user trong database
    //tìm được thì token oke
    //không thì throw với thông báo 'token invalid'
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id),
      forgot_password_token
    })
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USERS_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_INVALID
      })
    }
    //nếu mà có thgif thì trả về user
    return user
  }

  async checkEmailVerified(user_id: string): Promise<boolean> {
    //code here
    //tìm user trong database dựa vào user_id
    //nếu user tồn tại và email_verified là true thì trả về true
    const user = await databaseServices.users.findOne({ _id: new ObjectId(user_id) })
    return user?.verify === UserVerifyStatus.Verified
  }
  async findUserById(user_id: string) {
    //code here
    //tìm user trong database dựa vào user_id
    return await databaseServices.users.findOne({ _id: new ObjectId(user_id) })
  }

  async findUserByEmail(email: string) {
    //code here
    //tìm user trong database dựa vào email
    return await databaseServices.users.findOne({ email })
  }
  async register(payload: RegisterRequestBody) {
    //code here
    //gọi database tạo user từ email và password và lưu vào collection users
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken(user_id.toString())
    const result = await databaseServices.users.insertOne(
      new User({
        _id: user_id,
        email_verify_token,
        username: `user${user_id.toString()}`,
        ...payload,
        password: hashPassword(payload.password),
        date_of_birth: new Date(payload.date_of_birth)
      })
    )
    //tạo access token và refresh token

    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id.toString()),
      this.signRefreshToken(user_id.toString())
    ])
    //gửi email verify token qua email
    console.log(`
      Nội dung Email xác thực Email gồm:
      http://localhost:3000/users/verify-email/?email_verify_token=${email_verify_token}
      `)

    await databaseServices.refresh_tokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    return { access_token, refresh_token }
  }

  async login({ email, password }: LoginReqBody) {
    //dùng email và password để tìm user trong database
    const user = await databaseServices.users.findOne({ email, password: hashPassword(password) })
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
        message: USERS_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT
      })
    }
    //nếu có thì tạo access token và refresh token
    const user_id = user._id.toString()
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    //lưu refresh token vào database
    await databaseServices.refresh_tokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    return { access_token, refresh_token }
  }

  async logout(refresh_token: string) {
    //code here
    //xóa refresh token trong database, vì mình đã kiểm tra refresh token có tồn tại trong database chưa
    //nên không cần kiểm tra lại, vào xóa thôi
    await databaseServices.refresh_tokens.deleteOne({ token: refresh_token })
  }

  async verifyEmail(user_id: string) {
    //dùng user_id để tìm user trong database và cập nhật email_verified thành true
    await databaseServices.users.updateOne(
      { _id: new ObjectId(user_id) }, //
      [
        {
          $set: {
            verify: UserVerifyStatus.Verified,
            email_verify_token: '',
            updated_at: '$$NOW'
          }
        }
      ]
    )
    //tạo access token và refresh token
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    //lưu refresh token vào database
    await databaseServices.refresh_tokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    return { access_token, refresh_token }
  }
  async resendEmailVerify(user_id: string) {
    //kí
    const email_verify_token = await this.signEmailVerifyToken(user_id)
    //lưu || update email_verify_token vào database
    await databaseServices.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          email_verify_token,
          updated_at: '$$NOW'
        }
      }
    ])
    //gửi
    console.log(`
      Nội dung Email xác thực Email gồm:
      http://localhost:3000/users/verify-email/?email_verify_token=${email_verify_token}
      `)
  }

  async forgotPassword(email: string) {
    //tìm user trong database dựa vào email
    const user = await databaseServices.users.findOne({ email })
    if (user) {
      const user_id = user._id
      const forgot_password_token = await this.signForgotPasswordToken(user_id.toString())
      //lưu forgot_password_token vào database
      await databaseServices.users.updateOne({ _id: new ObjectId(user_id) }, [
        {
          $set: {
            forgot_password_token,
            updated_at: '$$NOW'
          }
        }
      ])
      //gửi email cho user
      console.log(`
      Bấm vô đây để đổi mật khẩu:
      http://localhost:8000/reset-password/?forgot_password_token=${forgot_password_token}
      `)
    }
  }

  async resetPassword({ user_id, password }: { user_id: string; password: string }) {
    //cập nhật password mới cho user
    await databaseServices.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          password: hashPassword(password),
          forgot_password_token: '',
          updated_at: '$$NOW'
        }
      }
    ])
  }

  async getMe(user_id: string) {
    //code here
    //tìm user trong database dựa vào user_id
    //loại bỏ một số thông tin nhạy cảm
    const user = await databaseServices.users.findOne(
      { _id: new ObjectId(user_id) }, //
      {
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }
    return user
  }

  async updateMe({ user_id, payload }: { user_id: string; payload: UpdateMeReqBody }) {
    //code here
    //cập nhật thông tin của user
    //payload cos hai khuyết điểm
    //1. không biết ng dùng truyền lên cái gì
    //2. Nếu có truyền lên date_of_birth thì nó là string => date
    const _payload = payload.date_of_birth //
      ? { ...payload, date_of_birth: new Date(payload.date_of_birth) }
      : payload
    //3. nếu có truyền lên username thì nó phải là unique
    if (_payload.username) {
      //tìm xem có ai xài username này chưa
      const user = await databaseServices.users.findOne({ username: _payload.username })
      //bản chất muốn update thì phải getme lấy toàn bộ thồng tin user rồi mới update
      //nên bên front sẽ đảm nhận nhiệm vụ chặn nếu người dùng nhập lại username cũ
      //nếu người dùng bypass thì nó chính là tk hacker nên không cần nhân từ với nó
      //nếu nó gởi lại đúng username cũ thì cũng ko nhân từ gì hết, chửi luôn
      //=> không cần kiểm tra username đã sử dụng có phải của chính user đó không
      if (user) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
          message: USERS_MESSAGES.USERNAME_ALREADY_EXISTS
        })
      }
    }
    //vượt qua hai chương ngại vật thì update thông tin user
    const userInfor = await databaseServices.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      [
        {
          $set: {
            ..._payload,
            updated_at: '$$NOW'
          }
        }
      ],
      {
        //trả về thông tin user sau khi cập nhật
        returnDocument: 'after',
        //loại bỏ một số thông tin nhạy cảm
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    return userInfor //trả ra cho controller dùng để trả về cho client
  }

  async changePassword({
    user_id,
    old_password,
    password //
  }: {
    user_id: string
    old_password: string
    password: string
  }) {
    //code here
    //dựa vào user_id và old_password để tìm user trong database
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id),
      password: hashPassword(old_password)
    })
    //nếu ko có thì nghĩa là người dùng nhập sai mật khẩu cũ
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED, //401
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }
    //nếu mà tìm được thì nghĩa là nhập đúng password cũ
    //nếu có thì cập nhật password mới
    await databaseServices.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          password: hashPassword(password),
          updated_at: '$$NOW'
        }
      }
    ])
  }

  async refreshToken({ user_id, refresh_token }: { user_id: string; refresh_token: string }) {
    //tạo ac và rf mới
    const [access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    //xóa rf cũ
    await databaseServices.refresh_tokens.deleteOne({ token: refresh_token })
    //lưu rf mới vào database
    await databaseServices.refresh_tokens.insertOne(
      new RefreshToken({
        token: new_refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    //gửi ac và rf mới về cho client
    return { access_token, refresh_token: new_refresh_token }
  }
}

//tạo instance của class UsersService
const usersService = new UsersService()
export default usersService
