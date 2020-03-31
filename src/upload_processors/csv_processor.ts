import * as csvParse from "csv-parse"
import * as fileUpload from "express-fileupload";
import * as fs from "fs";
import {AppConfig} from "../config/parser_config"
import {BestEffortCardParser} from "../card_parsers/card_parser";
import {CardParserDecision, ParsedCard, parsingStatus, knownHeaderFormats} from "../card_parsers";

export type UploadProcessorResult = {
    errors: { name: string, set_code: string }[];
    cards: ParsedCard[];
    headers: parsingStatus
    parsingErrors: string[]
}

export interface UploadProcessor {
    isSupportedMimeType(type: string): boolean;

    processUpload(file: fileUpload.UploadedFile, cb: (err: Error | undefined, data: UploadProcessorResult) => void): void
}

export class BasicCsvProcessor implements UploadProcessor {
    parsingConfig: AppConfig;
    supportedMimeTypes: string[];
    knownUploadHeaders: knownHeaderFormats = {
        'tcg_player_app_ios': {
            headers: ['quantity', 'name', 'set code', 'printing', 'language'],
            parser: new BestEffortCardParser(this.parsingConfig)
        },
        'delver_lens': {
            headers: ['reg qty', 'foil qty', 'name', 'set', 'acquired', 'Language'],
            parser: new BestEffortCardParser(this.parsingConfig)
        }
    };

    constructor(config: AppConfig) {
        this.parsingConfig = config;
        this.supportedMimeTypes = ['text/csv'];
    }

    /**
     * use the list of known CSV uploads to determine how best to parse the cards.
     * @param headers
     * @constructor
     */
    DetermineCardParser(headers: string[]): Promise<CardParserDecision> {
        return new Promise<CardParserDecision>((resolve, reject) => {
            const sources: string[] = Object.keys(this.knownUploadHeaders);
            for( const source of sources) {
                if ( this.headerCheck(headers, this.knownUploadHeaders[source].headers) ) {
                    console.log("Matched a known upload format: " + source);
                    return resolve({
                        headers: headers, cardParser: this.knownUploadHeaders[source].parser
                    })
                }
            }
            console.log("Failing back to best effort card parsing");
            return resolve({
                headers: headers, cardParser: new BestEffortCardParser(this.parsingConfig)
            })
        });
    }

    /**
     * Get a list of valid mime/types. This function exists as future proofing in case with ingest XML/JSON from other vendors
     * @param type
     */
    isSupportedMimeType(type: string) {
        return this.supportedMimeTypes.includes(type);
    }

    headerCheck(arr: string[], target:string[]) {
        return target.every(v => arr.includes(v))
    }

    /**
     * Process a single CSV upload.
     * @param file
     * @param cb
     */
    processUpload(file: fileUpload.UploadedFile, cb: (err: Error | undefined, data: UploadProcessorResult) => void): void {
        const tmpfilename = new Date().getTime() + '-file.csv';
        const tmpfilepath = '/tmp/' + tmpfilename;

        const parsingResult: UploadProcessorResult = {
            errors: [],
            cards: [],
            parsingErrors: [],
            headers: {name: -1, set_code: -1}
        };

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
                        return value
                            .replace(/^'/, '')
                            .replace(/'$/, '')
                            .trim();
                    });
                    results.push(cleanData);
                })
                .on('end', () => {
                    if (results.length > 0) {
                        const headers = ([] as string[]).concat(...results.splice(0, 1)).map((v) => v.toLowerCase());
                        this.DetermineCardParser(headers).then((meta: CardParserDecision) => {
                            results.unshift(headers);
                            meta.cardParser.parseRawRows(results);
                            if (parsingResult.parsingErrors.length > 0) {
                                return cb(new Error(""), parsingResult);
                            }
                            meta.cardParser.validateParsedCards(cb);
                        });
                    } else {
                        cb(undefined, parsingResult);
                    }
                });
        });
    }
}







