import * as csvParse from "csv-parse"
import * as fileUpload from "express-fileupload";
import * as fs from "fs";
import {snake} from "change-case";
import {
    HEADERS,
    BE_REGEX,
    PARSED_SETS,
    VALID_CONDITIONS,
    SUPPORTED_LANGS,
    SUPPORTED_MIME_TYPES
} from "../util/definitions";


interface ParsedCard {
    [index: string]: string | boolean
}

interface parsingStatus {
    name: number | undefined;
    expansion?: number | undefined;
    set_code?: number | undefined;
    acquire_date?: number | undefined;
    acquire_price?: number | undefined;
    foil?: number | undefined;
    condition?: number | undefined;
    language?: number | undefined;
}

export class CsvProcessor {
    /**
     * Get a list of valid mime/types. This function exists as future proofing in case with ingest XML/JSON from other vendors
     * @param type
     */
    static isSupportedMimeType(type: string) {
        return SUPPORTED_MIME_TYPES.includes(type);
    }

    /**
     * Process a single CSV upload.
     * @param file
     * @param cb
     */
    static processCsv(file: fileUpload.UploadedFile, cb: (err: Error | undefined, data: {}[]) => void): void {
        let tmpfilename = new Date().getTime() + '-file.csv';
        let tmpfilepath = 'tmp/' + tmpfilename;

        file.mv(tmpfilepath, function (err) {
            if (err) {
                cb(err, []);
            }

            const results: string[][] = [];

            fs.createReadStream(tmpfilepath)
                .pipe(csvParse())
                .on('error', (err: Error) => {
                    // if teh data is an invalid CSV, this will throw an error here
                    cb(err, []);
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
                        let parsedData: {}[] = parseRawRows(results);
                        cb(undefined, parsedData);
                    }
                });
        });
    }
}

/**
 * Loop through the given list of strings to see if ANY of them exist in the list of Supported Headers
 * @param inputData
 */
function detectHeaderRow(inputData: string[]) {
    for (let i = 0; i < inputData.length; i++) {
        if (HEADERS.includes(snake(inputData[i]))) {
            return true
        }
    }
    console.log('No headers found');
    return false;
}


/**
 * Deterimine best method to use to parse results into cards
 * @param inputRows
 */
function parseRawRows(inputRows: string[][]): ParsedCard[] {
    if (inputRows.length) {
        let hasHeader = detectHeaderRow(inputRows[0]);
        let headerRow: string[] | undefined = inputRows.shift();
        if (hasHeader && Array.isArray(headerRow)) {
            return parseRowsWithHeader(headerRow, inputRows);
        } else {
            return parseRowsWithoutHeader(inputRows);
        }
    } else {
        return []
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
function parseRowsWithoutHeader(inputRows: string[][]): ParsedCard[] {
    // We were unable to detect a standard header row.
    // Lets try best effort data mapping
    // TODO - Should we throw away the first row because its probably headers we missed
    // Without headers, were only going to require name/set
    let parsedData: ParsedCard[] = [];
    let sampleData: string[] | undefined = inputRows[0];
    if (sampleData) {
        // We have values we can check.
        // This could use some cleaning, but it works
        /**
         * Take the first row of data and try to glean headers from that row.
         * I need to be able to guess the Card Name and the Set/Code for it to be valuable
         */
        let parsingStatus = bestEffortDataMap(sampleData);
        inputRows.forEach((row: string[]) => {
            let parsedCard: ParsedCard = {};
            let blankValueCount: number = row.map((v: string) => {
                return v === ''
            }).length;
            if (blankValueCount) {
                parsingStatus = bestEffortDataMap(row);
            }

            // Require AT LEAST Name AND ( Set | set_code )
            if ((parsingStatus.name === undefined) || (parsingStatus.expansion === undefined && parsingStatus.set_code === undefined)) {
                console.log("Faile to parse a name AND a set/set_code from the card. Skipping");
                return;

            } else {
                parsedCard['name'] = row[parsingStatus.name];
                parsedCard['expansion'] = (parsingStatus.expansion ? row[parsingStatus.expansion] : '');
                parsedCard['set_code'] = (parsingStatus.set_code ? row[parsingStatus.set_code] : '');
            }

            parsedCard['foil'] = (!!parsingStatus.foil);
            parsedCard['condition'] = (parsingStatus.condition ? row[parsingStatus.condition] : '');
            parsedCard['language'] = (parsingStatus.language ? row[parsingStatus.language] : 'EN');
            parsedCard['acquire_date'] = (parsingStatus.acquire_date ? row[parsingStatus.acquire_date] : '');
            parsedCard['acquire_price'] = (parsingStatus.acquire_price ? row[parsingStatus.acquire_price] : '');
            parsedData.push(parsedCard);
        });
    }
    return parsedData;
}

/**
 * This is our bread and butter parsing method. It will parse rows based on predefined headers
 * @param headerRow: string[] - A list of column names
 * @param data: string[][] - A list of lists each of whom contain the values for each column representing a single card
 */
function parseRowsWithHeader(headerRow: string[], data: string[][]): ParsedCard[] {
    let parsedData: ParsedCard[] = [];
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
        row.forEach((field: string, index: number) => {
            // todo - remove assert
            parsedCard[headerRow![index]] = field;
        });
        parsedData.push(parsedCard);
    });
    return parsedData;
}

/**
 * This function is used to try and build an object that will map a FieldName to a ColumnNumber
 * @param data
 */
function bestEffortDataMap(data: string[]): parsingStatus {
    let status: parsingStatus = {name: undefined, expansion: undefined, set_code: undefined};
    data.forEach((value: string, index: number) => {
        if (value === '') {
            return;
        }
        if (value.match(BE_REGEX.DATE_ACQ_REGEX)) {
            status.acquire_date = index;
        } else if (value.match(BE_REGEX.PRICE_ACQ_REGEX)) {
            status.acquire_price = index;
        } else if (value.match(BE_REGEX.FOIL_REGEX)) {
            status.foil = index;
        } else if (VALID_CONDITIONS.includes(value)) {
            status.condition = index;
        } else if (Object.getOwnPropertyNames(PARSED_SETS).includes(value)) {
            status.set_code = index;
        } else if (SUPPORTED_LANGS.includes(value)) {
            status.language = index;
        } else {
            // We might be on Card Name or Set Name
            let allSetNames: string[] = [];
            Object.getOwnPropertyNames(PARSED_SETS).forEach((value: string) => {
                allSetNames.push(PARSED_SETS[value]['name'])
            });

            if (allSetNames.indexOf(value) !== -1) {
                status.expansion = index;
            } else {
                status.name = index;
            }
        }
    });

    return status;
}