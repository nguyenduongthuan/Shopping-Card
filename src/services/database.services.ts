import { Collection, Db, MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import User from '~/models/schemas/User.schema'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
dotenv.config() //kích hoạt liên kết với .env
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@shoppingcardprojectclus.zr0rj.mongodb.net/?retryWrites=true&w=majority&appName=shoppingCardProjectCluster`

class DatabaseServices {
  private client: MongoClient
  private db: Db
  // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  constructor() {
    this.client = new MongoClient(uri)
    this.db = this.client.db(process.env.DB_NAME)
  }

  async connect() {
    try {
      // Send a ping to confirm a successful connection
      await this.db.command({ ping: 1 })
      console.log('Pinged your deployment. You successfully connected to MongoDB!')
    } catch (error) {
      console.log(error)
      throw error
    }
  }

  //lấy  một đối tượng collection user từ cơ sở dữ liệu hiện tại
  //Đối tượng này đại diện cho collection có tên là "users" trong cơ sở dữ liệu MongoDB
  //và cung cấp các phương thức để thao tác với dữ liệu bên trong collection.
  //không chứa sẵn dữ liệu của người dùng nó chỉ là đối tượng tham chiếu đến database
  //dùng để truy cập vào collection.
  //acccessor property
  get users(): Collection<User> {
    return this.db.collection(process.env.DB_USERS_COLLECTION as string)
  }

  get refresh_tokens(): Collection<RefreshToken> {
    return this.db.collection(process.env.DB_REFRESH_TOKENS_COLLECTION as string)
  }
}

//tạo instance của class DatabaseServices
const databaseServices = new DatabaseServices()
export default databaseServices
