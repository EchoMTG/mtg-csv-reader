import {UploadedFile} from "express-fileupload";
import {BasicCsvProcessor, UploadProcessor} from "./csv_processor";
import {AppConfig} from "../config/parser_config";
import {BasicTsvProcessor} from "./tsv_processor";
import {RawBodyProcessor} from "./raw_body_processor";

type ProcessorClass = { new(config: AppConfig): any; };

export type UploadHandler = {
    processor: UploadProcessor,
    file: UploadedFile | undefined,
}

export class ProcessorMux {
    static mux: { [index: string]: ProcessorClass } = {
        'text/csv': BasicCsvProcessor,
        'text/tsv': BasicTsvProcessor,
        'text/plain': RawBodyProcessor
    };

    static switch(uploadedFile: UploadedFile | UploadedFile[] | undefined, config: AppConfig): Promise<UploadHandler> {
        return new Promise<UploadHandler>((resolve, reject) => {
            const file = (Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile);

            if (typeof(file) !== 'undefined') {
                
                const processorClass: ProcessorClass | undefined = ProcessorMux.mux[file.mimetype];
                if (processorClass) {
                    console.log("Determined best uploader from mimetype");
                    return resolve({
                        file: file,
                        processor: new processorClass(config)
                    });
                } else {
                    console.log("Failing back to the default processor");
                    return resolve({
                        file: file,
                        processor: new BasicCsvProcessor(config)
                    });
                }
            }
            console.log("No file was uploaded. Checking body for data");
            return resolve({
                file: undefined,
                processor: new RawBodyProcessor(config)
            })
        });
    }
}