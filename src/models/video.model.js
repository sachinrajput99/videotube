import Mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const VideoSchema = new Schema(
  {
    videoFile: {
      type: String, //cloudinary url
      require: true,
    },
    thumbnail: {
      type: String, //cloudinary url
      require: true,
    },
    title: {
      type: String,
      require: true,
    },
    description: {
      type: String, 
      require: true,
    },
    duration: {
      type: Number, //comes from cloudinary
      require: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Number,
      default: true,
    },
    owner:{
        type :Schema.Types.ObjectID,
        ref:"User"
    },
  },
  { timestamps: true }
);
VideoSchema.plugin(mongooseAggregatePaginate);

export const Video = Mongoose.model("Video", VideoSchema);
