const express = require("express");
const cors = require("cors");
const mongodb = require("mongodb");

const app = express();
const port = 8080;

app.use(express.urlencoded({extended: true}));
app.use(cors()); //Needed to allow cross origin requests
app.use(express.json());

app.post("/episodes", handleEpisodeRequest);

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`)
});


async function handleEpisodeRequest(req, res) {
    const MongoClient = mongodb.MongoClient;
    const uri = "mongodb+srv://olasubomi:j5ThIonON4Z2g1MW@cluster0.ouakf.mongodb.net/yawa-dey?retryWrites=true&w=majority";
    const client = await new MongoClient(uri, {useNewUrlParser: true, useUnifiedTopology: true});
    
    client.connect((err) => {
        if(err) {
            status = 404; //error occured 
        } else {
            client.db("yawa-dey").collection("episodes", (err, episodes) => {
                processEpisodes(req.body.seasonNumber, err, episodes); 
                //client.close();
            });
        }
    });
}

async function processEpisodes(seasonNumber, err, episodes) {
    let status = 200;

    if(err) {
        status = 404; //error occured
    } else {
        let cursor = episodes.find({seasonNumber: seasonNumber});
        await cursor.forEach(console.log);
    }

    return {status: status, episodes: ""};
}