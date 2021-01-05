const express = require("express");
const cors = require("cors");
const mongodb = require("mongodb");
const e = require("express");

const app = express();
const port = 8080;

app.use(express.urlencoded({extended: true}));
app.use(cors()); //Needed to allow cross origin requests
app.use(express.json());

/*
    Handle a request for episodes given an object of the following type as the body of the request

    {
        filter: true,
        seasonNumber: null|String,
        series: null| String
    } |

    {
        filter: false,
        searchTerm: string
    }
*/
app.post("/episodes", (req, res) => {
    console.log("request made for episodes");
    handleEpisodesRequest((episodes, client) => processEpisodes(req.body, episodes, res, client));
});


/*
    This enpoint handles a request for a list of all the season numbers.
*/
app.get("/seasons", (req, res) => {
    console.log("request made for seasons");
    handleEpisodesRequest((episodes, client) => processSeasons(episodes, res, client));
});

/*
    This endpoint handles a request for a list of all the series.
*/
app.get("/series", (req, res) => {
    console.log("request made for series");
    handleEpisodesRequest((episodes, client) => processSeries(episodes, res, client));
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`)
});

/*
    This function handles the creation of a collection object that represents the episodes collection. If successful, it invokes the 
    callback, passing it the episodes collection object and the client used to access it. When the callback is complete, the client must
    be closed using client.close().
*/
async function handleEpisodesRequest(callback) {
    const MongoClient = mongodb.MongoClient;
    const uri = "mongodb+srv://olasubomi:j5ThIonON4Z2g1MW@cluster0.ouakf.mongodb.net/yawa-dey?retryWrites=true&w=majority";
    const client = await new MongoClient(uri, {useNewUrlParser: true, useUnifiedTopology: true});
    
    client.connect((err) => {
        if(err) {
            console.log("error occured during connection");
        } else {
            console.log("connection established");
            client.db("yawa-dey").collection("episodes", (err, episodes) => {
                if(err) {
                    console.log("could not obtain episodes collection");
                } else {
                    console.log("obtained episodes collection");
                    callback(episodes, client); 
                }
            });
        }
    });
}

async function processEpisodes(body, episodes, res, client) {
    console.log(`Querying the episodes collection for documents matching ${JSON.stringify(body)}`);
    let cursor = null;

    if(body.filtered) { //You can look for filter keys in the body of the request
        if(body.seasonNumber == null) {
            if(body.series == null) { //no season number and series was provided. Return all episodes
                cursor = await episodes.find({});
            } else { //series was provided. Return all episodes with the provided series tag
                cursor = await episodes.find({series: body.series});
            }
        } else { //season number was provided. Return all episodes with the provided season number
            if(body.series == null) { //no series was provided. Return all episodes with provided season number
                cursor = await episodes.find({seasonNumber: body.seasonNumber});
            } else { //series was provided. Return all episodes with the provided seasonNumber and series tag
                cursor = await episodes.find({seasonNumber: body.seasonNumber, series: body.series});
            }
        }
    } else { //You can look for searchTerm key in the body of the request
        cursor = await episodes.find({title: new RegExp(body.searchTerm, "i")});
    }

    cursor.toArray((err, docs) => {
        if(err) {
            console.log("error occured while attempting to convert cursor to array");
        } else {
            res.status(200).json({episodes: docs});
        }

        client.close();
    });
    
}

async function processSeasons(episodes, res, client) {
    console.log("Querying episodes collection to get a list of all the season numbers");

    episodes.distinct("seasonNumber").then((seasons) => {
        res.status(200).json({seasons: seasons});
        client.close();
    }, (err) => {
        console.log(`error occured when attempting to retrieve season numbers: ${err}`);
    });

}

async function processSeries(episodes, res, client) {
    console.log("Querying episodes collection to get a list of all the series");

    episodes.distinct("series").then((series) => {
        res.status(200).json({series: series});
        client.close();
    }, (err) => {
        console.log(`error occured when attempting to retrieve series: ${err}`);
    });
}