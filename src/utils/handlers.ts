import { Request, Response, NextFunction, RequestHandler } from 'express'
//file này chứa hàm wrapAsync
//wrapAsync  là 1 hàm nhận vào `async request handler` và trả ra `request handler`
//'async request handler' : là các handler đang ko có tr catch next
//wrapAsync nhận bào ``async request handler` và trả ra `request handler` mới
//có cấu trúc try catch next và chạy `async request handler` cũ trong cấu trúc đó
export const wrapAsync = <P, T>(func: RequestHandler<P, any, any, T>) => {
  return async (req: Request<P, any, any, T>, res: Response, next: NextFunction) => {
    try {
      await func(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}
