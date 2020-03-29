import {UploadedFile} from "express-fileupload";
import {BasicCsvProcessor, UploadProcessor} from "./csv_processor";
import {AppConfig} from "../config/parser_config";
import {BasicTsvProcessor} from "./tsv_processor";
import {RawBodyProcessor} from "./raw_body_processor";

type ProcessorClass = { new(config: AppConfig): any; };

export type UploadHandler = {
    processor: UploadProcessor,
    file: UploadedFile,
}

export class ProcessorMux {
    static mux: { [index: string]: ProcessorClass } = {
        'text/csv': BasicCsvProcessor,
        'text/tsv': BasicTsvProcessor,
        'text.plain': RawBodyProcessor
    };
    static switch(uploadedFile: UploadedFile|UploadedFile[]|undefined, config: AppConfig): Promise<UploadProcessor> {
        return new Promise<UploadProcessor>( (resolve,reject) => {
            let handler: UploadHandler = {file: , processor: undefined};
            if ( uploadedFile ) {
                const file = ( Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile);
                const processorClass: ProcessorClass|undefined = ProcessorMux.mux[file.mimetype];
                if ( processorClass ) {
                    console.log("Determined best uploader from mimetype");
                    return resolve(new processorClass(config));
                } else {
                    console.log("Failing back to the default processor");
                    return resolve(new BasicCsvProcessor(config));
                }
            }
            console.log("No file was uploaded. Checking body for data");
            return resolve(new RawBodyProcessor(config))
        });
    }
}