import {UploadProcessor, UploadProcessorResult} from "./csv_processor";
import {BestEffortCardParser} from "../card_parsers/card_parser";
import {AppConfig} from "../config/parser_config";
import * as fileUpload from "express-fileupload";
import {CardParser, CardParserDecision, ParsedCard, parsingStatus, knownHeaderFormats} from "../card_parsers";


export class RawBodyProcessor implements UploadProcessor {
    cardParser: CardParser;
    supportedMimeTypes: string[];
    readonly config: AppConfig;

    constructor(config: AppConfig) {
        this.config = config;
        this.cardParser = new BestEffortCardParser(config);
        this.supportedMimeTypes = ['text/plain'];
    }

    /**
     * Get a list of valid mime/types. This function exists as future proofing in case with ingest XML/JSON from other vendors
     * @param type
     */
    isSupportedMimeType(type: string) {
        return this.supportedMimeTypes.includes(type);
    }

    /**
     * Parse a single row into a card object
     * @param details: string[]
     * @param other_headers: string[] other details we can provide to a card
     */
    parseSingleCard(name: string, quanity: string, set_code: string): ParsedCard {
        let echoid = this.config.cardCache[set_code.toLowerCase()] ? this.config.cardCache[set_code.toLowerCase()][name.toLowerCase()] : '0';
        const parsedCard: ParsedCard = {
            foil: false,
            language: 'en',
            acquire_date: '',
            acquire_price: '',
            expansion: this.config.getSetByCode(set_code),
            set_code: set_code,
            condition: 'NM',
            name: name,
            tcgid: 0,
            collectors_number: '',
            quantity: quanity,
            extra_details: {
                echo_id: echoid 
            }
        };
        return parsedCard;
        // concept: if that data was faked as a csv row existing logic could be used
        // return this.cardParser.parseSingleCard
        
    }

    processUpload(file: fileUpload.UploadedFile, cb: (err: Error | undefined, data: UploadProcessorResult) => void): void {

        // grab raw text 
        const pastedText = Buffer.from(file.data);
        
        // parse text into rows in an array
        const splitText = pastedText.toString().split('\n');

        const parsingResult: UploadProcessorResult = {
            errors: [],
            cards: [],
            parsingErrors: [],
            headers: {name: -1, set_code: -1}
        };
        
        let parsed: ParsedCard;
        let parsedStr: any = '';

        // iterate through each 
        for(let i = 0; i < splitText.length; i++){
            parsedStr = splitText[i].match(/(?<qty>\d+)\s+?(?<name>.*?)\s+\[(?<set_code>[0-9a-zA-Z]+)\]/i);
            
            if(parsedStr){
                parsed = this.parseSingleCard(parsedStr.groups.name, parsedStr.groups.qty, parsedStr.groups.set_code);
                if(parsed.extra_details.echo_id != '0') {
                    parsingResult.cards.push(parsed);
                } else {
                    parsingResult.errors.push(parsed);
                }
                    
            }
        }

        cb(undefined, parsingResult);
 

    }
}
