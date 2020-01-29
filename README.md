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

1. Be able to read both formats and convert it into a javascrip object that can be iterated over
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


## Running

To install all requied libraries

`npm install`

To run the code in development mode:

`RUN_LOCAL=1 npm run dev`

To build the code:

`npm run build`

select CSV to upload, click submit