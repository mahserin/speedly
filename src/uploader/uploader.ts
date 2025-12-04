import path from "path"
import fs from "fs"
import multer from 'multer'
import mongoose from "mongoose";
import getConfig from "../util/getConfig";
let configs: {
  saveInDb: boolean;
  prefix: string;
  limit: number;
  format: RegExp;
  path : string
  [key: string]: any;
} = {
  saveInDb: false,
  prefix: "",
  limit: 5,
  format: /png|jpg|webp|jpeg/i,
  path : '../../../public',
  ...getConfig("uploader")
};
import { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      mediaId?: any;
    }
  }
}


export default (destination : string | ((req : Request ,file : Express.Multer.File) => string) = "/image", config = configs) => {
  let dest : string
  try {
    Object.entries(config).forEach(([key, val]) => {
      configs[key] = val;
    });

    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        try {
           dest = typeof destination === "function"
            ? destination(req, file)
            : destination;

          const splitPath = dest.split("/");
          let currentPath = path.join(configs.path);

          splitPath.forEach(folder => {
            currentPath = path.join(currentPath, folder);
            if (!fs.existsSync(currentPath)) {
              fs.mkdirSync(currentPath);
            }
          });

          cb(null, path.join( configs.path, dest));
        } catch (err :unknown) {
          cb(err as Error, "");
        }
      },

      filename: function (req, file, cb) {
        try {
          const ext = path.extname(file.originalname);
          if (!ext.slice(1).match(configs.format)) {
            return cb(new Error("File format not acceptable") , '');
          }

          const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
          const fileName = (configs.prefix ? configs.prefix + "-" : "") +
            originalName.replace(/\.\w+$/, "") + ext;
          const filePath = path.join(configs.path, dest, fileName);
try {
  fs.existsSync(filePath)
} catch (error) {

  
}
          if (fs.existsSync(filePath)) {
            return cb(new Error("File already exists in the destination folder") , '');
          }

          cb(null, fileName);
        } catch (err) {
          cb(err as Error , '');
        }
      },
    });

    const uploader = multer({
      storage,
      limits: { fileSize: (configs.limit || 5) * 1024 * 1024 }, // MB
    });

    return {
      single: (fieldName : string) => (req:Request, res :Response, next : NextFunction) => {
        uploader.single(fieldName)(req, res, async (err) => {
          if (err) {
            console.log( 'uploader' , 85 , err);
            return next({status:405 , json: { message: err.message }})
          }
          if (req.file) {
            if (configs.saveInDb) {
              const db = mongoose.connection;
              const collection = db.collection("media");
              const duplicate = await collection.findOne({ alt: req.body.alt });

              if (duplicate) {
                fs.rmSync(req.file.path);
                return res.status(405).json({ message: "alt is repetitive" });
              }

              const mediaDoc = await collection.insertOne({
                type: req.file.mimetype.split("/")[0],
                name: req.file.filename,
                dirPath: dest + "/",
                alt: req.body.alt,
                desc: req.body.desc,
                url: "/static/" + dest + "/" + req.file.filename,
              });
            
              req.mediaId = mediaDoc.insertedId;
            }

            req.body[fieldName] = path
              .join("/static", path.relative(path.join(configs.path), req.file.path))
              .replaceAll(/\\/g, "/");
          }

          next();
        });
      },

      array: (fieldName : string, maxCount = Infinity) => (req : Request, res :Response, next :NextFunction) => {
        uploader.array(fieldName, maxCount)(req, res, (err) => {
          if (err) return res.status(405).json({ message: err.message });

          if (req.files && Array.isArray(req.files) && req.files.length) {
            req.body[fieldName] = (req.files as Express.Multer.File[]).map(file =>
              path
                .join("/static", path.relative(path.join(configs.path), file.path))
                .replaceAll(/\\/g, "/")
            );
          }

          
          next();
        });
      },

      fields: (fields : multer.Field[]) => (req:Request, res:Response, next:NextFunction) => {
        uploader.fields(fields)(req, res, (err) => {
          if (err) return res.status(405).json({ message: err.message });
          next();
        });
      },

      any: () => (req:Request, res:Response, next:NextFunction) => {
        uploader.any()(req, res, (err) => {
          if (err) return res.status(405).json({ message: err.message });
          next();
        });
      },

      none: () => (req:Request, res:Response, next:NextFunction) => {
        uploader.none()(req, res, (err) => {
          if (err) return res.status(405).json({ message: err.message });
          next();
        });
      },
    };
  } catch (error) {
    console.log("uploader init error", error);
  }
};
