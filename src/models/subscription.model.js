import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId, //one who is subscribing
            ref: "user",
        },
        channel: {
            type: Schema.Types.ObjectId, //one to who "subscriber is scribing"
            ref: "user",
        },
    },
    { timestamps: true }
);

const Subscription = subscriptionSchema.model(
    "Subscription",
    subscriptionSchema
);
export { Subscription };
