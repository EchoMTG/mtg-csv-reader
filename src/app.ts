import * as express from "express"
// import * as fileUpload from "express-fileupload"
import {CsvProcessor, CsvProcessorResult} from "./helpers/csv_processor";
import {AppConfig} from "./util/definitions";
import {buildFileUploades, mimicUpload} from "./middleware/gcf";
import {UploadedFile} from "express-fileupload";
import * as cors from "cors";


export class App {
    _app: express.Application;

    constructor() {
        this._app = express();
        this.setMiddleware();
        this.setTemplateRoutes();
    }

    private setMiddleware() {
        // this._app.use(fileUpload());
        this._app.use(buildFileUploades);
        this._app.use(mimicUpload);
    }

    setTemplateRoutes(): void {
        let opts = {
            origin: 'https://*.echomtg.com'
        };
        this._app.get('/', (req: express.Request, res: express.Response, next: express.NextFunction) => {
            const path = req.baseUrl;
            res.send(`
            <form action="https://us-central1-echo-csv.cloudfunctions.net/echo-csv/upload" method="post" enctype="multipart/form-data">
              <input name="csvFile" type="file" />
              <input type="submit">
            </form>
        `).status(200);
        });

        this._app.post('/upload', cors(opts),(req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.set('Access-Control-Allow-Origin', '*');
            const csvProcessor: CsvProcessor = new CsvProcessor(new AppConfig());
            if (req.files === undefined ) {
                res.send('No files were uploaded').status(400);
            } else {
                console.log("Processing");
                if ( Array.isArray(req.files.csvFile) ) {
                    // We need to process a multi part upload
                    let file: UploadedFile = req.files.csvFile[0];
                    if ( csvProcessor.isSupportedMimeType(file.mimetype) ) {
                        csvProcessor.processCsv(file, (err,data: CsvProcessorResult) => {
                            if (err) {
                                res.send(data).status(400);
                            } else {
                                res.send(data).status(200);
                            }
                        });
                    } else {
                        res.send('Bad file type').status(400);
                    }
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