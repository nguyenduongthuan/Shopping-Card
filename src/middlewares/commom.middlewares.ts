import { pick } from 'lodash'
import { Request, Response, NextFunction } from 'express'
//filterKey là mảng chứ các chuỗi tên của các Key
export const filterMiddleware = <T>(filterKeys: Array<keyof T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.body = pick(req.body, filterKeys)
    next()
  }
}
