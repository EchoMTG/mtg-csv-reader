import * as csvParse from "csv-parse"
import * as fileUpload from "express-fileupload";
import * as fs from "fs";
import {snake} from "change-case";
import {AppConfig} from "../util/definitions";


interface ParsedCard {
    [index: string]: string | boolean
}

interface parsingStatus {
    [index: string]: number | undefined;
    expansion?: number | undefined;
    set_code?: number | undefined;
    acquire_date?: number | undefined;
    acquire_price?: number | undefined;
    foil?: number | undefined;
    condition?: number | undefined;
    language?: number | undefined;
    name?: number | undefined;
}
export type CsvProcessorResult = {
    errors: string[];
    cards: ParsedCard[];
    headers: parsingStatus
}

export class CsvProcessor {
    headers: parsingStatus = {name: undefined, expansion: undefined, set_code: undefined};
    cards: ParsedCard[] = [];
    errors: string[] = [];
    mappedFields: { [index: string]: string}
    readonly appConfig: AppConfig;

    constructor(config: AppConfig) {
        this.appConfig = config;
        this.mappedFields = {
            supportedNameHeaders: 'name',
            supportedDateHeaders: 'acquired_date',
            supportedPriceHeaders: 'acquired_price',
            supportedConditionHeaders: 'condition',
            supportedSetHeaders: 'expansion',
            supportedSetCodeHeaders: 'set_code'
        };
    }

    /**
     * Get a list of valid mime/types. This function exists as future proofing in case with ingest XML/JSON from other vendors
     * @param type
     */
    isSupportedMimeType(type: string) {
        return this.appConfig.supportedMimeTypes.includes(type);
    }

    generateResults(): CsvProcessorResult {
        return {
            errors: this.errors, headers: this.headers, cards: this.cards
        }
    }

    /**
     * Process a single CSV upload.
     * @param file
     * @param cb
     */
    processCsv(file: fileUpload.UploadedFile, cb: (err: Error | undefined, data: CsvProcessorResult) => void): void {
        let tmpfilename = new Date().getTime() + '-file.csv';
        let tmpfilepath = 'tmp/' + tmpfilename;

        file.mv(tmpfilepath, (err) => {
            if (err) {
                // There is a good chance this is a server rror
                this.errors.push(err.msg);
                cb(err, this.generateResults());
            }

            const results: string[][] = [];

            fs.createReadStream(tmpfilepath)
                .pipe(csvParse())
                .on('error', (err: Error) => {
                    // if teh data is an invalid CSV, this will throw an error here
                    this.errors.push(err.message);
                    cb(err, this.generateResults());
                })
                .on('data', (data: string[]) => {
                    //Clean teh data
                    let cleanData: string[] = data.map((value: string) => {
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
                        this.parseRawRows(results);
                        cb(undefined, this.generateResults());
                    }
                });
        });
    }

    /**
     * Loop through the given list of strings to see if ANY of them exist in the list of Supported Headers
     * @param inputData
     */
    detectHeaderRow(inputData: string[]) {
        for (let i = 0; i < inputData.length; i++) {
            if (this.appConfig.headers.includes(snake(inputData[i]))) {
                return true
            }
        }
        console.log('No headers found');
        return false;
    }

    coerceHeaders( header: string, index: number): void {
        let bestHeader: string = this.findBestHeader(header);
        this.headers[bestHeader] = index;
    }

    findBestHeader(providedHeader: string): string {
        let bestHeader: string = providedHeader;
        Object.getOwnPropertyNames(this.appConfig).forEach((config: string) => {
           if ( config.startsWith('supported') ) {
               if ( Array.isArray(this.appConfig[config] ) ) {
                   let values = this.appConfig[config] as string[];
                   if ( values.includes(providedHeader.toUpperCase()) ) {
                       console.log(`Coerced Header: FROM ${providedHeader} TO ${this.mappedFields[config]}`);
                       bestHeader = this.mappedFields[config];
                   }
               }
           }
        });
        return bestHeader;
    }

    /**
     * Deterimine best method to use to parse results into cards
     * @param inputRows
     */
    parseRawRows(inputRows: string[][]): void {
        if (inputRows.length) {
            let hasHeader = this.detectHeaderRow(inputRows[0]);
            let headerRow: string[] | undefined = inputRows.shift();
            if (hasHeader && Array.isArray(headerRow)) {
                headerRow.forEach((value: string, index:number) => {
                   this.coerceHeaders(value, index);
                });
                this.parseRowsWithHeader(headerRow, inputRows);
            } else {
                this.parseRowsWithoutHeader(inputRows);
            }
        }
    }

    parseSingleCard(details: string[]): ParsedCard {
        let parsedCard: ParsedCard = {};

        // Require AT LEAST Name AND ( Set | set_code )
        if ((this.headers.name === undefined) || (this.headers.expansion === undefined && this.headers.set_code === undefined)) {
            console.log("Faile to parse a name AND a set/set_code from the card. Skipping");
            // Throw an error because I couldn't parse this card
            throw new Error(`Unable to parse card: ${details}`);

        } else {
            parsedCard['name'] = details[this.headers.name];
            parsedCard['expansion'] = (this.headers.expansion ? details[this.headers.expansion] : '');
            parsedCard['set_code'] = (this.headers.set_code ? details[this.headers.set_code] : '');
        }

        parsedCard['foil'] = (!!this.headers.foil);
        parsedCard['condition'] = (this.headers.condition ? details[this.headers.condition] : '');
        parsedCard['language'] = (this.headers.language ? details[this.headers.language] : 'EN');
        parsedCard['acquire_date'] = (this.headers.acquire_date ? details[this.headers.acquire_date] : '');
        parsedCard['acquire_price'] = (this.headers.acquire_price ? details[this.headers.acquire_price] : '');

        return parsedCard;
    }

    /**
     * This method allows us to support parsing a CSV that doesn't have headers ( even though thats not a CSV )
     *  - Step 1: Try to glean what the headers are from the first row
     *  - Step 1a. For each column in the first row, check it against a known set of conditions:
     *          - set: List of every set. Downloaded from mtgsets.json
     *          - set_code: List of every set code. Downloaded from mtgsets.json
     *          - condition: List of supported conditions hardcoded in src/util/definitions
     *          - language: List of supported languages OTHERWISE 'EN'
     *          - foil: ENUM['True','true','Yes','yes'] OTHERWISE false
     *          - acquire_date: Regex defined in src/util/definitions
     *          - acquire_price: Regex defined in src/util/definitions
     *          - name: Anything else *This is the fallback
     * @param inputRows
     */
    parseRowsWithoutHeader(inputRows: string[][]): void {
        // We were unable to detect a standard header row.
        // Lets try best effort data mapping
        // TODO - Should we throw away the first row because its probably headers we missed
        // Without headers, were only going to require name/set
        let sampleData: string[] | undefined = inputRows[0];
        if (sampleData) {
            // We have values we can check.
            // This could use some cleaning, but it works
            /**
             * Take the first row of data and try to glean headers from that row.
             * I need to be able to guess the Card Name and the Set/Code for it to be valuable
             */
            this.bestEffortDataMap(sampleData);

            inputRows.forEach((row: string[]) => {

                let blankValueCount: number = row.map((v: string) => {
                    return v === ''
                }).length;
                if (blankValueCount) {
                    this.bestEffortDataMap(row);
                }

                let parsedCard = this.parseSingleCard(row);
                this.cards.push(parsedCard);
            });
        }
    }

    /**
     * This is our bread and butter parsing method. It will parse rows based on predefined headers
     * @param headerRow: string[] - A list of column names
     * @param data: string[][] - A list of lists each of whom contain the values for each column representing a single card
     */
    parseRowsWithHeader(headerRow: string[], data: string[][]): void {
        data.forEach((row: string[]) => {
            let parsedCard: ParsedCard = {
                foil: false,
                language: 'EN',
                acquired_price: '',
                acquired_date: '',
                expansion: '',
                set_code: '',
                condition: ''
            };
            // row.forEach((field: string, index: number) => {
            //     // todo - remove assert
            //     // parsedCard[headerRow[index]] = field;
            //     // Require AT LEAST Name AND ( Set | set_code )
            //     let p
            // });
            parsedCard = this.parseSingleCard(row);
            this.cards.push(parsedCard);
        });
    }

    /**
     * This function is used to try and build an object that will map a FieldName to a ColumnNumber
     * @param data
     */
    bestEffortDataMap(data: string[]): void {
        data.forEach((value: string, index: number) => {
            if (value === '') {
                return;
            }
            if (value.match(this.appConfig.dateAcqRegex)) {
                this.headers.acquire_date = index;
            } else if (value.match(this.appConfig.priceAcqRegex)) {
                this.headers.acquire_price = index;
            } else if (value.match(this.appConfig.foilRegex)) {
                this.headers.foil = index;
            } else if (this.appConfig.validConditions.includes(value)) {
                this.headers.condition = index;
            } else if (this.appConfig.setCodes.includes(value)) {
                this.headers.set_code = index;
            } else if (this.appConfig.supportedLanguages.includes(value)) {
                this.headers.language = index;
            } else {
                if (this.appConfig.setNames.includes(value) ) {
                    this.headers.expansion = index;
                } else {
                    this.headers.name = index;
                }
            }
        });
    }
}







