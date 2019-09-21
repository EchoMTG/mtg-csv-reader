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

## Ideas to tackle

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
    "lanaguage" : "EN" // optional defaults to EN

}

## Testing 

From root directory in terminal

`npm install`

`npm start`

open browser to `http://localhost/`

select CSV to upload, click submit