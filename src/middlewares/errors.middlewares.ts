//file này chứa hàm xử lý lỗi của toàn bộ server
//lỗi của validate trả về sẽ có các dạng sau
//EntityError{message: string, status: number, errors: {}}
//ErrorWithStatus{message: string, status: number}
//lỗi ccuar controller sẽ trả về dạng ErrorWithStatuss{message: string, status: number},
// error bình thường- ko có status {message: string, stack: string, name} (rớt mạng, ko kết nối đc db, ...)
//=> lỗi từ mọi nơi đổ về đây chưa chắc có status mà lỗi ko có status
//khi trong checkSchema thì là 422(throw new Error)
//khi trong controller (không trong checkSchema) thì là  500
import { omit } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { Request, Response, NextFunction } from 'express'
import { ErrorWithStatus } from '~/models/Errors'
//lỗi từ mọi nơi đổ về đây chưa chắc có status
export const defaultErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  //lỗi của toàn bộ hệ thống sẽ đổ về đây
  if (error instanceof ErrorWithStatus) {
    //instanceof của ErrorWithStatus có thể là EntityError do EntityError kế thừa từ ErrorWithStatus hoặc là ErrorWithStatus luôn
    res.status(error.status).json(omit(error, ['status']))
    //omit là hàm loại bỏ thuộc tính trong object
  } else {
    //lỗi khác ErrorWithStatus, nghĩa là lỗi bt, lỗi ko có status
    //lỗi có tùm lum thứ stack, name, message, lưu ý ko có status
    //lấy ra mảng các key của error, đi qua từng key, định nghĩa lại thuộc tính đó
    //làm vậy vì ta không biết error có bao nhiêu key, không thể viết cứng
    Object.getOwnPropertyNames(error).forEach((key) => {
      Object.defineProperty(error, key, {
        enumerable: true
      })
    })
    //
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: error.message,
      errorInfor: omit(error, ['stack'])
    })
  }
}
