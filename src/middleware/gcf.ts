import {Request,Response,NextFunction} from "express";
import * as Busboy from "busboy";
import * as os from "os";
import * as contentType from "content-type";
import * as getRawBody from "raw-body";
import * as path from "path";
import * as fs from "fs";
const fileUpload = require("express-fileupload");

interface RawBodyRequest {
    rawBody: string;
}

type rawBodyRequest = Request & RawBodyRequest;

let buildFileUploades =  (req: Request, res: Response, next: NextFunction) => {
    if(req.rawBody === undefined && req.method === 'POST' && req.headers['content-type'] && req.headers['content-type'].startsWith('multipart/form-data')){
        console.log('getting the raw body for some reason');
        getRawBody(req, {
            length: req.headers['content-length'],
            limit: '10mb',
            encoding: contentType.parse(req).parameters.charset
        }, function(err, string: Buffer){
            if (err)  {
                console.log("Got an error");
                return next(err);
            }
            req.rawBody = string;
            next();
        })
    } else {
        return next();
    }
};

let mimicUpload = (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'POST' && req.headers['content-type'] && req.headers['content-type'].startsWith('multipart/form-data')) {
        const busboy = new Busboy({ headers: req.headers });

        req.files = {
            csvFile: []
        };

        busboy.on('field', (fieldname, value) => {
            req.body[fieldname] = value
        });

        busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
            const tmpdir = os.tmpdir();
            const filepath = path.join(tmpdir, filename);
            let fileBuffer = fs.createWriteStream(filepath);
            let fileSize = 0;

            file.on('data', (data) => {
                fileBuffer.write(data);
                fileSize += data.length;
            });

            file.on('end', () => {
                fileBuffer.end();
                const file_object = fileUpload.fileFactory({
                    name: filename,
                    encoding: encoding,
                    mimetype: mimetype,
                    buffer: Buffer.concat([]),
                    size: fileSize,
                    truncated: false,
                    md5: '',
                    tempFilePath: filepath,
                }, {useTempFiles: true, createParentPath: true});

                if ( req.files ) {
                    if ( Array.isArray(req.files.csvFile) ) {
                        req.files.csvFile.push(file_object);
                    } else {
                        req.files.csvFile = file_object;
                    }
                }
                next();
            });
        });

        busboy.end(req.rawBody);
    } else {
        return next();
    }
};



export {buildFileUploades, mimicUpload}