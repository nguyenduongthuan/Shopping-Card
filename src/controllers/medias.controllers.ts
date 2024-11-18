import { Request, Response, NextFunction } from 'express'

import HTTP_STATUS from '~/constants/httpStatus'
import mediaService from '~/services/medias.services'
export const uploadImageController = async (
  req: Request, //
  res: Response,
  next: NextFunction
) => {
  //__dirname: cung cấp đường dẫn đến thư mục chứa file
  //path.resolve(''uploads): cung cấp đường dẫn bắt đầu tính từ thư mục dự án
  //đang hướng về uploads dù uploads không tồn tại
  //và đây là đường dẫn trong mơ mà mình mong muốn lưu ảnh

  //tạo một tấm lưới lọc file bằng formidable
  const urlImage = await mediaService.handleUploadImage(req)
  res.status(HTTP_STATUS.OK).json({
    message: 'Upload image successfully',
    urlImage
  })
}

export const uploadVideoController = async (
  req: Request, //
  res: Response,
  next: NextFunction
) => {
  //__dirname: cung cấp đường dẫn đến thư mục chứa file
  //path.resolve(''uploads): cung cấp đường dẫn bắt đầu tính từ thư mục dự án
  //đang hướng về uploads dù uploads không tồn tại
  //và đây là đường dẫn trong mơ mà mình mong muốn lưu ảnh

  //tạo một tấm lưới lọc file bằng formidable
  const urlVideo = await mediaService.handleUploadVideo(req)
  res.status(HTTP_STATUS.OK).json({
    message: 'Upload image successfully',
    urlVideo
  })
}
