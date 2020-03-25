import * as config from "../config.json";
import * as request from "request-promise-native";

const DEFAULT_NAME_HEADERS: string[] = ['card name', 'card', 'name'];
const DEFAULT_DATE_HEADERS: string[] = ['acquired', 'acquired on', 'added', 'acquired_date', 'date_acquired', 'date acquired', 'acquired_date'];
const DEFAULT_PRICE_HEADERS: string[] = ['acquired price', 'value', 'acquired_value', 'price_acquired', 'price', 'acquired', 'acquired_price','price each'];
const DEFAULT_CONDITION_HEADERS: string[] = ['condition'];
const DEFAULT_SET_HEADERS: string[] = ['set', 'expansion'];
const DEFAULT_SET_CODE_HEADERS: string[] = ['set_code', 'code',  'set code'];
const DEFAULT_HEADERS: string[] = ['name', 'expansion', 'set_code', 'date_acquired', 'price_acquired', 'condition', 'foil', 'language', 'quantity'];
const DEFAULT_LANGS: string[] = ['EN', 'GR', 'FR', 'SP', 'CS', 'IT', 'JP', 'CT', 'KR', 'RU', 'English', 'French', 'Spanish', 'Chinese - Simplified', 'Italian', 'Japanese', 'Chinese - Traditional', 'Korean', 'Russian'];
const DEFAULT_QUANTITY_HEADERS: string[] = ['reg qty', 'quantity', 'Quantity'];
const DEFAULT_FOIL_QUANTITY_HEADERS: string[] = ['foil qty'];
const DEFAULT_CONDITIONS: string[] = ['NM', 'MINT', 'EX', 'HP', 'LP', 'DMG'];

let myHeaderHelper: { [index: string]: string[] } = {};
myHeaderHelper['name'] = DEFAULT_NAME_HEADERS;
myHeaderHelper['set_code'] = DEFAULT_SET_CODE_HEADERS;
myHeaderHelper['expansion'] = DEFAULT_SET_HEADERS;
myHeaderHelper['set'] = DEFAULT_SET_HEADERS;
myHeaderHelper['date_acquired'] = DEFAULT_DATE_HEADERS;
myHeaderHelper['price_acquired'] = DEFAULT_PRICE_HEADERS;
myHeaderHelper['condition'] = DEFAULT_CONDITION_HEADERS;
myHeaderHelper['quantity'] = DEFAULT_QUANTITY_HEADERS;
myHeaderHelper['foil_quantity'] = DEFAULT_FOIL_QUANTITY_HEADERS;
myHeaderHelper['language'] = ['lang', 'language'];

export class HeaderHelper {
    defaultHeaders: { [index: string]: string[] };

    constructor(h: { [index: string]: string[] }) {
        this.defaultHeaders = h;
    }

    isValidHeader(testHeader: string): string | undefined {
        let goodHeaderList: string[] = Object.keys(this.defaultHeaders);
        let matchedHeader: string | undefined = undefined;
        goodHeaderList.forEach((goodHeader: string) => {
            if (this.defaultHeaders[goodHeader].indexOf(testHeader) !== -1) {
                console.log(`Found match: ${goodHeader}`);
                matchedHeader = goodHeader;
            }
        });

        return matchedHeader;
    }

}

export let headerHelper = new HeaderHelper(myHeaderHelper);

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


