import * as request from "request";
import {RateLimiterMemory, RateLimiterQueue, RateLimiterRes} from "rate-limiter-flexible";
import {ParsedCard} from "./csv_processor";

export type EchoResponse = {
    status: string,
    message: string
    card: ParsedCard
    match?: {
        [index: string]: string
    },
    all_matches?: [
        {
            [index: string]: string | null
        }
    ]
}

export class EchoClient {
    rl: RateLimiterMemory;
    queue: RateLimiterQueue;
    host: string = 'www.echomtg.com';


    constructor(limitPerSecond: number, maxPoints: number) {
        this.rl = new RateLimiterMemory({points: maxPoints, duration: limitPerSecond, blockDuration: 1});
        this.queue = new RateLimiterQueue(this.rl);
    }

    /**
     * Async query echo for a list of cards
     * @param batch
     * @param cb
     */
    async queryBatch(batch: ParsedCard[]): Promise<EchoResponse[]> {

        let waitOn: Promise<EchoResponse>[] = batch.map(this._querySingle.bind(this));

        return await Promise.all(waitOn);
    }

    /**
     * Query a single URI and return a promise of the parsed result
     * @param card
     * @private
     */
    _querySingle(card: ParsedCard): Promise<EchoResponse> {
        let uri: string = `/api/search/individual?name=${card.name}&set=${card.expansion}`;
        console.log(`About to query ${this.host}${uri}`);
        let fullUrl: string = `https://${this.host}${uri}`;
        return new Promise((resolve, reject) => {
            request(fullUrl, (err: Error, res: request.Response, body: any) => {
                if (err) {
                    reject(err);
                } else {
                    if (res.statusCode >= 200 && res.statusCode < 400) {
                        let json: EchoResponse;
                        try {
                            json = JSON.parse(body);
                            json.card = card;
                            resolve(json);
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        reject(new Error(`Request failed with code ${res.statusCode}`));
                    }
                }
            })
        });
    }
}