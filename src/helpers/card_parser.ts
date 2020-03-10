import {AppConfig, HeaderHelper, headerHelper} from "../config/parser_config";
import {UploadProcessorResult} from "../upload_processors/csv_processor";

export interface ParsedCard {
    name: string,
    expansion: string,
    acquire_date: string,
    acquire_price: string,
    set_code: string,
    set?: string,
    condition: string,
    language: string,
    foil: boolean,
    errors?: string[],
    quantity: string,
    extra_details: {
        [index: string]: string
    }
}

export interface parsingStatus {
    [index: string]: number | undefined;

    expansion?: number | undefined;
    set_code: number;
    acquire_date?: number | undefined;
    price_acquired?: number | undefined;
    foil?: number | undefined;
    condition?: number | undefined;
    language?: number | undefined;
    quantity?: number | undefined;
    name: number;
}


export class CardParser {
    headers: parsingStatus = {name: -1, expansion: undefined, set_code: -1};
    cards: ParsedCard[] = [];
    parsingErrors: string[] = [];
    errors: { name: string, set_code: string }[] = [];
    headerHelper: HeaderHelper;
    readonly appConfig: AppConfig;

    constructor(appConfig: AppConfig) {
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
            language: 'EN',
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
            let setCode: string|undefined = this.appConfig.getCodeBySet(parsedCard['expansion']);
            if ( setCode ) {
                parsedCard['set_code'] = setCode;
            }
        }

        // This is a workaround to allow Set to match to expansion
        if (this.headers['set'] && (this.headers['set_code'] === -1 || this.headers['expansion'] === -1)) {
            let unknownValue: string | undefined = this.appConfig.getCodeBySet(details[this.headers['set']]);
            console.log(`Performing mysterSetWorkaround: ${unknownValue}`);
            if (unknownValue) {
                // They passed a full expac name
                parsedCard['set_code'] = unknownValue;
                parsedCard['expansion'] = details[this.headers['set']];
            } else {
                // They passed a set code as Set OR they passed an unknown set name
                if ( this.appConfig.setCodes.includes(details[this.headers['set']]) ) {
                    parsedCard['expansion'] = this.appConfig.getSetByCode(details[this.headers['set']]);
                    parsedCard['set_code'] = details[this.headers['set']];
                } else {
                    //TODO - Notify somewhere?
                    console.log(`WARN: Unknown Set passed: ${details[this.headers['set']]}`);
                }
            }
        }
        console.log(`Derived quantity value: ${this.determineFieldValue(this.headers.quantity, details, '1') }`);

        parsedCard['foil'] = this.booleanCheck( this.determineFieldValue(this.headers.foil, details, 'false') );
        parsedCard['quantity'] = this.determineFieldValue(this.headers.quantity, details, '1');
        parsedCard['condition'] = this.determineFieldValue(this.headers.condition, details, '');
        parsedCard['language'] = this.determineFieldValue(this.headers.language, details, '');
        parsedCard['acquire_date'] = this.determineFieldValue(this.headers.acquire_date, details, '');
        parsedCard['acquire_price'] = this.determineFieldValue(this.headers.price_acquired, details, '');

        console.log(`Parsed Card: ${JSON.stringify(parsedCard)}`);
        this.cards.push(parsedCard);
    }

    booleanCheck(value: string): boolean {
        return ['true', 'True', 'yes', 'Yes', 'Y', 'y'].indexOf(value) > -1;
    }

    /**
     * This method is used to check for the presence of a defined header column and set the value using that index, else return a default value
     * @param test
     * @param values
     * @param defaultValue
     */
    determineFieldValue(test: number | undefined, values: string[], defaultValue: string): string {
        if ( typeof(test) === 'undefined' ) {
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
                let fixedHeader: string[] = this.coerceHeaders(checkRow.join(','));
                console.log(`Final Coerced HEaders: ${fixedHeader}`);
                this.validateHeaders(fixedHeader);
                if (this.parsingErrors.length <= 0) {
                    this.parseRowsWithHeader(fixedHeader, inputRows);
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
                // We need to check for near matches
                this.parsingErrors.push(`Missing Required Header: ${val}`);
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
            if (this.appConfig.headers.indexOf(header.toLowerCase()) != -1) {
                this.headers[header.toLowerCase()] = index;
            }
        });

        // We set these from derived values so we always have them no matter in the input format
        let quantityIndexHeader: number = -1;
        if ( typeof(this.headers.quantity) === 'undefined' ) {
            quantityIndexHeader = headerRow.length;
            this.headers.quantity = quantityIndexHeader;
            headerRow.push('quantity');
        } else {
            quantityIndexHeader = this.headers.quantity;
        }

        let foilIndexHeader: number = -1;
        if ( typeof(this.headers.foil) === 'undefined' ) {
            foilIndexHeader = headerRow.length;
            this.headers.foil = foilIndexHeader;
            headerRow.push('foil');
        }

        data.forEach((row: string[]) => {
            if ( row != [] ) {
                // Extract this logic back into the delver lens at some point
                let foilQuantity: number = Number(row[headerRow.indexOf('foil_quantity')]);
                let isFoil: boolean = false;
                if ( foilQuantity > 0 ) {
                    // There might be normal cards and foil cards
                    if ( Number(row[quantityIndexHeader]) > 0 ) {
                        let newCard: string[] = [...row];
                        newCard.push(String(isFoil));
                        this.parseSingleCard(newCard, headerRow);
                    }
                    isFoil = true;
                    row[quantityIndexHeader] = foilQuantity.toString();
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
     * @param cb
     */
    parseCards(cb: (err: Error | undefined, data: UploadProcessorResult) => void): void {
        let cardsToDelete: ParsedCard[] = [];
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
                    return;
                } else {
                    cardsToDelete.push(card);
                }
            }
        });
        cardsToDelete.map(this.deleteCard.bind(this));

        cb(undefined, this.parseResults());
    }

    /**
     * Convert headers from things to close to the allowed, to the allowed
     * @param headerRow
     */
    coerceHeaders(headerRow: string | undefined): string[] {
        let headers: string[] = [];
        if (headerRow) {
            headerRow.split(',').forEach((header: string) => {
                let newHeader: string | undefined = this.headerHelper.isValidHeader(header);
                if (newHeader) {
                    headers.push(newHeader);
                } else {
                    headers.push(header);
                }
            });
        }
        return headers
    }

}