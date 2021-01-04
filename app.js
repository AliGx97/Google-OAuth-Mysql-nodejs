//jshint esversion:6
require("dotenv").config();

const express = require("express");
const app = express();
//////////////////////////////////////db here is fully connected/////////////////////////
const db = require("./model/db"); 
const ejs = require("ejs");
const bodyParser = require("body-parser");
const session = require("express-session");
const MySqlStore = require("express-mysql-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

/////////////////////////////////Sessions table configurations//////////////////////////////////
const sessionStore = new MySqlStore({
    expiration: 86400000,
    autoReconnect: true,
    keepAlive: true,
    keepAliveInterval: 30000,
    createDatabaseTable: true
}, db);
//////////////////////////////////////// configuring and using sessions for req object//////////////////////////
app.use(session({
    store: sessionStore,
    name:"Cookie\'sName",
    secret: 'howYouDoinsir',
    resave: true,
    saveUninitialized: true,
    cookie:{
        maxAge:1000 * 60 * 10
    }
}));
///////////////////////////////My custom function to check the flow of app.use things//////////////////////////
app.use(function(req,res,next){
    console.log("/////////////////////////////////////LINE 35 AFTER Use SESSION/////////////////////////////////////////////////////////////\n",req.session);
    next(); //IMPORTANT!!!!!!
});

//////////////////////passport stuff , it'll be fired when passport.authenticate is fired/////////////////////////

// passport.use(new LocalStrategy({usernameField:"uname",passwordField:"pswd"},
//     function(username, password, done) {
//         console.log(("//////////////////////LINE 41 IN USE Passport//////////////////////////////////////////////////////////////////////\n")+username+"&&&&"+password);
//         db.query("SELECT * FROM users WHERE username = ?",username,function (err,results) { 
//             if (err) return done(err);
//             if (results.length === 0){
//                 console.log("user not found in using localstrategy");
//                 return done(null, false);
//             }
//             else{
//                 if (password === results[0].password){
//                     console.log("User authenticated");
//                     return done(null, results[0]);
//                 }
//                 else{
//                     console.log("User wasn't authenticated");
//                     return done(null, false);
//                 }
//             }
//          });
//     }
//   )
// );

//////////////////////chose what things to be stored in the session (like username here)/////////////////////////

passport.serializeUser(function(user, done){
    console.log("//////////////////////SERIALIZEd PASSPORT:///////////////////////////////////////////////////////////////////////////////\n "+JSON.stringify(user));
    done(null, {id:user.id,username:user.username}); //attached to the passport user object
    //user that's passed to seriali.. is the record object   WHILE
    // What we pass in done is how passport {user} object is gonna contain so in session we have:
    // passport:{
    //  user:{key:value, key:value} in this case it is the id and the username
    //}
    //and we can tap into that in deserializer using user.key;
});

//////////////////////used to attach user object to req (req.user) invoked by [passport.session()]

passport.deserializeUser(function(user, done){
    console.log(("//////////////////////LINE 67 IN DESERIA Passport////////////////////////////////////////////////////////////////////////////////////\nUsername is:  ")+JSON.stringify(user));
    db.query("SELECT * FROM users WHERE username = ?",user.username,function (err,results) { 
        if (err) return done(err);
         done(null, results[0]);
     });
});

//////////////////////////////////////////GOOGLE AUTH NEW CODE////////////////////////////////////////////////////////

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT,
    clientSecret: process.env.SECRET,
    callbackURL: "http://localhost:3000/auth/google/secret",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile,cb) {
        console.log("*******************************************************************************************");
        console.log(JSON.stringify(profile));
        console.log(JSON.stringify(accessToken));

    // User.findOrCreate({ googleId: profile.id }, function (err, user) {
    //   return cb(err, user);
    // });
    return cb(null, profile); ////I know it's wrong just to check for the console.log if it works  
  }
));


//////////////////////////////////////////last to be used ////////////////////////////////////////////////////////////

app.use(passport.initialize());
app.use(passport.session());

////////////////////////////////////////////GET Routes //////////////////////////////////////////////////
app.get('/', (req, res, next) => {
    res.render("index");
});

app.get('/auth/google',

  passport.authenticate('google', { scope: ['profile'] }));

app.get("/login", (req,res)=>{
    res.render("login");
});

app.get("/register", (req,res)=>{
    res.render("signup");
});

app.get("/not",(req,res,next)=>{
    res.send(`<h1>You Are Not Authenticated</h1>\
    <a href="/">HOME</a>`);
});

app.get("/secret", (req,res,done)=>{
    if (req.isAuthenticated()){
        res.render("secret");
    }
    else {
        res.redirect("/not");
    }
});
app.get("/hi",(req,res)=>{
    res.send("<h1>You Are Authenticated</h1>");
});
app.get("/auth/google/secret", (req,res)=>{
    passport.authenticate("google",{successRedirect:"/hi", failureRedirect:"/sercret"});
});

app.get("/logout", (req,res)=>{
    req.logout();
    res.redirect("/");
});
////////////////////////////////////////////POST Routes //////////////////////////////////////////////////

app.post("/login",passport.authenticate('local',{failureRedirect:"/login", successRedirect:"/secret"}), (err,req,res,next)=>{
    if (err) next(err);
});

app.post("/register", (req,res,next)=>{
    console.log("/////////////REGistering body object is:///////////////////////////////////////////////////////////////////////////////////////////\n"+req.body);
    db.query("SELECT * FROM users WHERE username = ?", req.body.uname, (err, results)=>{
        if (err) {
            console.log("Error in registering db SELECT query callback");
            throw err;
        }
        if (results.length > 0){
            console.log("Username is taken");
            res.redirect("/register");
        }
        else if (req.body.pswd !== req.body.cpswd){
            console.log("Password doesn't match confirmation");
            res.redirect("/register");
        }
        else{
            db.query("INSERT INTO users (username, password) VALUE(?,?);",[req.body.uname, req.body.pswd],(err,results)=>{
                if (err){
                    console.log("Error in registering db INSERT query");
                    throw err;
                }
                else{
                    console.log("INSERTED IN DB SUCCESSFULLY");
                    res.redirect("/login");
                }
            });
        }
    });
});

app.listen(3000, ()=>{
    console.log("Server Started on port 3000");
});