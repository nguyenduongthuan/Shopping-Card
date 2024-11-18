//import các interface build-in của express để mô tả
import e, { Request, Response, NextFunction } from 'express'
import { checkSchema, ParamSchema } from 'express-validator'
import { JsonWebTokenError, VerifyErrors } from 'jsonwebtoken'
import { capitalize } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { verifyToken } from '~/utils/jwt'
import { validate } from '~/utils/validation'
import dotenv from 'dotenv'
import { REGEX_USERNAME } from '~/constants/regex'
dotenv.config()
//midleware là handler giúp kiểm tra dữ liệu mà người dùng truyền lên
//có đủ và đúng như nhu câu định dạng ko ?
const passwordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USERS_MESSAGES.PASSWORD_IS_REQUIRED
  },
  isString: {
    errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_A_STRING
  },
  trim: true,
  isLength: {
    options: {
      min: 8,
      max: 50
    },
    errorMessage: USERS_MESSAGES.PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50
  },
  isStrongPassword: {
    options: {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    },
    errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRONG
  }
}
const confirmPasswordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED
  },
  isString: {
    errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_A_STRING
  },
  trim: true,
  isLength: {
    options: {
      min: 8,
      max: 50
    },
    errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50
  },
  isStrongPassword: {
    options: {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    },
    errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_STRONG
  },
  custom: {
    options: (value, { req }) => {
      //value lúc này là confirm_password
      if (value !== req.body.password) {
        throw new Error(USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_THE_SAME_AS_PASSWORD)
        //throw new Error trong chekcSchema là lỗi bình thường, có status 422
      }
      return true
    }
  }
}

const forgotPasswordTokenSchema: ParamSchema = {
  trim: true,
  notEmpty: {
    errorMessage: USERS_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_REQUIRED
  },
  custom: {
    options: async (value: string, { req }) => {
      //value này là forgot_password_token nên chỉ cần xác thực chữ ký
      try {
        //nếu có forgot_password_token mình verify(xác thực chữ ký)
        const decode_forgot_password_token = await verifyToken({
          token: value,
          privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string
        })
        //cất vào req
        //decode_forgot_password_token là payload của forgot_password_token đã mã hóa
        //bên trong đó có user_id và token_type
        ;(req as Request).decode_forgot_password_token = decode_forgot_password_token
      } catch (error) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.UNAUTHORIZED, //401
          message: (error as JsonWebTokenError).message
        })
      }
      //nếu oke hết
      return true //phiên kiểm tra này đã thành công
    }
  }
}
const nameSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USERS_MESSAGES.NAME_IS_REQUIRED
  },
  isString: {
    errorMessage: USERS_MESSAGES.NAME_MUST_BE_A_STRING
  },
  trim: true,
  isLength: {
    options: {
      min: 1,
      max: 100
    },
    errorMessage: USERS_MESSAGES.NAME_LENGTH_MUST_BE_FROM_1_TO_100
  }
}
const dateOfBirthSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USERS_MESSAGES.DATE_OF_BIRTH_BE_ISO8601
  },
  isISO8601: {
    options: {
      strict: true,
      strictSeparator: true
    }
  }
}
const imageSchema: ParamSchema = {
  optional: true,
  isString: {
    errorMessage: USERS_MESSAGES.IMAGE_URL_MUST_BE_A_STRING ////messages.ts thêm IMAGE_URL_MUST_BE_A_STRING: 'Image url must be a string'
  },
  trim: true, //nên đặt trim dưới này thay vì ở đầu
  isLength: {
    options: {
      min: 1,
      max: 400
    },
    errorMessage: USERS_MESSAGES.IMAGE_URL_LENGTH_MUST_BE_LESS_THAN_400 //messages.ts thêm IMAGE_URL_LENGTH_MUST_BE_LESS_THAN_400: 'Image url length must be less than 400'
  }
}
//PARAMSCHEMA
//viết hàm kiểm tra req.body của chức năng login
export const loginValidator = validate(
  checkSchema(
    {
      email: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
        },
        trim: true
      },
      password: {
        ...passwordSchema,
        isStrongPassword: undefined,
        isLength: undefined
      }
    },
    ['body']
  )
)

//viết hàm kiểm tra req.body của chức năng register
export const registerValidator = validate(
  checkSchema(
    {
      //chỗ này là runablevalidationChain nên nó cần phải run
      name: nameSchema,
      email: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
        },
        trim: true
      },
      password: passwordSchema,
      confirm_password: confirmPasswordSchema,
      date_of_birth: dateOfBirthSchema
    },
    ['body']
  )
)

//viết hàm kiểm tra access_token
export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED
        },
        custom: {
          options: async (value, { req }) => {
            //value này 'Bearer <access_token>'
            const access_token = value.split(' ')[1]
            if (!access_token) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED, //401
                message: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED
              })
            }
            try {
              //nếu có access-token mình verify(xác thực chữ ký-kiểm tra chữ ký có đúng là mình tạo ra không)
              //verifyToken là  hàm kiểm tra 1 token có đúng với chữ ký hay không
              //nếu đúng thì trả về payload đang có trong token đó
              const decode_authorization = await verifyToken({
                token: access_token,
                privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
              })
              //decode_authorization là payload của access_token đã mã hóa
              //bên trong đó có user_id và token_type
              ;(req as Request).decode_authorization = decode_authorization
              //nhét decode_authorization vào req để dùng ở các middleware khác
            } catch (error) {
              //hàm verifyToken sẽ throw error nếu chữ ký không đúng
              //và error này ở trong checkSchema nên nó sẽ có status 422
              //nhưng mà mình biết khi sai chữ ký thì nó đang tấn công vào hệ thống
              //nên mình sẽ try catch lại nó để trả về status 401
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED, //401
                message: capitalize((error as JsonWebTokenError).message)
                //capitalize là hàm viết hoa chữ cái đầu của chuỗi
                //JsonWebTokenError là một trong các lỗi mà jwt.verify trả về
              })
            }
            //nếu oke hết
            return true
          }
        }
      }
    },
    ['headers']
  )
)

//viết hàm kiểm tra refresh_token

export const refreshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.REFRESH_TOKEN_IS_REQUIRED
        },
        custom: {
          options: async (value, { req }) => {
            //value này là refresh_token
            try {
              //nếu có refresh_token mình verify(xác thực chữ ký)
              const decode_refresh_token = await verifyToken({
                token: value,
                privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string
              })
              //decode_refresh_token là payload của refresh_token đã mã hóa
              //bên trong đó có user_id và token_type
              ;(req as Request).decode_refresh_token = decode_refresh_token
              //mặc dù mình đã định nghĩa lại Request nhưng vẫn phải ép kiểu vì typescript không hiểu
              //; để ngắt dòng code tránh hiểu lầm currying
            } catch (error) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED, //401
                message: capitalize((error as JsonWebTokenError).message)
              })
            }
            //nếu oke hết
            return true
          }
        }
      }
    },
    ['body']
  )
)

//viết hàm kiểm tra email_verify_token
export const emailVerifyTokenValidator = validate(
  checkSchema(
    {
      email_verify_token: {
        trim: true,
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_VERIFY_TOKEN_IS_REQUIRED
        },
        custom: {
          options: async (value: string, { req }) => {
            //value này là email_verify_token
            try {
              //nếu có email_verify_token mình verify(xác thực chữ ký)
              const decode_email_verify_token = await verifyToken({
                token: value,
                privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
              })
              //decode_email_verify_token là payload của email_verify_token đã mã hóa
              //bên trong đó có user_id và token_type
              ;(req as Request).decode_email_verify_token = decode_email_verify_token
            } catch (error) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED, //401
                message: (error as JsonWebTokenError).message
              })
            }
            //nếu oke hết
            return true
          }
        }
      }
    },
    ['query']
  )
)

export const forgotPasswordValidator = validate(
  checkSchema(
    {
      email: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
        },
        trim: true
      }
    },
    ['body']
  )
)

export const forgotPasswordTokenValidator = validate(
  checkSchema(
    {
      forgot_password_token: forgotPasswordTokenSchema
    },
    ['body']
  )
)

export const resetPasswordValidator = validate(
  checkSchema(
    {
      password: passwordSchema,
      confirm_password: confirmPasswordSchema
    },
    ['body']
  )
)

export const updateMeValidator = validate(
  checkSchema(
    {
      name: {
        optional: true, //đc phép có hoặc k
        ...nameSchema, //phân rã nameSchema ra
        notEmpty: undefined //ghi đè lên notEmpty của nameSchema
      },
      date_of_birth: {
        optional: true, //đc phép có hoặc k
        ...dateOfBirthSchema, //phân rã nameSchema ra
        notEmpty: undefined //ghi đè lên notEmpty của nameSchema
      },
      bio: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.BIO_MUST_BE_A_STRING ////messages.ts thêm BIO_MUST_BE_A_STRING: 'Bio must be a string'
        },
        trim: true, //trim phát đặt cuối, nếu k thì nó sẽ lỗi validatior
        isLength: {
          options: {
            min: 1,
            max: 200
          },
          errorMessage: USERS_MESSAGES.BIO_LENGTH_MUST_BE_LESS_THAN_200 //messages.ts thêm BIO_LENGTH_MUST_BE_LESS_THAN_200: 'Bio length must be less than 200'
        }
      },
      //giống bio
      location: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.LOCATION_MUST_BE_A_STRING ////messages.ts thêm LOCATION_MUST_BE_A_STRING: 'Location must be a string'
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 200
          },
          errorMessage: USERS_MESSAGES.LOCATION_LENGTH_MUST_BE_LESS_THAN_200 //messages.ts thêm LOCATION_LENGTH_MUST_BE_LESS_THAN_200: 'Location length must be less than 200'
        }
      },
      //giống location
      website: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.WEBSITE_MUST_BE_A_STRING ////messages.ts thêm WEBSITE_MUST_BE_A_STRING: 'Website must be a string'
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 200
          },

          errorMessage: USERS_MESSAGES.WEBSITE_LENGTH_MUST_BE_LESS_THAN_200 //messages.ts thêm WEBSITE_LENGTH_MUST_BE_LESS_THAN_200: 'Website length must be less than 200'
        }
      },
      username: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.USERNAME_MUST_BE_A_STRING ////messages.ts thêm USERNAME_MUST_BE_A_STRING: 'Username must be a string'
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 50
          },
          errorMessage: USERS_MESSAGES.USERNAME_LENGTH_MUST_BE_LESS_THAN_50 //messages.ts thêm USERNAME_LENGTH_MUST_BE_LESS_THAN_50: 'Username length must be less than 50'
        },
        custom: {
          options: async (value, { req }) => {
            //value này là username
            //kiểm tra có khớp với regex không
            if (!REGEX_USERNAME.test(value)) {
              throw new Error(USERS_MESSAGES.USERNAME_IS_INVALID)
            }
            return true //kết thúc phiên kiểm tra
          }
        }
      },
      avatar: imageSchema,
      cover_photo: imageSchema
    },
    ['body']
  )
)

export const changePasswordValidator = validate(
  checkSchema(
    {
      old_password: {
        ...passwordSchema,
        isStrongPassword: undefined,
        isLength: undefined
      },
      password: passwordSchema,
      confirm_password: confirmPasswordSchema
    },
    ['body']
  )
)
