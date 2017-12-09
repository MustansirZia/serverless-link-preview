const express = require('express');
const linkPreview = require('@nunkisoftware/link-preview');
const mCache = require('memory-cache');
const cors = require('cors');

const app = express();

// Apply cors to provide asynchronous access from browsers.
app.use(cors());

// Validation middleware to simply check the url query param.
const validate = function (req, res, next) {
    const url = req.query.url;
    if (!url) {
        res.status(400).json({ message: 'url query param missing.' });
        return;
    }
    next();
};

// Function which returns an in memory cache middleware.
const cache = function (duration) {
    return function (req, res, next) {
        const key = req.query.url;

        // Try to get cached response using url param as key.
        const cachedResponse = mCache.get(key);

        if (cachedResponse) {

            // Send cached response.
            res.json(cachedResponse);
            return;

        }

        // If cached response not present,
        // pass the request to the actual handler.
        res.originalJSON = res.json;
        res.json = function (result) {

            // Cache the newly generated response for later use
            // and send it to the client.
            mCache.put(key, result, duration * 1000);
            res.originalJSON(result);

        };
        next();
    };
};

// Actual get handler with cache set to 3 minutes.
app.get('/', validate, cache(180), function (req, res) {
    const url = req.query.url;

    // Get the actual response from link-preview.
    // Wait for 5 secs before calling a timeout.
    linkPreview(url, 5000)
          .then(function (response) {

              if (!response.title) {
                  // If the url given is incorrect.
                  res.status(400).json({ message: 'Invalid URL given or timeout occured.' });
                  return;
              }

              res.json(response);
          })
          .catch(function (err) {
              res.status(500).send('Internal Server Error.');
          });
});

// Listen on the port provided by Up.
app.listen(process.env.PORT || 3000);
