 
//csvToJson.generateJsonFileFromCsv(fileInputName,fileOutputName);

//var express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs')
const csv = require('csv-parser')
  
const app = express();
const port = 80;

app.use(fileUpload());
/*
app.get('/', (req, res) => res.send(`
<form action="/upload" method="post" enctype="multipart/form-data">
<input name="csvFile" type="file" />
<input type="submit">
</form>
`)); */  

exports.csvReader = (req, res) => {
    if (Object.keys(req.files).length == 0) {
        return res.status(400).send('No files were uploaded.');
    }

    var tmpfilename = new Date().getTime() + '-file.csv';
    var tmpfilepath = 'tmp/' + tmpfilename;

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    let sampleFile = req.files.csvFile;


    // Use the mv() method to place the file somewhere on your server
    sampleFile.mv(tmpfilepath, function(err) {
    if (err)
        return res.status(500).send(err);

        const results = [];
        
        fs.createReadStream(tmpfilepath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            console.log(results);
            res.json(results);
        });
        
    });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

