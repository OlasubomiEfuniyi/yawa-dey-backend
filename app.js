/* The server returns the following broad categories of errors
    CONN - Connection Error
    IN - Error caused by malformed input
    PROC - Error that occurs during the processing of some data
*/

const express = require("express");
const cors = require("cors");
const mongodb = require("mongodb");
const compression = require('compression');
const helmet = require("helmet");


const app = express();
const port = 8080;

const corsOptions = {
    origin: true,
    optionsSuccessStatus: 204
};


app.use(express.urlencoded({extended: true}));
app.use(cors(corsOptions)); //Needed to allow cross origin requests
app.use(express.json());
app.use(compression()); //Compress all routes
app.use(helmet()); //Protect app from well-know web vulnerabilities
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
    handleEpisodesRequest((episodes, client) => {    
        processEpisodes(req.body, episodes, client, (result) => {
            res.status(200).json({episodes: result});
        }, (err) => failwithError(res, err));
    }, (err) => {
        failwithError(res, err);
    });
});


/*
    This enpoint handles a request for a list of all the season numbers.
*/
app.get("/seasons", (req, res) => {
    console.log("request made for seasons");
    handleEpisodesRequest((episodes, client) => {
        processSeasons(episodes, client, (seasons) => {
            res.status(200).json({seasons: seasons});
        }, (err) => failwithError(res, err));
    }, (err) => {
        failwithError(res, err);
    });
});

/*
    This endpoint handles a request for a list of all the series.
*/
app.get("/series", (req, res) => {
    console.log("request made for series");
    handleEpisodesRequest((episodes, client) => {
        processSeries(episodes, client, (series) => {
            res.status(200).json({series: series});
        }, (err) => failwithError(res, err));
    }, (err) => {
        failwithError(res, err);
    });
});

// app.listen(port, () => {
//     console.log(`Server is listening on port ${port}`)
// });

/*
    This function handles the creation of a collection object that represents the episodes collection. If successful, it invokes the 
    callback, passing it the episodes collection object and the client used to access it. When the callback is complete, the client must
    be closed using client.close().
*/
async function handleEpisodesRequest(successCallback, errCallback) {
    const MongoClient = mongodb.MongoClient;
    const dev_uri = "mongodb+srv://olasubomi:j5ThIonON4Z2g1MW@cluster0.ouakf.mongodb.net/yawa-dey?retryWrites=true&w=majority";
    //When in production the environment variable MONGODBURI will be set to the appropriate uri. If the environment variable is not set,
    //use the development uri
    const mongodb_uri = process.env.MONGODBURI ? process.env.MONGODBURI : dev_uri; 
    const client = await new MongoClient(mongodb_uri, {useNewUrlParser: true, useUnifiedTopology: true});
    

    client.connect((err) => {
        if(err) {
            console.log("error occured while trying to connect to mongodb")
            errCallback({type: "CONN", message: "Error occured while trying to connect to database", object: err});
        } else {
            console.log("connection established");
            client.db("yawa-dey").collection("episodes", (err, episodes) => {
                if(err) {
                    console.log("could not obtain episodes collection");
                    errCallback({type: "PROC", message: "Error occures while trying to access the required collection of data", object: err});
                } else {
                    console.log("obtained episodes collection");
                    successCallback(episodes, client); 
                }
            });
        }
    });
}

async function processEpisodes(body, episodes, client, successCallback, errCallback) {
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
            client.close();
            errCallback({type: "PROC", message: "Error occured while trying to process the retrieved episodes", object: err});
        } else {
            successCallback(docs);
        }

        client.close();
    });
    
}

async function processSeasons(episodes, client, successCallback, errCallback) {
    console.log("Querying episodes collection to get a list of all the season numbers");

    episodes.distinct("seasonNumber").then((seasons) => {
        successCallback(seasons);
        client.close();
    }, (err) => {
        console.log(`error occured when attempting to retrieve season numbers: ${err}`);
        client.close();
        errCallback({type: "PROC", message: "Error occured while attempting to retrieve season numbers from collection", object:err});
    });

}

async function processSeries(episodes, client, successCallback, errCallback) {
    console.log("Querying episodes collection to get a list of all the series");

    episodes.distinct("series").then((series) => {
        successCallback(series);
        client.close();
    }, (err) => {
        console.log(`error occured when attempting to retrieve series: ${err}`);
        client.close();
        errCallback({type: "PROC", message: "Error occured while attempting to retrieve series information from collection", object:err});
    });
}

async function failwithError(res, err) {
    console.log("returning error object");
    res.status(404).json(err);
}