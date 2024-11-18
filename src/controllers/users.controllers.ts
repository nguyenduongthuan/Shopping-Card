import { NextFunction, Request, Response } from 'express'
import {
  ChangePasswordReqBody,
  LoginReqBody,
  LogoutReqBody,
  RefreshTokenReqBody,
  RegisterRequestBody,
  ResetPasswordReqBody,
  TokenPayload,
  UpdateMeReqBody,
  VerifyEmailReqQuery,
  VerifyForgotPassswordTokenReqBody,
  VerifyForgotPassswordTokenReqQuery
} from '~/models/schemas/requests/users.request'
import usersService from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import { UserVerifyStatus } from '~/constants/enums'
//cotroller là handler điều phối các dữ liệu vào đúng các service xử lý trích xuất du liệu với server

export const registerController = async (
  req: Request<ParamsDictionary, any, RegisterRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body
  //gọi database tạo user từ email và password lưu vào collection users
  //kiểm tra email gửi lên đã tồn tại chưa
  const isDup = await usersService.checkEmailExist(email)
  if (isDup) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
      message: USERS_MESSAGES.EMAIL_ALREADY_EXISTS
    })
  }
  const result = await usersService.register(req.body)
  res.status(HTTP_STATUS.CREATED).json({
    message: USERS_MESSAGES.REGISTER_SUCCESS,
    result
  })
}

export const loginController = async (
  req: Request<ParamsDictionary, any, LoginReqBody>,
  res: Response,
  next: NextFunction
) => {
  //ccaanf lấy email và password từ req.body để tìm xem user nào đang sở hữu
  const { email, password } = req.body
  const result = await usersService.login({ email, password })
  //nếu không có thì ngừng cuộc chơi
  //nếu có thì tạo at và rf và trả về cho client
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.LOGIN_SUCCESS,
    result // access_token, refresh_token
  })
}

export const logoutController = async (
  req: Request<ParamsDictionary, any, LogoutReqBody>,
  res: Response,
  next: NextFunction
) => {
  //xem thử user_id trong payload của access_token và refresh_token có giống nhau không
  const { refresh_token } = req.body
  const { user_id: user_id_at } = req.decode_authorization as TokenPayload
  //as TokenPayload để ép kiểu cho req.decode_authorization vì nó có thể là TokenPayload hoặc undefined
  const { user_id: user_id_rf } = req.decode_refresh_token as TokenPayload
  //Đây là cú pháp destructuring assignment.
  // Nó có nghĩa là lấy thuộc tính user_id từ đối tượng phía bên phải
  //và gán cho một biến mới có tên là user_id_at. Nếu không có được gán là undefined.
  if (user_id_at !== user_id_rf) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNAUTHORIZED,
      message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID
    })
  }
  //nếu mà trùng rồi thì mình xem thử refresh_token có được quyền dùng dịch vụ không
  //refresh_token này có lưu trong database không, nếu có thì mới tiến hành logout(xóa refresh token khỏi hệ thống), nếu không thì báo lỗi
  await usersService.checkRefreshToken({
    user_id: user_id_at,
    refresh_token: refresh_token
  })
  //khi nào có mã đó trong database thì mình tiến hành logout (xóa rf đó trong database)
  await usersService.logout(refresh_token)
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.LOGOUT_SUCCESS
  })
}

export const verifyEmailTokenController = async (
  req: Request<ParamsDictionary, any, any, VerifyEmailReqQuery>,
  res: Response,
  next: NextFunction
) => {
  //khi họ bấm vào link trong email thì sẽ gửi email_verify_token lên server qua query
  const { email_verify_token } = req.query
  const { user_id } = req.decode_email_verify_token as TokenPayload
  //kiểm tra xem email_verify_token có hợp lệ không, trong database có user nào có email_verify_token này không và là user id user_id
  const user = await usersService.checkEmailVerifyToken({
    user_id,
    email_verify_token
  })

  //kiểm tra xem user_id này đã bị banned chưa, chưa thì mình mới tiến hành verify
  if (user.verify == UserVerifyStatus.Banned) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNAUTHORIZED, //402
      message: USERS_MESSAGES.EMAIL_HAS_BEEN_BANNED
    })
  } else {
    //nếu chưa thì mình tiến hành verify
    const result = await usersService.verifyEmail(user_id)
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.VERIFY_EMAIL_SUCCESS,
      result
    })
  }
}

export const resendVerifyEmailController = async (
  req: Request<ParamsDictionary, any, any>,
  res: Response,
  next: NextFunction
) => {
  //Dùng user_id để tìm user trong database
  const { user_id } = req.decode_authorization as TokenPayload
  //kiểm tra user đó có verify hay bị banned không
  const user = await usersService.findUserById(user_id)
  if (!user) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.NOT_FOUND, //404
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  }
  if (user.verify == UserVerifyStatus.Verified) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.OK, //422
      message: USERS_MESSAGES.EMAIL_HAS_BEEN_VERIFIED
    })
  } else if (user.verify == UserVerifyStatus.Banned) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.OK, //402
      message: USERS_MESSAGES.EMAIL_HAS_BEEN_BANNED
    })
  } else {
    //nếu chưa verify thì mới tiến hành resend email verify token
    const email_verify_token = await usersService.resendEmailVerify(user_id)
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.RESEND_EMAIL_VERIFY_TOKEN_SUCCESS,
      email_verify_token
    })
  }
  //nếu không thì mới resend email verify token
}

export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, any>,
  res: Response,
  next: NextFunction
) => {
  //lấy email từ req.body
  const { email } = req.body
  //kiểm tra email này có tồn tại trong database không
  const hasUser = await usersService.checkEmailExist(email)
  if (!hasUser) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.NOT_FOUND, //404
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  } else {
    //nếu có thì mình tạo forgot password token và gửi email cho user
    const forgot_password_token = await usersService.forgotPassword(email)
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD,
      forgot_password_token
    })
  }
}

export const verifyForgotPasswordTokenController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPassswordTokenReqBody>,
  res: Response,
  next: NextFunction
) => {
  //fe gửi mã forgot_password_token lên server qua body để nhờ mình xác minh
  //mình đã xác forgot_password_token này là chuẩn  ở middleware rồi
  //giờ mình chỉ cần xác minh nó còn hiệu lực không với user_id
  //lấy forgot_password_token từ req.body
  const { user_id } = req.decode_forgot_password_token as TokenPayload
  const { forgot_password_token } = req.body
  await usersService.checkForgotPasswordToken({
    user_id, //
    forgot_password_token
  })
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS
  })
}

export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  //fe gửi mã forgot_password_token lên server qua body để nhờ mình xác minh
  //mình đã xác forgot_password_token này là chuẩn  ở middleware rồi
  //giờ mình chỉ cần xác minh nó còn hiệu lực không với user_id
  //lấy forgot_password_token từ req.body
  const { user_id } = req.decode_forgot_password_token as TokenPayload
  const { forgot_password_token, password } = req.body
  await usersService.checkForgotPasswordToken({
    user_id, //
    forgot_password_token
  })
  //reset password nếu token hợp lệ
  await usersService.resetPassword({
    user_id,
    password
  })
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS
  })
}

export const getMeController = async (
  req: Request<ParamsDictionary, any, any>, //
  res: Response,
  next: NextFunction
) => {
  //lấy user_id từ req.decode_authorization
  //duùng user_id để tìm user trong database và loại bỏ 1 vài thông tin nhạy cảm
  const { user_id } = req.decode_authorization as TokenPayload
  //tìm user trong database dựa vào user_id
  const userInfor = await usersService.getMe(user_id)
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.GET_PROFILE_SUCCESS,
    userInfor
  })
}

export const updateMeController = async (
  req: Request<ParamsDictionary, any, UpdateMeReqBody>, //
  res: Response,
  next: NextFunction
) => {
  //người dùng truyền lên access_token để mình biết họ là ai
  //lấy user_id từ req.decode_authorization
  //duùng user_id để tìm user trong database và loại bỏ 1 vài thông tin nhạy cảm
  const { user_id } = req.decode_authorization as TokenPayload
  //update những gì mà họ cung cấp ở trong body
  const payload = req.body
  const isVerified = await usersService.checkEmailVerified(user_id)
  if (!isVerified) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.FORBIDDEN, //403
      message: USERS_MESSAGES.USER_NOT_VERIFIED
    })
  }
  //nếu đã verify email thì mới cho update
  const userInfor = await usersService.updateMe({ user_id, payload })
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.UPDATE_PROFILE_SUCCESS,
    userInfor
  })
}

export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>, //
  res: Response,
  next: NextFunction
) => {
  //lấy user_id từ req.decode_authorization
  //lấy old_password, password, confirm_password từ req.body
  const { user_id } = req.decode_authorization as TokenPayload
  const { old_password, password } = req.body
  //kiểm tra xem old_password có đúng không
  await usersService.changePassword({
    user_id,
    old_password,
    password
  })
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS
  })
}

export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenReqBody>,
  res: Response,
  next: NextFunction
) => {
  //lấy refresh_token từ req.body
  const { user_id } = req.decode_refresh_token as TokenPayload
  const { refresh_token } = req.body
  await usersService.checkRefreshToken({
    user_id,
    refresh_token
  })
  //nếu mà kiểm tra ko có bug gì thì mình sẽ tiến hành refresh token
  const result = await usersService.refreshToken({ user_id, refresh_token })
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.REFRESH_TOKEN_SUCCESS,
    result //access_token, refresh_token
  })
}
