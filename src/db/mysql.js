const mysql = require("mysql");
const config = require("../../config/config.json");

const db = mysql.createConnection({
  host: config.MYSQL_HOST,
  user: config.MYSQL_USER,
  password: config.MYSQL_PASSWORD,
  database: config.MYSQL_DATABASE,
  port: config.MYSQL_DB_PORT,
});

db.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("my sql connected");
  }
});

module.exports = db;


