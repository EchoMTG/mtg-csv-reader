import * as mtgSets from "../data/mtg_sets_trimmed.json"
import * as config from "../../app.json";
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
    includeUnknownFields: boolean;
    [index: string]: any;

    constructor() {
        const sets = Object.assign(new ParsedSets(), mtgSets);
        Object.keys(sets).forEach((code: string) => {
           this.setCodes.push(code);
           this.setNames.push(sets[code]['name'])
        });

        let configuration: ConfigFile = new ConfigFile();

        if ( Object.keys(config).length ) {
            configuration = Object.assign(new ConfigFile(), config)
        }
        // This is a bad way to do this. There should be a better way where I can dynamically figure it out
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
        this.includeUnknownFields = this.getOrDefault(configuration, 'return_unknown_fields', false);
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


