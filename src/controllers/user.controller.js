import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// get user details from frontend
// check if user already exists: username,email
// check for images,check for avatar
// upload them to cloudinary,avatar
// create user object - create entry in db
// remove password and refresh token field from resources
// return response

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    const { email, fullName, userName, password } = req.body;
    console.log(email);
    // validation-not empty
    if (
        [fullName, email, userName, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // check if user already exists: username,email
    const existedUser = await User.findOne({
        $or: [{ userName }, { email }], //email and username already exist(dono ko check krega)
    });
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // check for images,check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files?.coverImage) &&
        req.files?.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // console.log(req.files);
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar field is required");
    }

    // upload them to cloudinary,avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase(),
    });

    // remove password and refresh token field from resources
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // check for user creation
    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    // return response
    return res
        .status(200)
        .json(
            new ApiResponse(200, createdUser, "User registered Successfully")
        );
});

export { registerUser };
