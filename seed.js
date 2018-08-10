require('dotenv').config();

var mongoHost = process.env.MONGO_HOST,
  mongoPort = process.env.MONGO_PORT,
  mongoDatabase = process.env.DATABASE_NAME,
  mongoUser = process.env.DATABASE_USER,
  mongoPassword = process.env.DATABASE_PASSWORD;

var mongoURL = 'mongodb://' + mongoUser + ':' + mongoPassword + '@' + mongoHost + ':' +  mongoPort + '/' + mongoDatabase

module.exports = {
  "undefined": mongoURL,
  "dev": mongoURL,
  "prod": mongoURL
}