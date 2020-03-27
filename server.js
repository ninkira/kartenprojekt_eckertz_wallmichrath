/*
Dieses Skript beinhaltet alle grundlegenden Methoden um die Datenbank gotinfo - in Funktion GOT INFO genannt -
auszulesen und zu bearbeiten. Diese werden in den HMTL Dateien an verschiedenen Orten verwendet.
*/
// bodyParse stmts um schnelleren Datenaustausch zu ermöglichen
var express = require("express");
var bodyParser = require("body-parser");
var path = require("path");
var app = express();

// DB expressions
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('gotInfo');
// diese stmts optimieren die SQLite Datenverarbeitung, z.B. asynchrone Verarbeitung
// https://stackoverflow.com/questions/1711631/improve-insert-per-second-performance-of-sqlite
db.run("PRAGMA synchronous = OFF", function (err) {
    console.log("synchronous = OFF:" + err);
});
db.run("PRAGMA journal_mode = MEMORY", function (err) {
    console.log("journal_mode = MEMORY:" + err);
});
db.run("PRAGMA optimize", function (err) {
    console.log("optimize:" + err);
});
db.get("PRAGMA page_size", function (err, page) {
    console.log("page_size:" + JSON.stringify(page) + " " + err);
});
// kontrolle ob index angelegt ist
db.get("PRAGMA index_list('GOTINFO')", function (err, indexlist) {
    console.log("index_list GOTINFO:" + JSON.stringify(indexlist) + " " + err);
});
db.all("PRAGMA table_info('GOTINFO')", function (err, felder) {
    if (typeof felder === "undefined" || felder === null || felder.length === 0) {
        console.log("Tabelle GOTINFO nicht vorhanden");
    } else {
        for (var ifeld = 0; ifeld < felder.length; ifeld++) {
            console.log(JSON.stringify(felder[ifeld], null, ""));
        }
    }
});

// bodyParser parameter - damit kann der request unedlich groß werden
app.use(bodyParser.json({
    limit: '50mb'
}));

app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 50000
}));

// Verweis auf den Order, in dem die Projektdateien liegen
app.use(express.static(path.join(__dirname, 'static')));

/* Datenbank Methoden
- sind alle ähnlich aufgebaut
- var record - Datencontainer, aus dem entweder gelesen oder reingeschreiben
*/
app.get('/createDB', function (req, res) {
    // https://github.com/mapbox/node-sqlite3
    // https://www.w3resource.com/node.js/nodejs-sqlite.php 
    db.serialize(function () {
        var createStmt = 'CREATE TABLE IF NOT EXISTS GOTINFO(';
        createStmt += 'longitude TEXT,';
        createStmt += 'latitude TEXT,';
        createStmt += 'name TEXT,';
        createStmt += 'info TEXT,';
        createStmt += 'icon TEXT,';
        createStmt += 'historicalbackground TEXT,';
        createStmt += 'placecategory TEXT,';
        createStmt += 'charactercategory TEXT,';
        createStmt += 'housecategory TEXT,';
        createStmt += "kampagnecategory TEXT";
        createStmt += ')';
        db.run(createStmt, function (err) {
            console.log("create table: " + err);
        });
    });
});

// wird bei der initialisierung der Karte aufgerufen, um alle bisher eingetragenen Punkte abzubilden
app.get('/readAll', function (req, res) {

    db.serialize(function () {

        db.all("SELECT * FROM GOTINFO", function (err, allRows) {
            if (err) {
                console.log(err);
                var smsg = JSON.stringify({
                    error: true,
                    message: err
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            } else {
                var records = [];
                allRows.forEach(function (row) {
                    console.log(JSON.stringify(row));
                    records.push(row);
                });
                smsg = JSON.stringify({
                    error: false,
                    message: "Sätze gefunden: " + records.length,
                    records: records
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            }

        });
    });
});

app.get('/readDB', function (req, res) {
    db.serialize(function () {
        var selLong = "";
        if (req.query && typeof req.query.longitude
            !== "undefined" && req.query.longitude.length > 0) {
            selLong = req.query.longitude;
        }

        var selLat = "";
        if (req.query && typeof req.query.latitude
            !== "undefined" && req.query.latitude.length > 0) {
            selLat = req.query.latitude;
        }
        var queryStmt = "SELECT * FROM GOTINFO";
        queryStmt += " WHERE longitude = '" + selLong + "'";
        queryStmt += " AND latitude = '" + selLat + "'";
        //https://stackoverflow.com/questions/39106668/node-js-sqlite3-read-all-records-in-table-and-return
        // method to read table
        console.log("Query Statement: " + queryStmt);
        db.get(queryStmt, function (err, record) {

            if (err !== null) {

                console.log(err);
                var smsg = JSON.stringify({
                    error: true,
                    message: err
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            } else if (typeof record === "undefined") {

                console.log(err);
                var smsg = JSON.stringify({
                    error: true,
                    message: "Kein Satz gefunden"
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            } else {
                smsg = JSON.stringify({
                    error: false,
                    message: "Satz gefunden",
                    record: record
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            }

        });
    });
});

// eintrag in db schreiben
app.post('/writeDB', function (req, res) {
    db.serialize(function () {
        var selLong = "";
        if (req.body && typeof req.body.longitude
            !== "undefined" && req.body.longitude.length > 0) {
            selLong = req.body.longitude;
        }

        var selLat = "";
        if (req.body && typeof req.body.latitude
            !== "undefined" && req.body.latitude.length > 0) {
            selLat = req.body.latitude;
        }

        var record = {};

        if (req.body && typeof req.body.record
            !== "undefined" && Object.keys(req.body.record).length > 0) {
            record = req.body.record;
        }


        var name = record.name;
        var info = record.info;
        var historicalbackground = record.historicalbackground;
        var placecategory = record.placecategory;
        var charactercategory = record.charactercategory;
        var housecategory = record.housecategory;
        var icon = record.icon;
        var kampagnecategory = record.kampagnecategory;


        var insStmt = "INSERT INTO GOTINFO ";
        insStmt += "(longitude, latitude, name, info, historicalbackground, placecategory, charactercategory, housecategory, kampagnecategory, icon)";
        insStmt += " VALUES('" + selLong + "', ";
        insStmt += "'" + selLat + "',";
        insStmt += "'" + name + "',";
        insStmt += "'" + info + "',";
        insStmt += "'" + historicalbackground + "',";
        insStmt += "'" + placecategory + "',";
        insStmt += "'" + charactercategory + "',";
        insStmt += "'" + housecategory + "',";
        insStmt += "'" + kampagnecategory + "',";
        insStmt += "'" + icon + "')";

        //https://stackoverflow.com/questions/39106668/node-js-sqlite3-read-all-records-in-table-and-return
        // method to read table
        console.log("Insert Statement: " + insStmt);
        db.run(insStmt, function (err) {

            if (err !== null) {

                console.log(err);
                var smsg = JSON.stringify({
                    error: true,
                    message: err
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            } else {
                var smsg = JSON.stringify({
                    error: false,
                    message: "Insert war erfolgreich: " + this.lastID
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            }

        });
    });
});



app.post('/updateDB', function (req, res) {
    db.serialize(function () {
        var selLong = "";
        if (req.body && typeof req.body.longitude
            !== "undefined" && req.body.longitude.length > 0) {
            selLong = req.body.longitude;
        }

        var selLat = "";
        if (req.body && typeof req.body.latitude
            !== "undefined" && req.body.latitude.length > 0) {
            selLat = req.body.latitude;
        }

        var record = {};

        if (req.body && typeof req.body.record
            !== "undefined" && Object.keys(req.body.record).length > 0) {
            record = req.body.record;
        }

        var rnd = Math.floor(Math.random() * 1000000);
        var name = record.name;
        var info = record.info;
        var historicalbackground = record.historicalbackground;
        var placecategory = record.placecategory;
        var charactercategory = record.charactercategory;
        var housecategory = record.housecategory;
        var kampagnecategory = record.kampagnecategory;
        var icon = record.icon;

        var updtStmt = "UPDATE GOTINFO ";
        updtStmt += "SET ";
        updtStmt += "name='" + name + "',";
        updtStmt += "info='" + info + "',";
        updtStmt += "historicalbackground='" + historicalbackground + "',";
        updtStmt += "placecategory='" + placecategory + "',";
        updtStmt += "charactercategory='" + charactercategory + "',";
        updtStmt += "housecategory='" + housecategory + "',";
        updtStmt += "kampagnecategory='" + kampagnecategory + "',";
        updtStmt += "icon='" + icon + "'";
        updtStmt += " WHERE longitude = '" + record.longitude + "'";
        updtStmt += " AND latitude = '" + record.latitude + "'";

        //https://stackoverflow.com/questions/39106668/node-js-sqlite3-read-all-records-in-table-and-return
        // method to read table
        console.log("Update Statement: " + updtStmt);
        db.run(updtStmt, function (err) {

            if (err !== null) {

                console.log(err);
                var smsg = JSON.stringify({
                    error: true,
                    message: err
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            } else {
                var smsg = JSON.stringify({
                    error: false,
                    message: "Update war erfolgreich: " + this.lastID
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            }

        });
    });
});


// Eintrag bzw. Punkt auf der Karte löschen
app.post('/deleteRow', function (req, res) {

    db.serialize(function () {
        var selLong = "";
        if (req.body && typeof req.body.longitude
            !== "undefined" && req.body.longitude.length > 0) {
            selLong = req.body.longitude;
        }

        var selLat = "";
        if (req.body && typeof req.body.latitude
            !== "undefined" && req.body.latitude.length > 0) {
            selLat = req.body.latitude;
        }

        var delStmt = "DELETE FROM GOTINFO ";
        delStmt += " WHERE longitude = '" + selLong + "'";
        delStmt += " AND latitude = '" + selLat + "'";

        //https://stackoverflow.com/questions/39106668/node-js-sqlite3-read-all-records-in-table-and-return
        // method to read table
        db.run(delStmt, function (err) {

            if (err !== null) {
                console.log(err);
                var smsg = JSON.stringify({
                    error: true,
                    message: err
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            } else {
                // löschen des Markers in der Map
                var smsg = JSON.stringify({
                    error: false,
                    message: "Delete war erfolgreich: " + this.lastID
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            }

        });
    });
});

// Initiale Hello World Test Funktion
app.get("/", function (req, res) {
    res.send("Hello World");
});


// Server Funktion mit def vom port
app.listen(3000, function () {
    console.log("App listening on Port 3000");
    // Protokoll der voehandenen Sätze
    db.all("SELECT * FROM GOTINFO", function (err, allRows) {
        if (err) {
            console.log(err);
        } else {
            allRows.forEach(function (row) {
            })
        }
    });
});