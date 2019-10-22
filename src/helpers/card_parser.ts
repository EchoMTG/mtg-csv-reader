import {AppConfig} from "../util/definitions";
import {snake} from "change-case";
import {EchoResponse, EchoResponseMatch} from "./echo_client";

export interface ParsedCard {
    name: string,
    expansion: string,
    acquire_date: string,
    acquire_price: string,
    set_code: string,
    condition: string,
    language: string,
    foil: boolean,
    errors?: string[],
    extra_details: {
        [index: string]: string
    }
}

export interface parsingStatus {
    [index: string]: number | undefined;

    expansion?: number | undefined;
    set_code: number;
    acquire_date?: number | undefined;
    acquire_price?: number | undefined;
    foil?: number | undefined;
    condition?: number | undefined;
    language?: number | undefined;
    name: number;
}


export class CardParser {
    headers: parsingStatus = {name: -1, expansion: undefined, set_code: -1};
    readonly appConfig: AppConfig;

    constructor(appConfig: AppConfig) {
        this.appConfig = appConfig;
        this.headers = {name: -1,set_code: -1};
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


        //TODO - Add some functions to include extra passed in columns
        if (this.appConfig.includeUnknownFields && other_headers) {
            const columnsAlreadySet = Object.values(this.headers);
            other_headers.forEach((header: string, index: number) => {
                if (columnsAlreadySet.indexOf(index) === -1) {
                    parsedCard.extra_details[other_headers[index]] = details[index];
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
            parsedCard['set_code'] = this.appConfig.getCodeBySet(parsedCard['expansion']);
        }


        parsedCard['foil'] = (!!this.headers.foil);
        parsedCard['condition'] = this.determineFieldValue(this.headers.condition, details, '');
        // parsedCard['condition'] = (this.headers.condition ? details[this.headers.condition] : '');
        parsedCard['language'] = this.determineFieldValue(this.headers.language, details, '');
        //parsedCard['language'] = (this.headers.language ? details[this.headers.language] : 'EN');
        parsedCard['acquire_date'] = this.determineFieldValue(this.headers.acquire_date, details, '');
        // parsedCard['acquire_date'] = (this.headers.acquire_date ? details[this.headers.acquire_date] : '');
        parsedCard['acquire_price'] = this.determineFieldValue(this.headers.acquire_price, details, '');
        //parsedCard['acquire_price'] = (this.headers.acquire_price ? details[this.headers.acquire_price] : '');

        return parsedCard;
    }

    /**
     * This method is used to check for the presence of a defined header column and set the value using that index, else return a default value
     * @param test
     * @param values
     * @param defaultValue
     */
    determineFieldValue(test: number | undefined, values: string[], defaultValue: string): string {
        if (test) {
            return values[test];
        } else {
            return defaultValue;
        }
    }

    updateCardFromEchoResults(card: ParsedCard, newDetails: EchoResponseMatch): void {
        if (card.errors) {
            card.errors.forEach((error_field: string) => {
                // @ts-ignore
                card[error_field] = newDetails[error_field];
            });
            delete card.errors;
        }
    }
}