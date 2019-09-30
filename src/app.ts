import * as express from "express"
import * as fileUpload from "express-fileupload"
import {CsvProcessor, CsvProcessorResult} from "./helpers/csv_processor";
import {AppConfig} from "./util/definitions";


export class App {
    _app: express.Application;

    constructor() {
        this._app = express();
        this.setMiddleware();
        this.setTemplateRoutes();
    }

    private setMiddleware() {
        this._app.use(fileUpload());
    }

    setTemplateRoutes(): void {
        console.log('Setting routes');

        this._app.get('/', (req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.send(`
            <form action="/upload" method="post" enctype="multipart/form-data">
              <input name="csvFile" type="file" />
              <input type="submit">
            </form>
        `).status(200);
        });

        this._app.post('/upload', (req: express.Request, res: express.Response, next: express.NextFunction) => {
            const csvProcessor: CsvProcessor = new CsvProcessor(new AppConfig());
            if (req.files === undefined ) {
                res.send('No files were uploaded').status(400);
            } else {
                if ( Array.isArray(req.files.csvFile) ) {
                    // We need to process a multi part upload
                } else {
                    if ( csvProcessor.isSupportedMimeType(req.files.csvFile.mimetype) ) {
                        // Process a single file upload. Do we process async?
                        csvProcessor.processCsv(req.files.csvFile, (err,data: CsvProcessorResult) => {
                            if (err) {
                                res.send(data).status(400);
                            } else {
                                res.send(data).status(200);
                            }
                        });
                    } else {
                        res.send('Bad file type').status(400);
                    }
                }

            }
        });
    }
}

export default new App;