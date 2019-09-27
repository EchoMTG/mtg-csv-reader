import * as mtgSets from "../data/mtg_sets_trimmed.json"
import * as config from "../../app.json";
let DEFAULT_NAME_HEADERS: string[] = ['NAME','CARD NAME','CARD'];
let DEFAULT_DATE_HEADERS: string[] = ['ACQUIRED','ACQUIRED ON','ADDED','ACQUIRED_DATE','DATE_ACQUIRED'];
let DEFAULT_PRICE_HEADERS: string[] = ['ACQUIRED PRICE','VALUE','ACQUIRED_VALUE','PRICE_ACQUIRED','ACQUIRED_PRICE'];
let DEFAULT_CONDITION_HEADERS: string[] = ['CONDITION'];
let DEFAULT_SET_HEADERS: string[] = ['EXPANSION','SET','PRINTING'];
let DEFAULT_SET_CODE_HEADERS: string[] = ['SET_CODE','CODE'];
let DEFAULT_HEADERS: string[] = ['name','expansion','set_code','date_acquired','price_acquired','condition','foil','language'];
let DEFAULT_LANGS: string[] = ['EN','GR','FR','SP','CS','IT','JP','CT','KR','RU'];
let DEFAULT_CONDITIONS: string[] = ['NM','MINT','EX','HP','LP','DMG'];

class ConfigFile {
    [index: string]: string[]|RegExp;
}

class ParsedSets {
    [index: string]: { name: string, code?: string}
}

export class AppConfig {
    headers: string[];
    dateAcqRegex: RegExp;
    priceAcqRegex: RegExp;
    foilRegex: RegExp;
    supportedLanguages: string[];
    validConditions: string[];
    setNames: string[] = [];
    setCodes: string[] = [];
    supportedMimeTypes: string[];
    supportedNameHeaders: string[];
    supportedDateHeaders: string[];
    supportedPriceHeaders: string[];
    supportedConditionHeaders: string[];
    supportedSetHeaders: string[];
    supportedSetCodeHeaders: string[];
    [index: string]: any;

    constructor() {
        let sets = Object.assign(new ParsedSets(), mtgSets);
        Object.keys(sets).forEach((code: string) => {
           this.setCodes.push(code);
           this.setNames.push(sets[code]['name'])
        });

        let configuration: ConfigFile = new ConfigFile();

        if ( Object.keys(config).length ) {
            configuration = Object.assign(new ConfigFile(), config)
        }
        this.headers = this.getOrDefault(configuration,'headers', DEFAULT_HEADERS);
        this.dateAcqRegex = this.getOrDefault(configuration,'date_acquired_regex', /^(\d{4}|\d{2})\/(\d{2}|\d)\/(\d|\d{2}|\d{4})$/ );
        this.priceAcqRegex = this.getOrDefault(configuration,'price_acquired_regex',/^[0-9]+(?:\.[0-9]{2})?$/ );
        this.foilRegex = this.getOrDefault(configuration,'foil_regex',/^True$|^true$|^Yes$|^yes$/ );
        this.supportedLanguages = this.getOrDefault(configuration,'supported_languages', DEFAULT_LANGS);
        this.validConditions = this.getOrDefault(configuration,'conditions', DEFAULT_CONDITIONS);
        this.supportedMimeTypes = ['text/csv'];
        this.supportedNameHeaders = this.getOrDefault(configuration,'name_headers', DEFAULT_NAME_HEADERS);
        this.supportedDateHeaders = this.getOrDefault(configuration,'date_acquired_headers', DEFAULT_DATE_HEADERS);
        this.supportedPriceHeaders = this.getOrDefault(configuration,'price_acquired_headers', DEFAULT_PRICE_HEADERS);
        this.supportedConditionHeaders = this.getOrDefault(configuration,'condition_headers', DEFAULT_CONDITION_HEADERS);
        this.supportedSetHeaders = this.getOrDefault(configuration,'expansion_headers', DEFAULT_SET_HEADERS);
        this.supportedSetCodeHeaders = this.getOrDefault(configuration,'set_code_headers', DEFAULT_SET_CODE_HEADERS);
    }

    /**
     *
     * @param config
     * @param key
     * @param defaultValue
     */
    private getOrDefault(config: ConfigFile, key: string, defaultValue: string[]|RegExp): any {
        if (config.hasOwnProperty(key) && config[key] ) {
            return config[key];
        } else {
            return defaultValue;
        }
    }

}


