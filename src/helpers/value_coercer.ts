interface language {
    name: string,
    lang: string
}

const supportedLanguages: language[] = [
    {lang: 'en', name: 'english'},
    {lang: 'de', name: 'german '},
    {lang: 'fr', name: 'french'},
    {lang: 'ru', name: 'russian'},
    {lang: 'it', name: 'italian'},
    {lang: 'es', name: 'spanish'},
    {lang: 'pt', name: 'portuguese'},
    {lang: 'ct', name: 'chinese traditional'},
    {lang: 'cs', name: 'chinese simplified'},
    {lang: 'jp', name: 'japanese'},
    {lang: 'kp', name: 'korean'}
];

const conditions: { [index: string]: string } = {
    'near mint': 'nm', 'lightly played':'lp','moderately played': 'mp', 'heavily played': 'hp',
    'damaged':'d', 'altered':'alt', 'artist proof':'art','pre-release':'pre','timestamped':'ts',
    'signed':'sgn','bgs':'bgs','bgs 10':'b10','bgs 9.5':'b95','bgs 9.0':'b9','bgs 8.5':'b85',
    'bgs 8.0':'b8','bgs 7.5':'b75','bgs 7.0':'b7','psa':'psa','psa 10':'p10','psa 9.5':'p95',
    'psa 9.0':'p9', 'psa 8.5':'p80', 'psa 8.0':'p8', 'psa 7.5':'p75', 'psa 7.0': 'p7'
};

/**
 * This function will try to convert a language name to an expected one
 * @param inputValue
 */
export function coerceLanguage(inputValue: string): string {
    const matchedLang = supportedLanguages.filter((value: language) => {
       return value.name === inputValue.toLowerCase();
    });
    if ( matchedLang.length > 0 ) {
        return matchedLang[0].lang;
    } else {
        return 'en';
    }
}

/**
 * This function will try to validate that as passed in language code exists in the supported languages
 * @param inputValue
 */
export function validateLanguage(inputValue: string): string {
    const matchedLang = supportedLanguages.filter((value: language) => {
        return value.lang === inputValue.toLowerCase();
    });
    if ( matchedLang.length > 0 ) {
        return matchedLang[0].lang;
    } else {
        return 'en';
    }
}

/**
 * Return a valid condition from the supplied version.
 * @param inputValue
 */
export function validateCondition(inputValue: string): string {
    const keys = Object.keys(conditions);
    if (keys.indexOf(inputValue.toLowerCase()) > -1 ) {
        // They have passed a valid long code. Simply return the short code
        return conditions[keys[keys.indexOf(inputValue.toLowerCase())]].toUpperCase();
    } else {
        // They might have passed a code
        const values = Object.values(conditions);
        if ( values.indexOf(inputValue.toLowerCase()) > -1) {
            return values[values.indexOf(inputValue.toLowerCase())].toUpperCase();
        }
    }
    return 'NM'
}