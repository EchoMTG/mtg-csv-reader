import * as express from "express"
import * as fileUpload from "express-fileupload"
import {CsvProcessor} from "./helpers/csv_processor";

const csvProcessor: CsvProcessor = new CsvProcessor();

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
            if (req.files === undefined ) {
                res.send('No files were uploaded').status(400);
            } else {
                if ( Array.isArray(req.files.csvFile) ) {
                    // We need to process a multi part upload
                } else {
                    if ( csvProcessor.isSupportedMimeType(req.files.csvFile.mimetype) ) {
                        // Process a single file upload. Do we process async?
                    } else {
                        res.send('Bad file type').status(400);
                    }
                }

            }


            res.send('Ok').status(200);
        });
    }
}

export default new App;