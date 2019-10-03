import * as csvParse from "csv-parse"
import * as fileUpload from "express-fileupload";
import * as fs from "fs";
import {snake} from "change-case";
import {AppConfig} from "../util/definitions";
import {EchoClient, EchoResponse} from "./echo_client";


export interface ParsedCard {
    name: string,
    expansion: string,
    acquire_date: string,
    acquire_price: string,
    set_code: string,
    condition: string,
    language: string,
    foil: boolean,
    extra_details: {
        [index: string]: string
    }
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
    mappedFields: { [index: string]: string }
    readonly appConfig: AppConfig;

    constructor(config: AppConfig) {
        this.appConfig = config;
        this.mappedFields = {
            supportedNameHeaders: 'name',
            supportedDateHeaders: 'acquire_date',
            supportedPriceHeaders: 'acquire_price',
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
        const tmpfilename = new Date().getTime() + '-file.csv';
        const tmpfilepath = 'tmp/' + tmpfilename;

        console.log(process.cwd());

        file.mv(tmpfilepath, (err) => {
            if (err) {
                // There is a good chance this is a server rror
                this.errors.push(err.msg);
                cb(err, this.generateResults());
            }

            const results: string[][] = [];

            fs.createReadStream(tmpfilepath)
                .pipe(csvParse())
                .on('error', (innerErr: Error) => {
                    // if teh data is an invalid CSV, this will throw an error here
                    this.errors.push(innerErr.message);
                    cb(err, this.generateResults());
                })
                .on('data', (data: string[]) => {
                    //Clean teh data
                    const cleanData: string[] = data.map((value: string) => {
                        const clean = value
                            .replace(/^'/, '')
                            .replace(/'$/, '')
                            .trim();
                        return clean;
                    });
                    results.push(cleanData);
                })
                .on('end', () => {
                    if (results.length > 0) {
                        // Parse the results
                        this.parseRawRows(results);
                        // Query the EchoApi to check for its existance
                        const echo: EchoClient = new EchoClient(1, 1);

                        echo.queryBatch(this.generateResults().cards)
                            .then((echoResults: EchoResponse[]) => {
                                console.log("All requests returned");
                                echoResults.forEach((res: EchoResponse) => {
                                    console.log(res);
                                    if (res.status === "success") {
                                        if (res.match) {
                                            res.card.extra_details['echo_id'] = res.match['id'];
                                        }
                                    }
                                });
                                cb(undefined, this.generateResults());
                            })
                            .catch((rErr: Error ) => {
                               // There was a rejection. Since echo seems to always return 200 assuming its up
                               console.log(`Error querying Echo: ${rErr.message}`);
                               cb(err, this.generateResults());
                            });
                    }
                });
        });
    }

    /**
     * Loop through the given list of strings to see if ANY of them exist in the list of Supported Headers
     * @param inputData: string[]
     */
    detectHeaderRow(inputData: string[]) {
        for (const row of inputData) {
            if (this.appConfig.headers.includes(snake(row))) {
                return true
            }
        }
        console.log('No headers found');
        return false;
    }

    /**
     * Sets the best header to use for a given provided header
     * @param header: string
     * @param index: number
     */
    coerceHeaders(header: string, index: number): void {
        const bestHeader: string | undefined = this.findBestHeader(header);
        if (bestHeader) {
            this.headers[bestHeader] = index;
        }
    }

    /**
     * Try to find the best header for a provided header.
     * @param providedHeader: string - User provided header
     * @return bestHEader: string - The best header we could determine for the provided header
     */
    findBestHeader(providedHeader: string): string | undefined {
        let bestHeader: string | undefined = undefined;
        Object.getOwnPropertyNames(this.appConfig).forEach((config: string) => {
            if (config.startsWith('supported')) {
                if (Array.isArray(this.appConfig[config])) {
                    const values = this.appConfig[config] as string[];
                    if (values.includes(providedHeader.toUpperCase())) {
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
            const hasHeader = this.detectHeaderRow(inputRows[0]);
            const headerRow: string[] | undefined = inputRows.shift();
            if (hasHeader && Array.isArray(headerRow)) {
                headerRow.forEach((value: string, index: number) => {
                    this.coerceHeaders(value, index);
                });
                this.parseRowsWithHeader(headerRow, inputRows);
            } else {
                this.parseRowsWithoutHeader(inputRows);
            }
        }
    }

    /**
     * Parse a single row into a card object
     * @param details: string[]
     * @param other_headers: string[] other details we can provide to a card
     */
    parseSingleCard(details: string[], other_headers?: string[]): ParsedCard | undefined {
        const parsedCard: ParsedCard = {
            foil: false,
            language: 'EN',
            acquire_date: '',
            acquire_price: '',
            expansion: '',
            set_code: '',
            condition: '',
            name: '',
            extra_details: {}
        };

        // Require AT LEAST Name AND ( Set | set_code )
        if ((this.headers.name === undefined) || (this.headers.expansion === undefined && this.headers.set_code === undefined)) {
            return undefined
        } else {
            // Set the card name
            parsedCard['name'] = details[this.headers.name];
            if (this.headers.expansion) {
                // We may need move the expansion value to set_code
                if (this.appConfig.setCodes.includes(details[this.headers.expansion])) {
                    console.log('Coercing EXPANSION to SET_CODE');
                    parsedCard['set_code'] = details[this.headers.expansion];
                    parsedCard['expansion'] = this.appConfig.getSetByCode(parsedCard['set_code'])
                } else {
                    parsedCard['expansion'] = (this.headers.expansion ? details[this.headers.expansion] : '');
                    parsedCard['set_code'] = (this.headers.set_code ? details[this.headers.set_code] : '');
                }
            }

            if (parsedCard['expansion'] && !parsedCard['set_code']) {
                parsedCard['set_code'] = this.appConfig.getCodeBySet(parsedCard['expansion']);
            }
        }

        parsedCard['foil'] = (!!this.headers.foil);
        parsedCard['condition'] = (this.headers.condition ? details[this.headers.condition] : '');
        parsedCard['language'] = (this.headers.language ? details[this.headers.language] : 'EN');
        parsedCard['acquire_date'] = (this.headers.acquire_date ? details[this.headers.acquire_date] : '');
        parsedCard['acquire_price'] = (this.headers.acquire_price ? details[this.headers.acquire_price] : '');

        //TODO - Add some functions to include extra passed in columns
        if (this.appConfig.includeUnknownFields && other_headers) {

            const columnsAlreadySet = Object.values(this.headers);
            other_headers.forEach((header: string, index: number) => {
                if (columnsAlreadySet.indexOf(index) === -1) {
                    parsedCard.extra_details[other_headers[index]] = details[index];
                }
            });
        }

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
        const sampleData: string[] | undefined = inputRows[0];
        if (sampleData) {
            // We have values we can check.
            // This could use some cleaning, but it works
            /**
             * Take the first row of data and try to glean headers from that row.
             * I need to be able to guess the Card Name and the Set/Code for it to be valuable
             */
            this.bestEffortDataMap(sampleData);

            inputRows.forEach((row: string[], i: number) => {

                const blankValueCount: number = row.map((v: string) => {
                    return v === ''
                }).length;
                if (blankValueCount) {
                    this.bestEffortDataMap(row);
                }

                const parsedCard = this.parseSingleCard(row);
                if (parsedCard) {
                    this.cards.push(parsedCard);
                } else {
                    this.errors.push(`Unable to parse row: ${i}: ${row}`);
                }
            });
        }
    }

    /**
     * This is our bread and butter parsing method. It will parse rows based on predefined headers
     * @param headerRow: string[] - A list of column names
     * @param data: string[][] - A list of lists each of whom contain the values for each column representing a single card
     */
    parseRowsWithHeader(headerRow: string[], data: string[][]): void {
        data.forEach((row: string[], index: number) => {
            const parsedCard = this.parseSingleCard(row, headerRow);
            if (parsedCard) {
                this.cards.push(parsedCard);
            } else {
                this.errors.push(`Unable to parse row: ${index}: ${row}`)
            }
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
                if (this.appConfig.setNames.includes(value)) {
                    this.headers.expansion = index;
                } else {
                    // We only want to detect card name once because it is the map of last resort
                    if (this.headers.name === undefined) {
                        this.headers.name = index;
                    }
                }
            }
        });
    }
}







