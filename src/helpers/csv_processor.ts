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

                        //Validate those objects against the ECHO API
                        this.cardParser.parseCards(parsingResult, cb);
                    } else {
                        cb(undefined, parsingResult);
                    }
                });
        });
    }

    /**
     * This method handles the results of all teh echo Queries.
     * - If the search was a success, set the echo_id on the extra_details of teh card object
     * - If the search was a success, and something is an error field, try to steal it from echo results
     * - - This is useful because echo will return a card even if you search only by name. This allows people to add lists taht ignore sets. Good for decks?
     * - If it was not a success, delete the parsed card, add it to the errors object
     * @param echoResults
     */
    // handleEchoResults(echoResults: EchoResponse[]): void {
    //     console.log("All requests returned");
    //     echoResults.forEach((res: EchoResponse) => {
    //         if (res.status === "success") {
    //             if (res.match) {
    //                 // We found a result. Lets see if any updates need to be made to teh card before we finally give up on parsing the card.
    //                 // if (res.card.errors) {
    //                 //     this.cardParser.updateCardFromEchoResults(res.card, res.match);
    //                 // }
    //                 if (res.match['set_code'] != res.card.set_code && res.all_matches) {
    //                     this.doubleCheck(res.card, res.all_matches);
    //                 } else {
    //                     res.card.extra_details['echo_id'] = res.match['id'];
    //                 }
    //
    //             }
    //         } else {
    //             this.deleteCard(res.card);
    //         }
    //     });
    // }

    // doubleCheck(card: ParsedCard, allMatches: EchoResponseMatch[]) {
    //     for( let i = 0; i++; i < allMatches.length ) {
    //         let match = allMatches[i];
    //         if ( card.set_code == match.set_code ) {
    //             console.log()
    //             card.extra_details['echo_id'] = match.id;
    //             break;
    //         }
    //     }
    //     this.deleteCard(card);
    // }
    //

}







