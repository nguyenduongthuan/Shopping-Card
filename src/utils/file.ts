//viết hàm kiểm tra thư mục của dự án có folder uploads không
//nếu không có thì tạo ra folder uploads
import path from 'path'
import fs from 'fs' //mdule chuyên xử lý file
import { Request } from 'express'
import { filter } from 'lodash'
import formidable, { File } from 'formidable'
import { UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'
export const initFolder = () => {
  //lưu đường dẫn đến thư mục trước đã
  //kiểm tra xem uploadsFolderPath có đưa mình đến folder nào không
  ;[UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      //tạo ra folder uploads
      fs.mkdirSync(dir, {
        recursive: true
      })
    }
  })
}

//tạo hàm handleUploadSingleImage

//hàm này nhận vào req, ép req đu qua lưới lọc fomidable
//chỉ lấy file image và return ra ngoài các file thu được
export const handleUploadImage = async (req: Request) => {
  //chuẩn bị lưới lọc
  const form = formidable({
    maxFiles: 4, //tối đa 4 file
    maxFileSize: 1024 * 300, //tối đa 300kb
    maxTotalFileSize: 1024 * 300 * 4, //tối đa 4 file 300kb
    keepExtensions: true, //giữ lại đuôi file
    uploadDir: UPLOAD_IMAGE_TEMP_DIR, //đường dẫn lưu file
    filter: ({ name, originalFilename, mimetype }) => {
      //name này là tên của field đang chứa file
      //originalFilename là tên gốc ban đầu của file
      //mimetype là loại, kiểu của file đc upload
      const valid = name === 'image' && Boolean(mimetype?.includes('image'))
      if (!valid) {
        //ném ra lỗi nếu file không hợp lệ
        form.emit('error' as any, new Error('File type is not valid') as any)
      }
      return valid
    }
  })
  //mình xài cái lưới lọc trên
  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }
      if (!files.image) {
        return reject(new Error('Image is required'))
      }
      return resolve(files.image as File[])
    })
  })
}

export const handleUploadVideo = async (req: Request) => {
  //chuẩn bị lưới lọc
  const form = formidable({
    maxFiles: 1, //tối đa 1 file
    maxFileSize: 1024 * 1024 * 50, //tối đa 50mb
    keepExtensions: true, //giữ lại đuôi file
    uploadDir: UPLOAD_VIDEO_DIR, //đường dẫn lưu file
    filter: ({ name, originalFilename, mimetype }) => {
      //name này là tên của field đang chứa file
      //originalFilename là tên gốc ban đầu của file
      //mimetype là loại, kiểu của file đc upload
      const valid = name === 'video' && Boolean(mimetype?.includes('video'))
      if (!valid) {
        //ném ra lỗi nếu file không hợp lệ
        form.emit('error' as any, new Error('File type is not valid') as any)
      }
      return valid
    }
  })
  //mình xài cái lưới lọc trên
  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }
      if (!files.video) {
        return reject(new Error('video is required'))
      }
      return resolve(files.video as File[])
    })
  })
}

//getNameFromFullnameFile: hàm nhận vào full tên asd.png và trả về tên asd
export const getNameFromFullnameFile = (filename: string) => {
  const nameArr = filename.split('.')
  nameArr.pop()
  return nameArr.join('-')
}
