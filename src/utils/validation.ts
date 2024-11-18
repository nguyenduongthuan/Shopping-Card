//viết hàm validation nhận vào checkSchema
//và trả ra middleware xử lý lỗi

import { ValidationChain, validationResult } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema'
import { Request, Response, NextFunction } from 'express'
import { EntityError, ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await validation.run(req) //run thì mới chép lỗi vào req
    const errors = validationResult(req) //lấy lỗi từ req ra
    if (errors.isEmpty()) {
      return next()
    } else {
      const errorObject = errors.mapped()
      const entityError = new EntityError({ errors: {} })
      //duyệt qua các key trong objetc lỗi
      for (const key in errorObject) {
        //lấy msg trong các key đó
        const { msg } = errorObject[key]

        if (msg instanceof ErrorWithStatus && msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY) {
          return next(msg)
        }
        entityError.errors[key] = msg
        //msg là string ????????????
      }
      next(entityError)
    }
  }
}
