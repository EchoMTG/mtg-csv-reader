import * as mtgSets from "../data/mtg_sets_trimmed.json"
let HEADERS: string[] = [
    'name','expansion','set_code','date_acquired','price_acquired','condition','foil','language'
];
let BE_REGEX: {DATE_ACQ_REGEX: RegExp, PRICE_ACQ_REGEX: RegExp, FOIL_REGEX: RegExp} = {
    // This is by far the hardest regex
    DATE_ACQ_REGEX: /^(\d{4}|\d{2})\/(\d{2}|\d)\/(\d|\d{2}|\d{4})$/,
    PRICE_ACQ_REGEX: /^[0-9]+(?:\.[0-9]{2})?$/,
    FOIL_REGEX: /^True$|^true$|^Yes$|^yes$/
};

let SUPPORTED_LANGS: string[] = [
    'EN','GR','FR','SP','CS','IT','JP','CT','KR','RU'
];

let VALID_CONDITIONS: string[] = [
    'NM','MINT','EX','HP','LP','DMG'
];

// Parse out only required fields here for compiler type safety
let PARSED_SETS: {
    [index: string]: {
        name: string
    }
} = mtgSets;

let SUPPORTED_MIME_TYPES: string[] = [
    'text/csv'
];
export {HEADERS,BE_REGEX,PARSED_SETS,VALID_CONDITIONS,SUPPORTED_LANGS,SUPPORTED_MIME_TYPES};

