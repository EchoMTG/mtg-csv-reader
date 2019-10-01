import * as request from "request";
import {IncomingMessage} from "http";
import {RateLimiterMemory, RateLimiterQueue, RateLimiterRes} from "rate-limiter-flexible";
import * as https from "https";
import {Response} from "request";
import {response} from "express";
import * as util from "util";
import * as buffer from "buffer";

type minimumSearchableCard = {
    name: string,
    expansion?: string,
    set_code?: string
}

type EchoResponse = {
    status: string,
    message: string
    match?: {
        [index: string]: string | null
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
                    let uri: string = `/api/search/individual?name=${card.name}&set=${card.expansion}`;
                    // TODO - Change to http.IncomingMessage
                    this._querySingle(uri)
                        .then((res: EchoResponse) => {
                            console.log("Processing result from EchoAPI");
                            if (res.status === "success") {
                                results.push('Pass')
                            } else {
                                results.push('Fail')
                            }

                            if ( results.length === batch.length ) {
                                cb(undefined, results);
                            }
                        })
                        .catch((err: Error ) => {
                           console.log("ERROR DETECTED IN HTTPS");
                           results.push('Fail');
                            if ( results.length === batch.length ) {
                                cb(undefined, results);
                            }
                        });
                });
        });
    }

    _querySingle(uri: string): Promise<EchoResponse> {
        console.log(`About to query ${this.host}${uri}`);
        let fullUrl: string = `https://${this.host}${uri}`;
        return new Promise((resolve, reject) => {
            request(fullUrl, (err: Error, res: request.Response, body: any) => {
                if ( err ) {
                    reject(err);
                } else {
                    if ( res.statusCode >= 200 && res.statusCode < 400 ) {
                        let json: EchoResponse = { status:'', message: ''};
                        try {
                            json = JSON.parse(body);
                            resolve(json);
                        } catch(e) {
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