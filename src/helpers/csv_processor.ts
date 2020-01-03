import * as csvParse from "csv-parse"
import * as fileUpload from "express-fileupload";
import * as fs from "fs";
import {AppConfig} from "../util/definitions";
import {EchoClient, EchoResponse, EchoResponseMatch} from "./echo_client";
import {CardParser, ParsedCard, parsingStatus} from "./card_parser";

export type CsvProcessorResult = {
    errors: {name: string, set_code:string}[] ;
    cards: ParsedCard[];
    headers: parsingStatus
    parsingErrors: string[]
}

export class CsvProcessor {
    cardParser: CardParser;
    supportedMimeTypes: string[];

    constructor(config: AppConfig) {
        this.cardParser = new CardParser(config);
        this.supportedMimeTypes = config.supportedMimeTypes;
    }

    /**
     * Get a list of valid mime/types. This function exists as future proofing in case with ingest XML/JSON from other vendors
     * @param type
     */
    isSupportedMimeType(type: string) {
        return this.supportedMimeTypes.includes(type);
    }

    /**
     * Process a single CSV upload.
     * @param file
     * @param cb
     */
    processCsv(file: fileUpload.UploadedFile, cb: (err: Error | undefined, data: CsvProcessorResult) => void): void {
        const tmpfilename = new Date().getTime() + '-file.csv';
        const tmpfilepath = '/tmp/' + tmpfilename;

        let parsingResult: CsvProcessorResult = {errors:[], cards:[], parsingErrors:[], headers: {name:-1, set_code:-1}};

        file.mv(tmpfilepath, (err) => {
            if (err) {
                console.log("Error in move");
                console.log(err);
                // There is a good chance this is a server rror
                parsingResult.parsingErrors.push(err);
                cb(err, parsingResult);
            }

            const results: string[][] = [];

            fs.createReadStream(tmpfilepath)
                .pipe(csvParse())
                .on('error', (innerErr: Error) => {
                    // if teh data is an invalid CSV, this will throw an error here
                    // this.errors.push(innerErr.message);
                    console.log("Error loading file");
                    parsingResult.parsingErrors.push(innerErr.message);
                    cb(err, parsingResult);
                })
                .on('data', (data: string[]) => {
                    const cleanData: string[] = data.map((value: string) => {
                        value = value
                            .replace(/^'/, '')
                            .replace(/'$/, '')
                            .trim();

                        return value;
                    });
                    results.push(cleanData);
                })
                .on('end', () => {
                    if (results.length > 0) {
                        // Parse the results into MTG Card Objects
                        this.cardParser.parseRawRows(results);

                        if (process.env.SKIP_ECHO) {
                            return cb(undefined, parsingResult);
                        }

                        if ( parsingResult.parsingErrors.length > 0 ) {
                            return cb(new Error(""), parsingResult);
                        }

                        //Validate those objects against the ECHO API
                        this.cardParser.parseCards(cb);
                    } else {
                        cb(undefined, parsingResult);
                    }
                });
        });
    }

}







