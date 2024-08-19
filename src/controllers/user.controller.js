import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiErrors.js";
import jwt from "jsonwebtoken";
import mongoose  from "mongoose";


//generates Access and refresh token
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
//register a  new user
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
//login  anew user
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
//logout her user( deleting refresh token from user) and clearing cookie
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1, // this removes the field from document
            },
        },
        {
            new: true,
        }
    );
    /*
    await User.findByIdAndUpdate(
        //logout the user ,as we are setting refresh token to undefine
        req.user._id,
        {
            $set: { refreshToken: undefined },
        },
        {
            new: true,
        }
    );*/

    const options = { secure: true, httpOnly: true };

    res.status(200)
        .clearCookie("accessToken", options) //clearing the cookie to logout the user
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out Successfully"));
});
//
const refreshAccessToken = asyncHandler(async (req, res) => {
    // for web || (and )for phone
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;//refresh token from user
    //if incomingRefreshToken is not prest
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(//verifies the refresh token using refresh access tokens secret
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const id = decodedToken?._id;

        const user = await User.findById(id);
        console.log("user", user);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }
        if (incomingRefreshToken !== user?.refreshToken) {//if incoming refresh token si not in the users database then throw the error
            throw new ApiError(401, "Refresh token is expired or used");
        }
        const options = {
            httpOnly: true,
            secure: true,
        };
        //generating new access and refresh token
        const { accessToken, newRefreshAccessToken } =
            generateAccessTokenAndRefreshToken(user._id);
//sending the token in response
        return res
            .status(200)
            .cookie(accessToken, options)
            .cookie(newRefreshAccessToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshAccessToken },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    //retrieving  old and new password from user,s req body
    const { oldPassword, newPassword } = req.body;
    //getting user based on id as( to make req to this route user must be login(as we have applied verifyJWT middleware))
    const user = await User.findById(req.user?._id);
    // is PasswordCorrect returns a boolean (after comparing the password)
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword);
    // return error if password is not correct
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }
    //set user password to new password
    user.password = newPassword;
    // saving the user info in database
    await user.save({ validateBeforeSave: false });
    // returning the response
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password save successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    // retrieving fullname  and email from req for update as we are  already login in
    //    tip=>male separate api end point for file upload
    const { fullName, email } = req.body;
    // if fullname or email are not present
    if (!(fullName || email)) {
        throw new ApiError(400, "All fields are required");
    }
    // updating user
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { fullName, email } },
        { new: true } //update hone k baad ki information return hoti h
    ).select("-password");
    // returning response
    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated successfully")
        );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    // check for images,check for avatar
    const avatarLocalPath = req.file?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar File is missing");
    }

    // upload them to cloudinary,avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading Avatar");
    }

    const user =await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar image uploaded Successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    // check for images,check for avatar
    const coverImageLocalPath = req.file?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "coverImage File is missing");
    }

    // upload them to cloudinary,avatar
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);//returns array containing information about the image

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading Avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { coverImage: coverImage.url } },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image uploaded Successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { userName } = req.params; //channel ka nam coming from url params
    if (!userName) throw new ApiError(400, "username is missing");

    const channel = await User.aggregate([
        {
            $match: {
                //match users in the database
                userName: userName?.toLowerCase(),
            },
        },
        {//look up is used to join the document  as we join tables in sql
            $lookup: {
                from: "subscriptions", //l0ok up to is similar to joins in sql
                localField: "_id", //primary key in sql
                foreignField: "channel", //foreign key in sql
                as: "subscribers", //returns the subscribers field as array or object 
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {//project or send only these value in project 
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            },
        },
    ]);
    if (!channel?.length) {
        throw new ApiError(404, "channels does not exists");
    }
    res.status(200).json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id), //we get array of object consisting of our user
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory", //we get joined videos details in a field (watch history[array of object]) [where id in watch history of user === id in videos in => (videos model)]
                pipeline: [
                    //for each object in watch history
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner", //for every  video in watch history {video ke owner ki id === users ki _id } then join them  an put tem in owner :[array of {object}]
                            pipeline: [
                                //for every owner return these value
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};
