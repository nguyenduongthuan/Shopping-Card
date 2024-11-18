import sharp from 'sharp'
import { getNameFromFullnameFile, handleUploadImage, handleUploadVideo } from '~/utils/file'
import fs from 'fs'
import { Request } from 'express'
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'
import { url } from 'inspector'
import { MediaType } from '~/constants/enums'
import { Media } from '~/models/Other'
class MediaService {
  async handleUploadImage(req: Request) {
    const files = await handleUploadImage(req)
    const result = await Promise.all(
      files.map(async (file) => {
        //độ lại tên của file
        const newFileName = getNameFromFullnameFile(file.newFilename) + '.jpg'
        const newPath = UPLOAD_IMAGE_DIR + '/' + newFileName
        const infor = await sharp(file.filepath).jpeg().toFile(newPath)
        //xóa bức hình trong thư mục temp
        fs.unlinkSync(file.filepath)
        const urlImage: Media = {
          url: `http://localhost:3000/static/image/${newFileName}`,
          type: MediaType.Image
        }
        return urlImage
      })
    )
    return result
  }

  async handleUploadVideo(req: Request) {
    const files = await handleUploadVideo(req)
    const result = await Promise.all(
      files.map(async (file) => {
        const urlVideo: Media = {
          url: `http://localhost:3000/static/video/${file.newFilename}`,
          type: MediaType.Video
        }
        return urlVideo
      })
    )
    return result
  }
}
const mediaService = new MediaService()
export default mediaService
