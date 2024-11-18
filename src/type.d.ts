//file này có khả năng định nghĩa lại tất cả các thư viện trong hệ thống của mình nếu cần

import { Request } from 'express'
import { TokenPayload } from './models/schemas/requests/users.request'
declare module 'express' {
  //định nghĩa thêm thuộc tính cho req của express
  interface Request {
    decode_authorization?: TokenPayload
    decode_refresh_token?: TokenPayload
    decode_email_verify_token?: TokenPayload
    decode_forgot_password_token?: TokenPayload
  }
}
