import { createHash } from 'crypto'
import dotenv from 'dotenv'
//chuẩn bị hàm mã hóa 1 nội dung nào đó theo mã sha256
function sha256(content: string) {
  return createHash('sha256').update(content).digest('hex')
}
//viết hàm hash password
export function hashPassword(password: string) {
  return sha256(password + process.env.PASSWORD_SECRET)
}
