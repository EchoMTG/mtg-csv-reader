import * as express from "express"
// import * as fileUpload from "express-fileupload"
import {UploadProcessorResult, UploadProcessor, BasicCsvProcessor} from "./upload_processors/csv_processor";
import {AppConfig} from "./config/parser_config";
import {buildFileUploades, mimicUpload} from "./middleware/gcf";
import {UploadedFile} from "express-fileupload";
import * as cors from "cors";
import {ProcessorMux, UploadHandler} from "./upload_processors/processor_mux";
import {generateFile} from "./helpers/util";
import {headerHelper} from "./helpers/header_helper";
import {VERSION} from "./version";


export class App {
    _app: express.Application;
    _config: AppConfig;
    ulMux: ProcessorMux;

    constructor() {
        this._config = new AppConfig();
        this._app = express();
        this.setMiddleware();
        this.setTemplateRoutes();
        this.ulMux = new ProcessorMux();
    }

    private setMiddleware() {
        // this._app.use(fileUpload());
        let corsOptions = {
            origin: '*'
        };
        this._app.use(cors(corsOptions));
        this._app.use(buildFileUploades);
        this._app.use(mimicUpload);
        this._app.use(express.json());
    }

    async startServer() {
        await this._config.fetchEchoConfigData();
        console.log("Done waiting on configuration");
    }

    setTemplateRoutes(): void {
        this._app.get('/', (req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.send(`<style>body { background: black; }</style>
            <form action="upload" method="post" enctype="multipart/form-data">
              <input name="csvFile" type="file" />
              <input type="submit">
            </form>
        `).status(200);
        });

        this._app.get('/version', (req: express.Request, res: express.Response) => {
           res.status(200).send({version: VERSION});
        });

        this._app.get('/supported_exports', (req: express.Request, res: express.Response) => {
            res.status(200).send([
                'TCGPlayer App',
                'Delver Lens',
                'Echo MTG',
                'Deckbox'
            ])
        });

        this._app.get('/supported_headers', (req: express.Request, res: express.Response) => {
           res.status(200).send(headerHelper.defaultHeaders)
        });

        this._app.post('/upload', (req: express.Request, res: express.Response, next: express.NextFunction) => {
            
            

            this._config.fetchEchoConfigData().then(() => {
                if ( typeof(req.files) === 'undefined' ) {
                    req.files = {
                        csvFile: []
                    };
                }
                ProcessorMux.switch(req.files.csvFile, this._config).then((handler: UploadHandler) => {
                    

                    if (typeof (handler.file) === 'undefined') {
                        handler.file = generateFile(req.body.body);
                    }

                    handler.processor.processUpload(handler.file, (err, data: UploadProcessorResult) => {
                        if (err) {
                            res.send(data.parsingErrors).status(400);
                        } else {
                            res.send(data).status(200);
                        }
                    });
                });
            });
        });
    }
}

export default new App();