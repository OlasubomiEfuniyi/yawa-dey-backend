const express = require("express");
const cors = require("cors");
const mongodb = require("mongodb");

const app = express();
const port = 8080;

app.use(express.urlencoded({extended: true}));
app.use(cors()); //Needed to allow cross origin requests
app.use(express.json());

/*
    Handle a request for episodes given an object of the following type as the body of the request

    {
        seasonNumber: null|String,
        series: null| String
    }
*/
app.post("/episodes", (req, res) => {
    console.log("request made for episodes");
    handleEpisodeRequest(req, res);
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`)
});


async function handleEpisodeRequest(req, res) {
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
                    processEpisodes(req.body, episodes, res, client); 
                }
            });
        }
    });
}

async function processEpisodes(body, episodes, res, client) {
    console.log(`Querying the episodes collection for documents matching ${JSON.stringify(body)}`);
    let cursor = null;

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

    cursor.toArray((err, docs) => {
        if(err) {
            console.log("error occured while attempting to convert cursor to array");
        } else {
            res.status(200).json({episodes: docs});
        }

        client.close();
    });
    
}