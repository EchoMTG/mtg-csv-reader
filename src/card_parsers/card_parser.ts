import {AppConfig} from "../config/parser_config";
import {UploadProcessorResult} from "../upload_processors/csv_processor";
import {headerHelper, HeaderHelper} from "../helpers/header_helper";
import {CardParser, ParsedCard, parsingStatus} from "./index";
import {coerceLanguage, validateCondition, validateLanguage} from "../helpers/value_coercer";


export class BestEffortCardParser implements CardParser{
    headers: parsingStatus = {name: -1, expansion: undefined, set_code: -1};
    cards: ParsedCard[] = [];
    parsingErrors: string[] = [];
    errors: { name: string, set_code: string }[] = [];
    headerHelper: HeaderHelper;
    readonly appConfig: AppConfig;

    constructor(appConfig: AppConfig) {
        console.log(`Running BestEffortCardParser using`, appConfig});
        this.appConfig = appConfig;
        this.headers = {name: -1, set_code: -1};
        this.headerHelper = headerHelper;
    }

    /**
     * Parse a single row into a card object
     * @param details: string[]
     * @param other_headers: string[] other details we can provide to a card
     */
    parseSingleCard(details: string[], other_headers?: string[]): void {
        const parsedCard: ParsedCard = {
            foil: false,
            language: 'en',
            acquire_date: '',
            acquire_price: '',
            expansion: '',
            set_code: '',
            condition: '',
            name: '',
            quantity: '',
            extra_details: {}
        };

        console.log(`Parsing card: ${details}`);

        //TODO - Add some functions to include extra passed in columns
        if (this.appConfig.includeUnknownFields && other_headers) {
            const columnsAlreadySet = Object.values(this.headers);
            other_headers.forEach((header: string, index: number) => {
                if (columnsAlreadySet.indexOf(index) === -1) {
                    // Check if maybe its a weird spelling of another field
                    let matchedHeader: string | undefined = this.headerHelper.isValidHeader(header);
                    if (matchedHeader) {
                        this.headers[matchedHeader] = index;
                    } else {                                                                                                                                                      
                        parsedCard.extra_details[other_headers[index]] = details[index];
                    }
                }
            });
        }


        // Set the requried fields
        parsedCard['name'] = details[this.headers.name];
        parsedCard['set_code'] = details[this.headers.set_code];
        console.log('parsed card object',parsedCard);
        
        // Product ID, tcgplayer_id, tcgid, 
        // set number, collector id, card number

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

        if (parsedCard['set_code'] && !parsedCard['expansion']) {
            parsedCard['expansion'] = this.appConfig.getSetByCode(parsedCard['set_code']);
        }

        if (parsedCard['expansion'] && !parsedCard['set_code']) {
            let setCode: string | undefined = this.appConfig.getCodeBySet(parsedCard['expansion']);
            if (setCode) {
                parsedCard['set_code'] = setCode;
            }
        }

        // This is a workaround to allow Set to match to expansion
        if (this.headers['set'] && (this.headers['set_code'] === -1 || this.headers['expansion'] === -1)) {
            const unknownValue: string | undefined = this.appConfig.getCodeBySet(details[this.headers['set']]);
            console.log(`Performing mysterSetWorkaround: ${JSON.stringify(unknownValue)} ${details[this.headers['set']]}`);

            
            if (unknownValue) {
                // They passed a full expac name
                parsedCard['set_code'] = unknownValue;
                parsedCard['expansion'] = details[this.headers['set']];
            } else {
                // They passed a set code as Set OR they passed an unknown set name
                if (this.appConfig.setCodes.includes(details[this.headers['set']])) {
                    parsedCard['expansion'] = this.appConfig.getSetByCode(details[this.headers['set']]);
                    parsedCard['set_code'] = details[this.headers['set']];
                } else {
                    //TODO - Notify somewhere?
                    console.log(`WARN: Unknown Set passed: ${details[this.headers['set']]}`);
                }
            }
        }

        // if (this.headers.condition) {
        //     parsedCard.extra_details['original_condition'] = details[this.headers.condition];
        //     details[this.headers.condition] = this.coerceCondition(details[this.headers.condition])
        // }


        parsedCard['foil'] = this.booleanCheck(this.determineFieldValue(this.headers.foil, details, 'false'));
        parsedCard['quantity'] = this.determineFieldValue(this.headers.quantity, details, '1');
        parsedCard['condition'] = this.determineFieldValue(this.headers.condition, details, '');
        parsedCard['language'] = this.determineFieldValue(this.headers.language, details, '');
        parsedCard['acquire_date'] = this.determineFieldValue(this.headers.date_acquired, details, '');
        parsedCard['acquire_price'] = this.determineFieldValue(this.headers.price_acquired, details, '');

        this.cards.push(parsedCard);
    }

    /**
     * Convert a wordy condition into a code
     * @param originalCondition
     */
    coerceCondition(originalCondition: string): string {
        let newCondition: string = originalCondition;
        if (originalCondition.split(' ').length > 1) {
            newCondition = '';
            originalCondition.split(' ').forEach((word: string) => {
                newCondition += word[0].toLowerCase();
            });
            return newCondition;
        } else {
            if (originalCondition.length > 2) {
                return originalCondition[0].toLowerCase();
            } else {
                return originalCondition;
            }
        }
    }

    /**
     * Return a boolean from a common list of things that might mean true
     * @param value
     */
    booleanCheck(value: string): boolean {
        return ['true', 'yes', 'y', 'foil'].indexOf(value.toLowerCase()) > -1;
    }

    /**
     * This method is used to check for the presence of a defined header column and set the value using that index, else return a default value
     * @param test
     * @param values
     * @param defaultValue
     */
    determineFieldValue(test: number | undefined, values: string[], defaultValue: string): string {
        if (typeof (test) === 'undefined') {
            return defaultValue;
        } else {
            return values[test];
        }
    }


    /**
     * Deterimine best method to use to parse results into cards
     * @param inputRows
     */
    parseRawRows(inputRows: string[][]): void {
        if (inputRows.length) {
            const headerRow: string[] | undefined = inputRows.shift();
            if (Array.isArray(headerRow)) {
                const checkRow: string[] = headerRow.map(val => val.toLowerCase());
                const fixedHeaders: string[] = this.coerceHeaders(checkRow.join(','));
                this.validateHeaders(fixedHeaders);
                if (this.parsingErrors.length <= 0) {
                    this.parseRowsWithHeader(fixedHeaders, inputRows);
                }
            }
        }
    }

    /**
     * Determine if required headers were passed
     * @param headers
     */
    validateHeaders(headers: string[]) {
        ['name', 'set'].map((val: string) => {
            if (headers.indexOf(val) === -1) {
                // Note:
                // This bit of code is here to support passing ONLY set_code, as thats how TCGPlayer does it
                if (val === 'set' && headers.indexOf('set_code') !== -1) {
                    this.headers[val] = headers.indexOf(val);
                } else {
                    this.parsingErrors.push(`Missing Required Header: ${val}`);
                }
            } else {
                this.headers[val] = headers.indexOf(val);
            }
        });
    }


    /**
     * This is our bread and butter parsing method. It will parse rows based on predefined headers
     * @param headerRow: string[] - A list of column names
     * @param data: string[][] - A list of lists each of whom contain the values for each column representing a single card
     */
    parseRowsWithHeader(headerRow: string[], data: string[][]): void {
        headerRow.forEach((header: string, index: number) => {
            // Create the headers object by creating an object of key(header name) = value (header position )
            if (this.appConfig.headers.indexOf(header.toLowerCase()) !== -1) {
                this.headers[header.toLowerCase()] = index;
            }
        });

        // We set these from derived values so we always have them no matter in the input format
        // Note:
        // This block of code says
        // - If we don't have an explicit quantity header
        // - Add a quanity header to the end of both the headerRow and the headersObjects by fetching the maxLength
        let quantityIndexHeader: number = -1;
        let boolDefaultQuantity: boolean = false;
        if (typeof (this.headers.quantity) === 'undefined') {
            quantityIndexHeader = headerRow.length;
            this.headers.quantity = quantityIndexHeader;
            headerRow.push('quantity');
            boolDefaultQuantity = true;
        } else {
            quantityIndexHeader = this.headers.quantity;
        }

        // See above notes for this block, but replace quantity with foil
        let foilIndexHeader: number = -1;
        if (typeof (this.headers.foil) === 'undefined') {
            // We were unable to find a Foil header
            foilIndexHeader = headerRow.length;
            this.headers.foil = foilIndexHeader;
            headerRow.push('foil');
        }

        data.forEach((row: string[]) => {
            if (row !== []) {
                // Extract this logic back into the delver lens at some point
                if ( boolDefaultQuantity ) {
                    row.push('1');
                }
                const foilQuantity: number = Number(row[headerRow.indexOf('foil_quantity')]);
                let isFoil: boolean = false;
                if (foilQuantity > 0) {
                    // There might be normal cards and foil cards
                    if (Number(row[quantityIndexHeader]) > 0) {
                        const newCard: string[] = [...row];
                        newCard.push(String(isFoil));
                        this.parseSingleCard(newCard, headerRow);
                    }
                    isFoil = true;
                    row[quantityIndexHeader] = foilQuantity.toString();
                } else {
                    if (headerRow.indexOf('printing') > -1) {
                        // This is applying another TCGPlayer adjustment
                        const foilHeaderIndex = headerRow.indexOf('printing');
                        isFoil = this.parseFoilFromPrinting(row[foilHeaderIndex]);
                    }
                }
                row.push(String(isFoil));

                this.parseSingleCard(row, headerRow);
            }
        });
    }

    /**
     * Clean up error cards
     * @param card
     */
    deleteCard(card: ParsedCard) {
        this.errors.push(card);

        const index: number = this.cards.indexOf(card, 0);
        if (index > -1) {
            this.cards.splice(index, 1);
        }
    }

    /**
     * Return the real objec
     */
    parseResults(): UploadProcessorResult {
        return {
            errors: this.errors, parsingErrors: this.parsingErrors, headers: this.headers, cards: this.cards
        }
    }

    /**
     * Validate echo API dataset
     * - For each card
     * - If the card has no set_code, delete
     * - If the card has a set code, but that set doesn't exist in the echo cache, delete
     * - If the card has a valid set, but the card name doesn't exist in that set, delete it
     * @param cb
     */
    validateParsedCards(cb: (err: Error | undefined, data: UploadProcessorResult) => void): void {
        const cardsToDelete: ParsedCard[] = [];
        this.cards.forEach((card: ParsedCard) => {
            if (!card.set_code) {
                // This failed to parse. Ddelete it and return it as an error
                console.log(`Deleting card: ${card.name}, ${card.expansion}, ${card.set}, Reason: Missing Set Code`);
                cardsToDelete.push(card);
                return;
            }
            // Check if the card name and set exist in the cached data
            if (this.appConfig.cardCache[card.set_code.toLowerCase()]) {
                if (this.appConfig.cardCache[card.set_code.toLowerCase()][card.name.toLowerCase()]) {
                    card.extra_details['echo_id'] = this.appConfig.cardCache[card.set_code.toLowerCase()][card.name.toLowerCase()];
                    this.coerceOutputValues(card);
                    return;
                } else {
                    cardsToDelete.push(card);
                }
            } else {
                // The setcode is invalid
                cardsToDelete.push(card);
            }
        });
        cardsToDelete.map(this.deleteCard.bind(this));

        cb(undefined, this.parseResults());
    }

    /**
     * Bundle function to run all the planned output coercion
     * @param card
     */
    coerceOutputValues(card: ParsedCard): void {
        // Check for value coercions
        if ( card.language !== 'en' ) {
            // They passed in a value for language
            if ( card.language.length > 2 ) {
                // They passed in a long name
                card.language = coerceLanguage(card.language);
            } else {
                card.language = validateLanguage(card.language);
            }
        }

        if ( card.condition !== '' ) {
            card.condition = validateCondition(card.condition);
        }
    }

    /**
     * Convert headers from things to close to the allowed, to the allowed
     * @param headerRow
     */
    coerceHeaders(headerRow: string | undefined): string[] {
        const headers: string[] = [];
        if (headerRow) {
            headerRow.split(',').forEach((header: string) => {
                const newHeader: string | undefined = this.headerHelper.isValidHeader(header);
                if (newHeader) {
                    headers.push(newHeader);
                } else {
                    headers.push(header);
                }
            });
        }
        return headers
    }

    parseFoilFromPrinting(printing: string) {
        return printing.toLowerCase() === 'foil';

    }

}