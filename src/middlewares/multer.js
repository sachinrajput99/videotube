import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp"); //name of folder where we will store our files
  },

  filename: function (req, file, cb) {
    //request ->request k ander json data hoga + multer m hume file ka acess milta h jo normally express m nhi milta
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage: storage });
