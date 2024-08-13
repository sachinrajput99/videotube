import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.js";
const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", count: 1 }, //field ka naam react m bhi avatar hi hoga,maxcount=> upload k liye kitni files leni h
        { name: "coverImage", count: 1 },
    ]),
    registerUser
); // /api/v1/users/register (registerUser is the function that will be called at register route)
export default router;
