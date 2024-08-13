import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" })); //limit on json data that can be send  to server from form
app.use(express.urlencoded({ extended: true, limit: "16kb" })); //to retrieve data from url
app.use(express.static("public")); //save image and all in public folder so anyone can access
app.use(cookieParser()); //perform crud operation on cookies on browser of client

//route imports 
import userRouter from"./routes/user.routes.js"

//routes declaration
app.use("/api/v1/users",userRouter)//users is prefix


export { app };
