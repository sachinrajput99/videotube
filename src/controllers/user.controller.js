import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiErrors.js";

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findOne(userId);
        const accessToken = user.generateAccessToken(); //these expire in short period of time
        const refreshToken = user.generateRefreshToken(); //these expire in long period of time

        user.refreshToken = refreshToken;
        //    saving refresh token in database
        await user.save({ validateBeforeSave: false });

        return {
            accessToken,
            refreshToken,
        };

    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating refresh and access token"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // check if user already exists: username,email
    // check for images,check for avatar
    // upload them to cloudinary,avatar
    // create user object - create entry in db
    // remove password and refresh token field from resources
    // return response

    // get user details from frontend
    const { email, fullName, userName, password } = req.body;
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

const loginUser = asyncHandler(async (req, res) => {
    // re.body->data
    // username or email
    // find the user
    // password check
    //if password checked th generate access /refresh token
    // send access token in  cookie
    //send response

    // req.body->data
    const { email, userName, password } = req.body;

    // username or email
    if (!userName && !email) {
        throw new ApiError(400, "username or email is required");
    }
    // find the user
    const user = await User.findOne({
        $or: [{ userName }, { email }],
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }
    // password check
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }
    //if password checked th generate access /refresh token
    const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    // send access token in  cookie,with some options
    //cookie can only be manged from server ,so we cal login or logout user from server
    const options = {
        httpOnly: true,
        secure: true,
    };
    return res
        .status(200)
        .cookie("accessToken", accessToken, options) //res.cookie has been added by cookie-parser middleware
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    /* await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )*/
    await User.findByIdAndUpdate(
        //logout the user ,as we are setting refresh token to undefine
        req.user._id,
        {
            $set: { refreshToken: undefined },
        },
        {
            new: true,
        }
    );

    const options = { secure: true, httpOnly: true };
    res.status(200)
        .clearCookie("accessToken", options) //clearing the cookie to logout the user
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out Successfully"));
});

export { registerUser, loginUser, logoutUser };
