import express from 'express'
import userRouter from './routes/users.routers'
import databaseServices from './services/database.services'
import { defaultErrorHandler } from './middlewares/errors.middlewares'
import mediaRouter from './routes/meadias.routers'
import { initFolder } from './utils/file'
import staticRouter from './routes/static.routers'

//dựng server
const app = express()
const PORT = 3000
databaseServices.connect() //kết nối database
initFolder() //tạo folder uploads
//tạo userRoute

//handler

//server dùng một middlewware biến đổi req từ dạng json sang dạng object
app.use(express.json())

app.use('/users', userRouter)
app.use('/medias', mediaRouter)
app.use('/static', staticRouter) //serving

// localhost:3000/users/get-me
app.use(defaultErrorHandler)
app.listen(PORT, () => {
  console.log(`Server BE đang chạy trên port ` + PORT)
})
