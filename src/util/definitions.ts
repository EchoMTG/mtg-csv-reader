import * as config from "../config.json";
import * as request from "request";
import {Response} from "request";
const DEFAULT_NAME_HEADERS: string[] = ['NAME','CARD NAME','CARD'];
const DEFAULT_DATE_HEADERS: string[] = ['ACQUIRED','ACQUIRED ON','ADDED','ACQUIRED_DATE','DATE_ACQUIRED'];
const DEFAULT_PRICE_HEADERS: string[] = ['ACQUIRED PRICE','VALUE','ACQUIRED_VALUE','PRICE_ACQUIRED','ACQUIRED_PRICE'];
const DEFAULT_CONDITION_HEADERS: string[] = ['CONDITION'];
const DEFAULT_SET_HEADERS: string[] = ['EXPANSION','SET','PRINTING'];
const DEFAULT_SET_CODE_HEADERS: string[] = ['SET_CODE','CODE'];
const DEFAULT_HEADERS: string[] = ['name','expansion','set_code','date_acquired','price_acquired','condition','foil','language'];
const DEFAULT_LANGS: string[] = ['EN','GR','FR','SP','CS','IT','JP','CT','KR','RU'];
const DEFAULT_CONDITIONS: string[] = ['NM','MINT','EX','HP','LP','DMG'];


class ConfigFile {
    [index: string]: string[]| RegExp;
}

export class AppConfig {
    headers: string[];
    // dateAcqRegex: RegExp;
    // priceAcqRegex: RegExp;
    // foilRegex: RegExp;
    // supportedLanguages: string[];
    // validConditions: string[];
    setNames: string[] = [];
    setCodes: string[] = [];
    // supportedMimeTypes: string[];
    // supportedNameHeaders: string[];
    // supportedDateHeaders: string[];
    // supportedPriceHeaders: string[];
    // supportedConditionHeaders: string[];
    // supportedSetHeaders: string[];
    // supportedSetCodeHeaders: string[];
    includeUnknownFields: boolean;
    cardCache: {[index:string]:{[index:string]:string}} = {};
    [index: string]: any;

     constructor() {
        //const sets = Object.assign(new ParsedSets(), mtgSets);
        // Object.keys(sets).forEach((code: string) => {
        //    this.setCodes.push(code);
        //    this.setNames.push(sets[code]['name'])
        // });
        this.getSetDeta();
        this.getCardCache();
        let configuration: ConfigFile = new ConfigFile();

        if ( Object.keys(config).length ) {
            configuration = Object.assign(new ConfigFile(), config)
        }
        // This is a bad way to do this. There should be a better way where I can dynamically figure it out
        this.headers = this.getOrDefault(configuration,'headers', DEFAULT_HEADERS);
        this.supportedMimeTypes = ['text/csv'];
        this.includeUnknownFields = this.getOrDefault(configuration, 'return_unknown_fields', false);
    }

    getSetByCode(code: string) {
        const index: number = this.setCodes.indexOf(code);
        return this.setNames[index];
    }

    getCodeBySet(set: string) {
        const index: number = this.setNames.indexOf(set);
        return this.setCodes[index];
    }

    /**
     * Gather the set data from Echo so it doesn't need to be store locally
     *
     */
    private async getSetDeta() {
         await request('https://dev.echomtg.com/api/data/set_reference/', (error: any, response: Response, body: any): void => {
           if ( error ) {
               console.log("Unable to fetch set data");
               return;
           } else {
               const data: { sets: { [index: string]: string }} = JSON.parse(body);
               this.setCodes = Object.keys(data.sets);
               this.setNames = Object.values(data.sets);
               console.log('Got set reference...');
           }
        });
    }

    /**
     * Gather the set data from Echo so it doesn't need to be store locally
     *
     */
    private async getCardCache() {
        await request('https://dev.echomtg.com/api/data/lookup/', (error: any, response: Response, body: any): void => {
            if ( error ) {
                console.log("Unable to fetch set data");
                return;
            } else {
                const data: { [index: string]: {[index: string]: string}} = JSON.parse(body.toString().toLowerCase());
                this.cardCache = data;
                console.log('Got card cache...');
            }
        });
    }

    /**
     *
     * @param config
     * @param key
     * @param defaultValue
     */
    private getOrDefault(configuration: ConfigFile, key: string, defaultValue: string[]|RegExp|boolean): any {
        if (config.hasOwnProperty(key) && configuration[key] ) {
            return configuration[key];
        } else {
            return defaultValue;
        }
    }



}


