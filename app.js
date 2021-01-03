const express = require("express");
const cors = require("cors");
const mongodb = require("mongodb");

const app = express();
const port = 8080;

app.use(express.urlencoded({extended: true}));
app.use(cors()); //Needed to allow cross origin requests
app.use(express.json());

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
                    processEpisodes(req.body.seasonNumber, episodes, res); 
                    //client.close();
                }
            });
        }
    });
}

async function processEpisodes(seasonNumber, episodes, res) {
    console.log(`Querying the episodes collection for documents with season # ${seasonNumber}`);

    let cursor = await episodes.find({seasonNumber: seasonNumber});

    cursor.toArray((err, docs) => {
        if(err) {
            console.log("error occured while attempting to convert cursor to array");
        } else {
            res.status(200).json({episodes: docs});
        }
    });
    
}