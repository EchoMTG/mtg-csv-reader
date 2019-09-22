import * as csvParse from "csv-parse"
import * as fileUpload from "express-fileupload";
import * as fs from "fs";
import {snake} from "change-case";
import {HEADERS} from "../util/definitions";

export class CsvProcessor {

    static SUPPORTED_MIME_TYPES: string[] = [
        'text/csv'
    ];

    static isSupportedMimeType(type: string) {
        return CsvProcessor.SUPPORTED_MIME_TYPES.includes(type);
    }

    static processCsv(file: fileUpload.UploadedFile, cb: (data: {}[]) => void): {} {
        var tmpfilename = new Date().getTime() + '-file.csv';
        var tmpfilepath = 'tmp/' + tmpfilename;

        file.mv(tmpfilepath, function(err) {
            if (err) {
                return { 'ERROR': err }
            }

            const results: string[][] = [];

            return fs.createReadStream(tmpfilepath)
                .pipe(csvParse())
                .on('data', (data: string[]) => results.push(data))
                .on('end', () => {
                    if (results.length > 0 ) {
                        let parsedData: {}[] = parseRawRows(results);
                        cb(parsedData)
                    }
                });
        });

        return {};
    }
}
function detectHeaderRow(inputData: string[]) {
    inputData.forEach((value:string, index: number, array: string[] ) => {
        if ( HEADERS.includes(snake(value))) {
            return true
        }
    });
    return false;
}

type ParsedCard = {
    [index: string]: string
}

function parseRawRows(inputRows: string[][] ): {}[] {
    if ( inputRows.length ) {
        let parsedData: {}[] = [];
        let hasHeader = detectHeaderRow(inputRows[0]);
        let headerRow: string[] | undefined = inputRows.shift();
        if (hasHeader) {
            inputRows.forEach((row: string[]) => {
                // Todo - make this a "ParseCardObject"
                let parsedCard: ParsedCard = {};
                row.forEach((field: string, index: number) => {
                    // todo - remove assert
                   parsedCard[field] = headerRow![index];
                });
                parsedData.push(parsedCard);
            });
        }
        return parsedData;
    } else {
        return []
    }

}