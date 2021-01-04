//jshint esversion:6
require("dotenv").config();
const mysql = require("mysql");
const options = {
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASS,
    database: DB_NAME
};
const db = mysql.createConnection(options);
db.connect((err)=>{
    if (err) throw err;
    console.log("Database Connected...");
});
module.exports = db;