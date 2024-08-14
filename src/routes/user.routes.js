import { Router } from "express";
import { loginUser, registerUser ,logoutUser} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", count: 1 }, //field ka naam react m bhi avatar hi hoga,maxcount=> upload k liye kitni files leni h
        { name: "coverImage", count: 1 },
    ]),
    registerUser
); // /api/v1/users/register (registerUser is the function that will be called at register route)
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);

export default router;
