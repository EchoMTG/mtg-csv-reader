import {CardParser} from "../card_parsers";

const DEFAULT_NAME_HEADERS: string[] = ['card name', 'card', 'name', 'title'];
const DEFAULT_DATE_HEADERS: string[] = ['acquired', 'acquired on', 'added', 'acquired_date', 'date_acquired', 'date acquired', 'acquired date'];
const DEFAULT_PRICE_HEADERS: string[] = ['acquired price', 'value', 'acquired_value', 'price_acquired', 'price', 'acquired', 'acquired_price','price each'];
const DEFAULT_CONDITION_HEADERS: string[] = ['condition'];
const DEFAULT_TCGID_HEADERS: string[] = ['product id','tcgid','tcgplayer_id','tcgplayer id','productid', 'tcgplayer productid','tcgplayer product id'];
const DEFAULT_COLLECTORS_NUMBER_HEADERS: string[] = ['collectors_number', 'setnumber','set number','set_number','collector\'s number','collector number','collector id','card number','cardnumber','number'];
const DEFAULT_SET_HEADERS: string[] = ['set','Set','set name', 'Set Name', 'expansion','Expansion','edition','Edition'];
const DEFAULT_SET_CODE_HEADERS: string[] = ['set_code', 'code',  'set code', 'expansion code','Edition Code', 'edition code','[code]','edition (code)'];
export const DEFAULT_HEADERS: string[] = ['name', 'expansion', 'set_code', 'date_acquired', 'price_acquired', 'condition', 'foil', 'language', 'quantity'];
// const DEFAULT_LANGS: string[] = ['EN', 'GR', 'FR', 'SP', 'CS', 'IT', 'JP', 'CT', 'KR', 'RU', 'English', 'French', 'Spanish', 'Chinese - Simplified', 'Italian', 'Japanese', 'Chinese - Traditional', 'Korean', 'Russian'];
const DEFAULT_QUANTITY_HEADERS: string[] = ['reg qty', 'quantity', 'Quantity', 'count','Count'];
const DEFAULT_FOIL_QUANTITY_HEADERS: string[] = ['foil qty'];
// const DEFAULT_CONDITIONS: string[] = ['NM', 'MINT', 'EX', 'HP', 'LP', 'DMG'];

let myHeaderHelper: { [index: string]: string[] } = {};
myHeaderHelper['name'] = DEFAULT_NAME_HEADERS;
myHeaderHelper['set_code'] = DEFAULT_SET_CODE_HEADERS;
myHeaderHelper['expansion'] = DEFAULT_SET_HEADERS;
myHeaderHelper['tcgid'] = DEFAULT_TCGID_HEADERS;
myHeaderHelper['collectors_number'] = DEFAULT_COLLECTORS_NUMBER_HEADERS;
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
            if (this.defaultHeaders[goodHeader].indexOf(testHeader.toLowerCase().trim()) !== -1) {
                matchedHeader = goodHeader;
            }
        });

        return matchedHeader;
    }

}

export let headerHelper = new HeaderHelper(myHeaderHelper);