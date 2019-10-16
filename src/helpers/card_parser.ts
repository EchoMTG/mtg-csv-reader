import {AppConfig} from "../util/definitions";
import {snake} from "change-case";

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

export interface parsingStatus {
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


export class CardParser {
    headers: parsingStatus = {name: undefined, expansion: undefined, set_code: undefined};
    readonly appConfig: AppConfig;
    
    constructor(appConfig: AppConfig) {
        this.appConfig = appConfig;
    }
    
    isHeader(row: string): boolean {
        return this.appConfig.headers.includes(snake(row))
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

            if ( parsedCard['set_code'] && parsedCard['expansion'] ) {
                parsedCard['expansion'] = this.appConfig.getSetByCode(parsedCard['set_code']);
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
}