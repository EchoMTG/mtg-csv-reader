## Project Goal

Be able to read CSV or XLS files of magic the gathering cards which must contain at least this columns:

* card name (string)
* card expansion (string)
* card expansion set code (3-5 chars) e.g. LEA INN
* acquired date (date)
* acquired price (float)
* language (string ether short code or full name) e.g. EN or English
* condition (string 1-2 chards) NM/M/LP/MP/D etc
* foil (boolean)

## Current Concepts

1. Be able to read both formats and convert it into a javascript object that can be iterated over
2. Return the data in a uniform JSON object like

```
{
    "name" : "Snapcaster Mage",
    "expansion" : "innistrad",
    "set_code" :"inn",
    "date_acquired" : "2011-09-12", // optional
    "price_acquired" : "4.80", // optional    
    "condition" : "nm", // optional
    "foil" : true, // optional defaults to false
    "language" : "EN" // optional defaults to EN

}
```

## Supported Formats

You can upload a CSV using the exact headers above

## Upload Format Details
The processor has some logic built in to support as wide of an upload format as possible. Right now, there are a few requirements:
- The POST request should have a mimetype of `text/csv`. In the future, supporting more varied formats will depending on that.
- There are only two required fields in the upload: `name` and `set_code || set_name || set`

    Here is a list of valid headers for each field and how we attempt to coerce them:
    ```
    const DEFAULT_NAME_HEADERS: string[] = ['NAME', 'CARD NAME', 'CARD', 'Name', 'Card Name', 'Card', 'name'];
    const DEFAULT_DATE_HEADERS: string[] = ['ACQUIRED', 'ACQUIRED ON', 'ADDED', 'ACQUIRED_DATE', 'DATE_ACQUIRED', 'Date Acquired', 'acquired_date'];
    const DEFAULT_PRICE_HEADERS: string[] = ['ACQUIRED PRICE', 'VALUE', 'ACQUIRED_VALUE', 'PRICE_ACQUIRED', 'ACQUIRED_PRICE', 'Price', 'Value', 'acquired', 'Acquired', 'acquired_price'];
    const DEFAULT_CONDITION_HEADERS: string[] = ['CONDITION', 'Condition'];
    const DEFAULT_SET_HEADERS: string[] = ['EXPANSION', 'SET', 'PRINTING', 'Set', 'Expansion', 'set', 'expansion'];
    const DEFAULT_SET_CODE_HEADERS: string[] = ['SET_CODE', 'CODE', 'Code', 'Set Code'];
    const DEFAULT_QUANTITY_HEADERS: string[] = ['reg qty', 'quantity', 'Quantity'];
    const DEFAULT_FOIL_QUANTITY_HEADERS: string[] = ['foil qty'];
    ```
    For each of those headers, we will attempt to match those strings. ( e.g. - You could passe the date_acquired column with a header of 'ACQUIRED ON')
    
    ### Determine Card Validity
    1. The card name must exist in the set
    2. The card name in that set must have an EchoID
    3. The SetCode is key. `You must pass the correct set code`. If you pass a card like `Platinum Angel` in Expansion `Mirrodin` but set is `MIR` the import will fail because MIR is Mirage, not Mirrodin
    4. You can interchange Set & code in the upload, we will valiate each as valid, and swap them if they are simply transposed.
    
## Running

To install all required libraries

`npm install`

To run the code in development mode:

`RUN_LOCAL=1 npm run dev`

To build the code:

`npm run build`

select CSV to upload, click submit