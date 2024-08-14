import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const UserSchema = new Schema(
    {
        userName: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: { type: String, required: true, trim: true, index: true },

        avatar: {
            type: String, //message:cloudinary url
            // required: true,
        },
        coverImage: {
            type: String, //message:cloudinary url
        },
        watchHistory: [{ type: Schema.Types.ObjectId, ref: "Video" }],
        password: { type: String, required: [true, "Password is required"] },
        refreshToken: {
            type: String,
        },
    },
    { timestamps: true }
);

//this code runs before saving data to data base(pre->middleware)
UserSchema.pre("save", async function (next) {
    //hashing takes time
    // this will contain all the data from user that he is going to save into the databasse
    if (!this.isModified("password")) return next(); //if password field of the user  not modified

    this.password = await bcrypt.hash(this.password, 10); //password of the user
    next();
});

UserSchema.methods.isPasswordCorrect = async function (password) {
    // compares password with the password we send into this method wth the password in this model
    const compare = await bcrypt.compare(password, this.password); //returns true or false

    return compare;
};

UserSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        //method to generate jsonwebtoken
        {
            _id: this.id,
            email: this.email,
            username: this.userName,
            fullName: this.fullName,
        },
        process.env.ACESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACESS_TOKEN_EXPIRY,
        }
    );
};
UserSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        //method to generate jsonwebtoken
        {
            _id: this.id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};
export const User = mongoose.model("user", UserSchema);
