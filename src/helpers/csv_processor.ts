import * as csvParse from "csv-parse"
import * as fileUpload from "express-fileupload";
import * as fs from "fs";
import {AppConfig} from "../util/definitions";
import {EchoClient, EchoResponse} from "./echo_client";
import {CardParser, ParsedCard, parsingStatus} from "./card_parser";

export type CsvProcessorResult = {
    errors: ParsedCard[];
    cards: ParsedCard[];
    headers: parsingStatus
}

export class CsvProcessor {
    cards: ParsedCard[] = [];
    errors: ParsedCard[] = [];
    mappedFields: { [index: string]: string };
    cardParser: CardParser;
    supportedMimeTypes: string[];

    constructor(config: AppConfig) {
        this.cardParser = new CardParser(config);
        this.supportedMimeTypes = config.supportedMimeTypes;
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
        return this.supportedMimeTypes.includes(type);
    }

    generateResults(): CsvProcessorResult {
        return {
            errors: this.errors, headers: this.cardParser.headers, cards: this.cards
        }
    }

    /**
     * Process a single CSV upload.
     * @param file
     * @param cb
     */
    processCsv(file: fileUpload.UploadedFile, cb: (err: Error | undefined, data: CsvProcessorResult) => void): void {
        const tmpfilename = new Date().getTime() + '-file.csv';
        const tmpfilepath = '/tmp/' + tmpfilename;

        file.mv(tmpfilepath, (err) => {
            if (err) {
                console.log("Error in move");
                console.log(err);
                // There is a good chance this is a server rror
                this.errors.push(err);
                cb(err, this.generateResults());
            }

            const results: string[][] = [];

            fs.createReadStream(tmpfilepath)
                .pipe(csvParse())
                .on('error', (innerErr: Error) => {
                    // if teh data is an invalid CSV, this will throw an error here
                    // this.errors.push(innerErr.message);
                    cb(err, this.generateResults());
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
                        // Parse the results
                        this.parseRawRows(results);
                        // Query the EchoApi to check for its existance
                        const echo: EchoClient = new EchoClient(1, 1);

                        echo.queryBatch(this.generateResults().cards)
                            .then(this.handleEchoResults.bind(this))
                            .catch((rErr: Error ) => {
                               // There was a rejection. Since echo seems to always return 200 assuming its up
                               cb(err, this.generateResults());
                            })
                            .finally(() => cb(undefined, this.generateResults()));
                    } else {
                        cb(undefined, this.generateResults());
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
    handleEchoResults(echoResults: EchoResponse[]): void {
        console.log("All requests returned");
        echoResults.forEach((res: EchoResponse) => {
            if (res.status === "success") {
                if (res.match) {
                    // We found a result. Lets see if any updates need to be made to teh card before we finally give up on parsing the card.
                    if ( res.card.errors ) {
                        this.cardParser.updateCardFromEchoResults(res.card, res.match);
                    }
                    res.card.extra_details['echo_id'] = res.match['id'];
                }
            }  else {
                if ( res.card.errors ) {
                    this.errors.push(res.card);
                    const index: number = this.cards.indexOf(res.card, 0);
                    if ( index > -1 ) {
                        this.cards.splice(index,1);
                    }
                }
            }
        });
    }

    /**
     * Loop through the given list of strings to see if ANY of them exist in the list of Supported Headers
     * @param inputData: string[]
     */
    detectHeaderRow(inputData: string[]) {
        for (const row of inputData) {
            if (this.cardParser.isHeader(row)) {
                return true
            }
        }
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
            this.cardParser.headers[bestHeader] = index;
        }
    }

    /**
     * Try to find the best header for a provided header.
     * @param providedHeader: string - User provided header
     * @return bestHEader: string - The best header we could determine for the provided header
     */
    findBestHeader(providedHeader: string): string | undefined {
        let bestHeader: string | undefined = undefined;
        Object.getOwnPropertyNames(this.cardParser.appConfig).forEach((config: string) => {
            if (config.startsWith('supported')) {
                if (Array.isArray(this.cardParser.appConfig[config])) {
                    const values = this.cardParser.appConfig[config] as string[];
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

                const parsedCard = this.cardParser.parseSingleCard(row);


                if (parsedCard) {
                    this.cards.push(parsedCard);
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
            const parsedCard = this.cardParser.parseSingleCard(row, headerRow);
            if (parsedCard) {
                this.cards.push(parsedCard);
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
            if (value.match(this.cardParser.appConfig.dateAcqRegex)) {
                this.cardParser.headers.acquire_date = index;
            } else if (value.match(this.cardParser.appConfig.priceAcqRegex)) {
                this.cardParser.headers.acquire_price = index;
            } else if (value.match(this.cardParser.appConfig.foilRegex)) {
                this.cardParser.headers.foil = index;
            } else if (this.cardParser.appConfig.validConditions.includes(value)) {
                this.cardParser.headers.condition = index;
            } else if (this.cardParser.appConfig.setCodes.includes(value)) {
                this.cardParser.headers.set_code = index;
            } else if (this.cardParser.appConfig.supportedLanguages.includes(value)) {
                this.cardParser.headers.language = index;
            } else {
                if (this.cardParser.appConfig.setNames.includes(value)) {
                    this.cardParser.headers.expansion = index;
                } else {
                    // We only want to detect card name once because it is the map of last resort
                    if (this.cardParser.headers.name === undefined) {
                        this.cardParser.headers.name = index;
                    }
                }
            }
        });
    }
}







