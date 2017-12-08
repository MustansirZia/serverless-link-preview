# serverless-link-preview.

[![MIT Licence](https://badges.frapsoft.com/os/mit/mit.svg?v=103)](https://opensource.org/licenses/mit-license.php)

### A serverless, scalable website preview service built using [Node.js](https://nodejs.org/en/), [Express.js](https://expressjs.com/), [memory-cache](https://github.com/ptarjan/node-cache) and deployed using [Up](https://github.com/apex/up).
<br />

This repository is basically a follow up to an article that I wrote [here](https://mustansirzia.com/posts/link-preview/).
<br />
<br />

It is RESTful API service that will take in a website URL and reply with its <b>title</b>, <b>description</b>, a <b>thumbnail preview</b> of the first image found on the website along with the <b>site name</b>. Scrapping is done using  [@nunkisoftware/link-preview](https://github.com/nunkisoftware/link-preview). It is serverless and runs on <b>AWS Lambda</b> as <b>Function as a Service</b> <b>(FaaS)</b>. Since there is no server or other hardware considerations it can scale to mammoth proportions as Amazon will automatically deploy copies of our exported functions depending on the load.
<br />
<br />


## Installation.
• Install <b>Up</b> globally.<br />
`$ npm i -g up`
<br />
<br />

• Then, you've two choices. Either clone this repo, install local dependencies skip to the very last step.<br />
`$ git clone https://github.com/MustansirZia/serverless-link-preview`<br />

`$ npm i`

<br />
OR follow along,
<br />

• First, initialise the project yourself by creating these files.<br />
`$ touch package.json up.json app.js`
<br />
<br />

• Then, add a few local packages.<br />
`$ npm i express memory-cache @nunkisoftware/link-preview --save`
<br />
<br />

• Add a `scripts` section to your `package.json` so Up knows how to start your express server.
```json
{
  "name": "serverless-link-preview",
  "version": "0.0.1",
  "description": "Serverless service to get website description and preview deployed on AWS Lambda.",
  "main": "app.js",
  "license": "MIT",
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    "@nunkisoftware/link-preview": "^0.2.0",
    "express": "^4.16.2",
    "memory-cache": "^0.2.0"
  }
}
```

<br />

• Write an express server inside `app.js` with a single GET endpoint at `/` which would take a query param `url`. This would be our website url whose preview we require.

```js
const express = require('express');
const linkPreview = require('@nunkisoftware/link-preview');
const mCache = require('memory-cache');

const app = express();

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
    linkPreview(url)
          .then(function (response) {

              if (!response.siteName) {
                  // If the url given is incorrect.
                  res.status(400).json({ message: 'Invalid URL given.' });
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
```

Please note that we also employ an in memory cache to store recent website previews so we don't query `link-preview` on every frequent homogenous request (as that's a time/resource expensive thing to do) and thus serve the cached result to our client.

<i>The following two steps can also be accomplished using environment variables but making a separate file is much cleaner and will make our deployment super easy by writing a single command</i>, `Up`.<br />

• Add a single entry to our `up.json` so Up knows where and how to find our AWS credentials.
```json
{
  "profile": "aws"
}
```
<br />
<br />
<i>This is a one time step and won't be required for subsequent Up deployments.</i><br />

• Finally, create the aws credentials file at `~/.aws/` and fill in your IAM credentials.


`$ mkdir -p ~/.aws && touch ~/.aws/credentials`<br />
`$ gedit ~/.aws/credentials` or `$ nano ~/.aws/credentials` and paste the following in.<br />

Replace `$YOUR_ACCESS_ID` and `$YOUR_ACCESS_KEY` with your own. Find them from [here.](https://help.bittitan.com/hc/en-us/articles/115008255268-How-do-I-find-my-AWS-Access-Key-and-Secret-Access-Key-) It could be beneficial to create a new IAM user just for this purpose.

```
[aws]
aws_access_key_id = $YOUR_ACCESS_ID
aws_secret_access_key = $YOUR_ACCESS_KEY
```

Save the file and that's it.

<i>To verify our installation, key in `npm start` from the directory that houses our `app.js`.<br />
From another terminal window, request our service like so. <br />
`$ curl localhost:3000?url=https://www.youtube.com/watch?v=NUWViXhvW3k`
You should see a familiar JSON and this verifies our installation.</i>

```json
{
  "url": "https://www.youtube.com/watch?v=NUWViXhvW3k",
  "image": "https://i.ytimg.com/vi/NUWViXhvW3k/maxresdefault.jpg",
  "imageWidth": null,
  "imageHeight": null,
  "imageType": null,
  "title": "Building the CLEANEST Desk Setup!!!",
  "description": "My setup tour: https://goo.gl/nv0nja ADD ME ON SNAPCHAT TO STAY UP TO DATE WITH MY SETUP PROGRESS: Snapchat: Kenneth.YT or KDKHD SNAP CODE: http://kennethkre...",
  "siteName": "YouTube"
}
```
<br />
Inside the same directory, deploy the service with a <b>single</b> command. <br />

### `$ up`
<br />
<br />

After the deployment is complete, get the service's URL like so.<br />
`$ up url`<br />

The url with the query param could look similar to this. <br />
[`https://hfnuua77fd.execute-api.us-west-2.amazonaws.com/development?url=https://www.youtube.com/watch?v=NUWViXhvW3k`](https://hfnuua77fd.execute-api.us-west-2.amazonaws.com/development?url=https://www.youtube.com/watch?v=NUWViXhvW3k)</a>

And there you have it, your own serverless and scalable website preview service built and deployed on AWS Lambda.<br />
Query with your favourite http client inside any application.

## Further Reading.
• Documentation for <b>[Up.](https://up.docs.apex.sh/#introduction)</b>

## License.
• [MIT.](https://github.com/MustansirZia/serverless-link-preview/blob/master/LICENSE.txt)
