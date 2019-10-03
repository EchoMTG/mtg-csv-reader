## Project Goal

Be able to read CSV or XLS files of magic the gathering cards which can contain these columns

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
2. detact fields by sample a few items of each column to make a best guess on what the column is
3. Return the data in a uniform JSON object like

```{
    "name" : "Snapcaster Mage",
    "expansion" : "innistrad",
    "set_code" :"inn",
    "date_acquired" : "2011-09-12", // optional
    "price_acquired" : "4.80", // optional    
    "condition" : "nm", // optional
    "foil" : true, // optional defaults to false
    "language" : "EN" // optional defaults to EN

}

## Supported Formats

You can upload a CSV with our without headers. 

## Supported Headers

Header names will be converted to snake case. This means you could use SetCode/setCode/Set Code for set_code

## Best Effort Mappings

* Expansion: This value will be compared against a list of all know magic sets
* Set Code: This value will be compared against a list of all known magic set codes
* Foil: True/true/Yes/yes, otherwise false
* Language: EN,English,GR,German,RU,Russion,SP,Spanish,CS,Chinses Simplified,CT, Chinese Traditional,etc
* Price Acquired: A number, optionally followed by a decimal and 2 more numbers
* Date Acquired: Date in format: YYYY/MM/DD OR YYYY/M/D OR MM/DD/YYYY OR M/D/YYYY

## Running

To install all requied libraries

`npm install --prefix functions`

To run the code in development mode:

`npm run --prefix functions dev`

To build the code:

`npm run --prefix functions build`

To deploy the code to firebase:

`firebase deploy --only functions` 

select CSV to upload, click submit