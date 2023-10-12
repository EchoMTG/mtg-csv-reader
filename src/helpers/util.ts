import {UploadedFile} from "express-fileupload";

export function generateFile(data: string): UploadedFile {

    return {
        name: '',
        encoding: '',
        mimetype: 'text/plain',
        data: Buffer.from(data),
        size: data.length,
        tempFilePath: '',
        truncated: false,
        md5: '',
        mv: (path:string) => {
            return new Promise<void>(() => { return });
        }
    }
}