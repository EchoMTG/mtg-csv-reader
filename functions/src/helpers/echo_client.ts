import {request} from "https";
import {RateLimiterMemory, RateLimiterQueue, RateLimiterRes} from "rate-limiter-flexible";
import {CsvProcessorResult} from "./csv_processor";
import * as http from "http";

type minimumSearchableCard = {
    name: string,
    expansion?: string,
    set_code?: string
}


export class EchoClient {
    rl: RateLimiterMemory;
    queue: RateLimiterQueue;

    constructor(limitPerSecond: number, maxPoints: number) {
        this.rl = new RateLimiterMemory({points: maxPoints, duration: limitPerSecond, blockDuration: 1});
        this.queue = new RateLimiterQueue(this.rl);
    }

    /**
     *
     * @param batch
     * @param cb
     */
    queryBatch(batch: minimumSearchableCard[], cb: (err: Error | undefined, results: string[]) => void): void {
        let results: string[] = [];

        batch.forEach((card: minimumSearchableCard) => {
            this.queue.removeTokens(1)
                .then(() => {
                    // If we reach this, we are free to query echo because we are inside rate limit
                    let uri: string = `?name=${card.name}&set=${card.expansion}`;
                    // TODO - Change to http.IncomingMessage
                    this._querySingle(uri, (err: Error | undefined, res: string): void => {
                        console.log(`I've received a response`);
                        results.push(res);
                        if (results.length == batch.length) {
                            cb(undefined, results);
                        }
                    });
                });
        });
    }

    // TODO - Change to http.IncomingMessage
    _querySingle(uri: string, cb: (err: Error | undefined, res: string) => void) {
        console.log(`About to query ${uri}`);
        cb(undefined, uri);
    }
}