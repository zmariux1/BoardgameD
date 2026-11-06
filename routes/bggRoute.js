const express = require("express");
const bggRoute = express();
const session = require("express-session");

const dotenv = require("dotenv").config();
bggRoute.use(session( {secret: process.env.SESSION_SECRET} ));

const auth = require("../controllers/user/auth");

bggRoute.set("view engine", "ejs");
bggRoute.set("views", "./views");

const bodyParser = require("body-parser");
bggRoute.use(bodyParser.json());
bggRoute.use(bodyParser.urlencoded({extended:true}));


const bggController = require("../controllers/bggController");
bggRoute.get("/test",bggController.getBGG); 



module.exports = bggRoute;