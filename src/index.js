import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import connectDB from "./db/index.js";
import { app } from "./app.js";

try {
  await connectDB();
  app.on("error", (error) => {
    console.log("ERROR");
    throw new error();
  });
  app.listen(process.env.PORT||3000, () => {
    console.log(`App is listening on port ${process.env.PORT}`);
  });
} catch (err) {
  console.log("MONGODB connection failed:", err);
  // throw new err();
}
