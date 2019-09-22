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
                .on('data', (data: string[]) =>  {
                    //Clean teh data
                    let cleanData: string[] = data.map((value: string) => {
                        value = value.replace(/^\'/, '');
                        value = value.replace(/\'$/, '');
                        return value;
                    });
                    results.push(cleanData);
                })
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
    for( let i =0; i < inputData.length; i++ ) {
        console.log(`Matching ${snake(inputData[i])}`);
        if ( HEADERS.includes(snake(inputData[i]))) {
            return true
        }
    }
    console.log('No headers found');
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
        } else {
            // We were unable to detect a standard header row.
            // Lets try best effort data mapping
            // TODO - Should we throw away the first row because its probably headers we missed

        }
        return parsedData;
    } else {
        return []
    }

}