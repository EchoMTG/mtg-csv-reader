import {UploadProcessor, UploadProcessorResult} from "./csv_processor";
import {CardParser} from "../helpers/card_parser";
import {AppConfig} from "../config/parser_config";
import * as fileUpload from "express-fileupload";


export class BasicTsvProcessor implements UploadProcessor {
    cardParser: CardParser;
    supportedMimeTypes: string[];

    constructor(config: AppConfig) {
        this.cardParser = new CardParser(config);
        this.supportedMimeTypes = ['text/tsv'];
    }

    /**
     * Get a list of valid mime/types. This function exists as future proofing in case with ingest XML/JSON from other vendors
     * @param type
     */
    isSupportedMimeType(type: string) {
        return this.supportedMimeTypes.includes(type);
    }

    processUpload(file: fileUpload.UploadedFile, cb: (err: Error | undefined, data: UploadProcessorResult) => void): void {
        // NYI #TODO
    }
}
