import { error } from 'console'
import e from 'express'
import express from 'express'
import { wrap } from 'module'
import {
  changePasswordController,
  forgotPasswordController,
  getMeController,
  loginController,
  logoutController,
  refreshTokenController,
  registerController,
  resendVerifyEmailController,
  resetPasswordController,
  updateMeController,
  verifyEmailTokenController,
  verifyForgotPasswordTokenController
} from '~/controllers/users.controllers'
import {
  accessTokenValidator,
  changePasswordValidator,
  emailVerifyTokenValidator,
  forgotPasswordTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  updateMeValidator
} from '~/middlewares/users.middlewares'
import { wrapAsync } from '~/utils/handlers'
import { Request, Response } from 'express'
import { get } from 'lodash'
import { filterMiddleware } from '~/middlewares/commom.middlewares'
import { UpdateMeReqBody } from '~/models/schemas/requests/users.request'
const userRouter = express.Router()

//chức năng đăng ký tài khoản register {email, password}
//http://localhost:3000/users/register req.body {email, password}

/*
  desc: register a new user
  path: /users/register
  method: POST
  req.body: {name: string, 
  email: string, 
  password: string, 
  confirmPassword: string, 
  date_of_birth: string nhưng có dạng ISO8601}

*/
userRouter.post('/register', registerValidator, wrapAsync(registerController))

/*
desc: login
path: /users/login
method: POST
body: {email: string, password: string}


*/
userRouter.post('/login', loginValidator, wrapAsync(loginController))

/*
desc: logout
path: /users/logout
method: POST
header: {
Authorization: 'Bearer <access_token>'
}
body: {
refresh_token: string
}

*/
userRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapAsync(logoutController))

/*
desc verify email
khi người dùng click vào link trong email
thì evt sẽ được gửi lên server qua query param
path: /users/verify-email/?email_verify_token=string
method: GET

*/
userRouter.get(
  '/verify-email/', //
  emailVerifyTokenValidator,
  wrapAsync(verifyEmailTokenController)
)

userRouter.get('/', (req, res) => {
  res.json({
    data: [
      {
        fname: 'Điệp',
        yob: 1999
      },
      {
        fname: 'Điệp',
        yob: 1999
      }
    ]
  })
})

/*
desc: resend email verify token
người dùng sẽ dùng chức năng này khi họ không nhận được email verify token, làm mất, lạc email verify token
phải đăng nhập thì mới cho verify email
header: {
Authorization: 'Bearer <access_token>'
}
method: POST


*/
userRouter.post(
  '/resend-verify-email',
  accessTokenValidator, //
  wrapAsync(resendVerifyEmailController)
)

/*
desc: forgot password
khi quên mật khẩu thì dùng chức năng này
path: /users/forgot-password
method: POST
body: {email: string}


*/
userRouter.post(
  '/forgot-password',
  forgotPasswordValidator, //
  wrapAsync(forgotPasswordController)
)

/*desc: verify forgot password token to reset password
kiểm tra xem cái forgot password token có còn đúng và còn hiệu lực hay khồng
path: /users/verify-forgot-password
method: POST
body: {forgot_password_token: string}

*/
userRouter.post(
  '/verify-forgot-password',
  forgotPasswordTokenValidator, //hàm này kiểm tra forgot_password_token
  wrapAsync(verifyForgotPasswordTokenController) //thông báo cho người dùng là token này còn hiệu lực
)

/*desc: reset password
path: /users/reset-password
method: POST
body: {forgot_password_token: string, password: string, confirmPassword: string}

*/
userRouter.post(
  '/reset-password',
  forgotPasswordTokenValidator, //kiểm tra forgot_password_token
  resetPasswordValidator, //kiểm tra password và confirmPassword và forgot_password_token
  wrapAsync(resetPasswordController)
)

/*desc: get my profile
path: /users/me
method: POST
header: {
Authorization: 'Bearer <access token>'
}

*/
userRouter.post('/me', accessTokenValidator, wrapAsync(getMeController))

/*
des: update profile của user
path: '/me'
method: patch
Header: {Authorization: Bearer <access_token>}
body: {
  name?: string
  date_of_birth?: Date
  bio?: string // optional
  location?: string // optional
  website?: string // optional
  username?: string // optional
  avatar?: string // optional
  cover_photo?: string // optional}
*/

userRouter.patch(
  '/me',
  filterMiddleware<UpdateMeReqBody>([
    'name',
    'date_of_birth',
    'bio',
    'location',
    'website',
    'avatar',
    'username',
    'cover_photo'
  ]),
  accessTokenValidator, //
  updateMeValidator,
  wrapAsync(updateMeController)
)

/*
desc: change password
chức năng thay đổi password
method: PUT
header: {
Authorization: Bearer <access token>
}
body{
  old_password: string,
  password: string,
  confirm_password: string
}

*/
userRouter.put(
  '/change-password',
  accessTokenValidator, //
  changePasswordValidator,
  wrapAsync(changePasswordController)
)

/*desc: refresh-token
khi người dùng hết hạn access token thì họ gửi refresh token lên server để xin access token và refresh token mới
path: /users/refresh-token
method: POST
body: {refresh_token: string}

*/
userRouter.post(
  '/refresh-token', //
  refreshTokenValidator,
  wrapAsync(refreshTokenController)
)
export default userRouter
