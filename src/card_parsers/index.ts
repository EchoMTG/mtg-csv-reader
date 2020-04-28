import {UploadProcessorResult} from "../upload_processors/csv_processor";

export interface CardParser {
    parseRawRows(listOfCards: string[][]): void;
    validateParsedCards(cb: (err: Error|undefined, data: UploadProcessorResult) => void): void;
}

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
    date_acquired?: number | undefined;
    price_acquired?: number | undefined;
    foil?: number | undefined;
    condition?: number | undefined;
    language?: number | undefined;
    quantity?: number | undefined;
    name: number;
}

export interface CardParserDecision {
    headers: string[],
    cardParser: CardParser
}


export type knownHeaderFormats = {
    [source: string]: {
        headers: string[],
        parser: CardParser
    }
}