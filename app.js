const express = require('express');
const fs = require("fs");
const logger = require('morgan');
const sleep = require('sleep');

const app = express();

/**
 * data: {
 *  images: {
 *      [key:string]:{ // The key is formed by the seed (if a seed is already present, bigger size is used)
 *          url: string, // Just the filename
 *          seed: string, // An ASCII character sequence
 *          size: number, // The size of the picture
 *          generated: number, // A Javascript date long value
 *      }, ...
 *  }
 * }
 */

let data = {
    images: {
        '|5?CK!;`V9a+~': {
            url: 'randimg_CKVa_512.jpg',
            seed: '|5?CK!;`V9a+~',
            size: 512,
            generated: 1542912627692
        },
        '=C\n4}6IML9': {
            url: 'randimg_CIML_512.jpg',
            seed: '=C\n4}6IML9',
            size: 512,
            generated: 1542918945872
        },
        'CMeHB\r': {
            url: 'randimg_CMeHB_512.jpg',
            seed: 'CMeHB\r',
            size: 512,
            generated: 1543003087622
        },
        'C91K"s': {
            url: 'randimg_CKs_512.jpg',
            seed: 'C91K"s',
            size: 512,
            generated: 1542939589932
        }
    }
};

function sorter(data) {
    return Object.values(data.images).sort((image, other) => { return image.generated - other.generated });
}

let view = sorter(data);

let writeAwait = false;

const DB = "./database.db"

if (fs.existsSync(DB)) {
    data = JSON.parse(fs.readFileSync(DB).toString())
    view = sorter(data)
} else {
    // save default
    fs.writeFileSync(DB, JSON.stringify(data))
}

const AD = "./ad.key"
let key

if (fs.existsSync(AD)) {
    key = fs.readFileSync(AD).toString()
    if (key.length < 10) {
        console.error("Storage key is too short")
        process.exit(1);
    }
} else {
    console.error("No storage key provided")
    process.exit(1);
}

app.use(function(req, res, next){
    console.log('\033[1;34m[I]\033[0;00m Request to ' + req.originalUrl)
    res.header('Access-Control-Allow-Origin', '*')
    next();
});



app.use(logger('dev'));
// app.use(bodyParser.json)
app.use(express.json());

app.get("/", (_, res) => res.json({ status: "up" }));

app.post('/store', function (req, res, next) {
    if (req.query.secret === key) {
        while (writeAwait === true) { // Wait while lock is in use
            sleep.msleep(5)
        }

        writeAwait = true // Acquire lock
        try {
            // Update the DB from POST data
            if (
                req.body.hasOwnProperty("url") && req.body.hasOwnProperty("seed") &&
                req.body.hasOwnProperty("size") && req.body.hasOwnProperty("generated")
            ) {
                const candidate = req.body
                if(
                    !data.images[candidate.seed] || // new picture
                    data.images[candidate.seed] && data.images[candidate.seed].generated < Number(candidate.generated) // newer
                ) {
                    data.images[candidate.seed] = {
                        url: candidate.url,
                        seed: candidate.seed,
                        size: Number(candidate.size),
                        generated: Number(candidate.generated),
                    }

                    // store entry
                    fs.writeFileSync(DB, JSON.stringify(data))

                    // update view
                    view = sorter(data)
                    res.json(view)
                } else {
                    res.sendStatus(204)
                }
            } else {
                res.sendStatus(203)
            }
        } catch (e) {

        } finally {
            writeAwait = false // Release lock
        }
    } else
        res.sendStatus(404)
});

app.get('/next', function (req, res, next) {
    let cursor = Number(req.query.start) || 0
    let size = Number(req.query.size || 20)
    res.json(view.slice(cursor, cursor + size));
});



module.exports = app;
