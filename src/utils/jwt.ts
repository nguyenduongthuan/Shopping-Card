//file này lưu hàm giúp mình ký ra một token bằng jwt
import { error } from 'console'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { TokenPayload } from '~/models/schemas/requests/users.request'
dotenv.config()
export const signToken = ({
  payload,
  privateKey,
  options = { algorithm: 'HS256' }
}: {
  payload: string | object | Buffer
  privateKey: string
  options?: jwt.SignOptions
}) => {
  //biến thành promise để sử dụng promise.all
  return new Promise<string>((resolve, reject) => {
    jwt.sign(payload, privateKey, options, (error, token) => {
      //bất đồng bộ để tiết kiệm thời gian
      if (error) {
        throw reject(error)
      } else {
        return resolve(token as string)
      }
    })
  })
}

//làm hàm kiểm tra 1 token có đúng với chữ ký hay không
//nếu đúng thì trả về payload đang có trong token đó
export const verifyToken = ({
  token,
  privateKey
}: {
  token: string //
  privateKey: string
}) => {
  //biến thành promise để sử dụng promise.all(kiểm tra nhiều token cùng 1 lúc)
  return new Promise<TokenPayload>((resolve, reject) => {
    jwt.verify(token, privateKey, (error, decode) => {
      //nếu chữ ký không đúng thì sẽ có error
      //nếu đúng thì sẽ có decode, decode là payload của token đã mã hóa
      if (error) {
        throw reject(error)
      } else {
        return resolve(decode as TokenPayload)
      }
    })
  })
}
