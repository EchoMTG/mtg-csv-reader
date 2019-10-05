import * as fileUpload from "express-fileupload";

declare global {
    namespace Express {
        interface Request {
            files?: fileUpload.FileArray;
            rawBody: Buffer;
        }
    }
}

declare module 'express-fileupload' {

    interface fileOptions {
        name: string,
        buffer: Buffer,
        size: number,
        encoding: string,
        tempFilePath: string,
        md5: string,
        mimetype: string,
        truncated: boolean
    }

    function fileFactory (options: fileOptions, fileUploadOptions: fileUpload.Options): fileUpload.UploadedFile;
}