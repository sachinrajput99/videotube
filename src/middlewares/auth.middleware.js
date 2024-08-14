import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        // if token not present
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        // decoded token(using jwt built-in method very)
        const decodedToken = jwt.verify(token, process.env.ACESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );
        // if user is not present
        if (!user) {
            return ApiError(401, "Unauthorized request");
        }
        // setting user on req to user so we can access users property while login out
        req.user = user;
        next();
        
    } catch (error) {
        return ApiError(401, error?.message || "Invalid Access Token");
    }
});

export { verifyJWT };
