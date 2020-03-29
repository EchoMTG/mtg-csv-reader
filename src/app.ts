import * as express from "express"
// import * as fileUpload from "express-fileupload"
import {UploadProcessorResult, UploadProcessor, BasicCsvProcessor} from "./upload_processors/csv_processor";
import {AppConfig} from "./config/parser_config";
import {buildFileUploades, mimicUpload} from "./middleware/gcf";
import {UploadedFile} from "express-fileupload";
import * as cors from "cors";


export class App {
    _app: express.Application;
    _config: AppConfig;

    constructor() {
        this._app = express();
        this.setMiddleware();
        this.setTemplateRoutes();
        this._config = new AppConfig();
    }

    private setMiddleware() {
        // this._app.use(fileUpload());
        let corsOptions = {
            origin: '*'
        };
        this._app.use(cors(corsOptions));
        this._app.use(buildFileUploades);
        this._app.use(mimicUpload);
    }

    async startServer() {
        await this._config.fetchEchoConfigData();
        console.log("Done waiting on configuration");
    }

    setTemplateRoutes(): void {
        this._app.get('/', (req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.send(`
            <form action="upload" method="post" enctype="multipart/form-data">
              <input name="csvFile" type="file" />
              <input type="submit">
            </form>
        `).status(200);
        });

        this._app.post('/upload', (req: express.Request, res: express.Response, next: express.NextFunction) => {
            this._config.fetchEchoConfigData().then(() => {
                const csvProcessor: UploadProcessor = new BasicCsvProcessor(this._config);
                if (req.files === undefined) {
                    res.send('No files were uploaded').status(400);
                } else {
                    if (Array.isArray(req.files.csvFile)) {
                        // We need to process a multi part upload
                        const file: UploadedFile = req.files.csvFile[0];
                        /**
                         * These else blocks have teh same logic so that its easier to remember in the future to switch on the upload type.
                         */
                        if (csvProcessor.isSupportedMimeType(file.mimetype)) {
                            csvProcessor.processUpload(file, (err, data: UploadProcessorResult) => {
                                if (err) {
                                    console.log("Sending 400");
                                    res.send(data.parsingErrors).status(400);
                                } else {
                                    console.log(data);
                                    res.send(data).status(200);
                                }
                            });
                        } else {
                            csvProcessor.processUpload(file, (err, data: UploadProcessorResult) => {
                                if (err) {
                                    console.log("Sending 400");
                                    res.send(data.parsingErrors).status(400);
                                } else {
                                    console.log(data);
                                    res.send(data).status(200);
                                }
                            });
                        }
                    } else {
                        /**
                         * These else blocks have teh same logic so that its easier to remember in the future to switch on the upload type.
                         */
                        if (csvProcessor.isSupportedMimeType(req.files.csvFile.mimetype)) {
                            csvProcessor.processUpload(req.files.csvFile, (err, data: UploadProcessorResult) => {
                                if (err) {
                                    console.log("Sending a 400");
                                    res.send(data.parsingErrors).status(400);
                                } else {
                                    console.log(data);
                                    res.send(data).status(200);
                                }
                            });
                        } else {
                            csvProcessor.processUpload(req.files.csvFile, (err, data: UploadProcessorResult) => {
                                if (err) {
                                    console.log("Sending a 400");
                                    res.send(data.parsingErrors).status(400);
                                } else {
                                    console.log(data);
                                    res.send(data).status(200);
                                }
                            });
                        }
                    }
                }
            });

        });
    }
}

export default new App();