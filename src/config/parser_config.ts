import * as config from "../config.json";
import * as request from "request-promise-native";
import {DEFAULT_HEADERS} from "../helpers/header_helper";


class ConfigFile {
    [index: string]: string[] | RegExp;
}

export class AppConfig {
    headers: string[];
    setNames: string[] = [];
    setCodes: string[] = [];
    includeUnknownFields: boolean;
    cardCache: { [index: string]: { [index: string]: string } } = {};

    [index: string]: any;

    constructor() {
        let configuration: ConfigFile = new ConfigFile();

        if (Object.keys(config).length) {
            configuration = Object.assign(new ConfigFile(), config)
        }
        // This is a bad way to do this. There should be a better way where I can dynamically figure it out
        this.headers = this.getOrDefault(configuration, 'headers', DEFAULT_HEADERS);
        this.supportedMimeTypes = ['text/csv'];
        this.includeUnknownFields = this.getOrDefault(configuration, 'return_unknown_fields', false);
    }

    /**
     * Query the reference data for a set name by querying by code
     *
     */
    async fetchEchoConfigData(): Promise<void> {
        await this.getReferenceData();
    }

    getSetByCode(code: string) {
        const index: number = this.setCodes.indexOf(code);
        return this.setNames[index];
    }

    /**
     * Query the reference data for a set code by querying on set name
     * @param set
     */
    getCodeBySet(set: string): string | undefined {
        const index: number = this.setNames.indexOf(set);
        if (index > -1) {
            return this.setCodes[index]
        }
    }

    /**
     * Async wrapper function to get both sets of lookup data from echo
     */
    private async getReferenceData() {
        let setData = await this.getSetDeta();
        this.setCodes = Object.keys(setData.sets);
        this.setNames = Object.values(setData.sets);
        this.cardCache = await this.getCardCache();
        this.tcgidCache = await this.getTCGIDCache();
        this.collectoridCache = await this.getCollectorIDCache();
    }

    /**
     * Gather the [set] data from Echo so it doesn't need to be store locally
     *
     */
    private getSetDeta(): Promise<{ sets: { [index: string]: string } }> {
        return new Promise((resolve, reject) => {
            request({uri: 'https://www.echomtg.com/api/data/set_reference/'}).then((body) => {
                const data: { sets: { [index: string]: string } } = JSON.parse(body);
                resolve(data);
            }).catch((err) => {
                reject(err);
            });
        })
    }

    /**
     * Gather the tcgid->echoid data from Echo so it doesn't need to be store locally
     *
     */
    private async getTCGIDCache(): Promise<{ [index: string]: { [index: string]: string } }> {
        return new Promise((resolve, reject) => {
            request({uri: 'https://assets.echomtg.com/data/lookuptcgid.json'}).then((body) => {
                const data:  { [index: string]: { [index: string]: string } } = JSON.parse(body.toString().toLowerCase());
                resolve(data);
            }).catch((err) => {
                reject(err);
            });
        })
    }
        /**
     * Gather the setcode->setnumber->echoid data from Echo so it doesn't need to be store locally
     *
     */
        private async getCollectorIDCache(): Promise<{ [index: string]: { [index: string]: string } }> {
            return new Promise((resolve, reject) => {
                request({uri: 'https://assets.echomtg.com/data/lookuptcgid.json'}).then((body) => {
                    const data:  { [index: string]: { [index: string]: string } } = JSON.parse(body.toString().toLowerCase());
                    resolve(data);
                }).catch((err) => {
                    reject(err);
                });
            })
        }

    /**
     * Gather the [set -> Card List[ data from Echo so it doesn't need to be store locally
     *
     */
    private async getCardCache(): Promise<{ [index: string]: { [index: string]: string } }> {
        return new Promise((resolve, reject) => {
            request({uri: 'https://assets.echomtg.com/data/lookup.json'}).then((body) => {
                const data:  { [index: string]: { [index: string]: string } } = JSON.parse(body.toString().toLowerCase());
                resolve(data);
            }).catch((err) => {
                reject(err);
            });
        })
    }

    /**
     * Mimic a map function from other langs that allow you to pass a default if the key doesn't exist on an object
     * @param configuration
     * @param key
     * @param defaultValue
     */
    private getOrDefault(configuration: ConfigFile, key: string, defaultValue: string[] | RegExp | boolean): any {
        if (config.hasOwnProperty(key) && configuration[key]) {
            return configuration[key];
        } else {
            return defaultValue;
        }
    }



}


