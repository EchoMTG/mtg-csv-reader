import * as csvParse from "csv-parse"

export class CsvProcessor {

    SUPPORTED_MIME_TYPES: string[] = [
        'text/csv'
    ];

    public isSupportedMimeType(type: string) {
        return this.SUPPORTED_MIME_TYPES.includes(type);
    }
}