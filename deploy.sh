npm run build
gcloud functions deploy echo-csv-reader --runtime nodejs10 --trigger-http --entry-point server --project echomtg-website