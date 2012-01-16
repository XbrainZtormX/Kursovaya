var xml2js = require('xml2js')
  , fs = require('fs')
  , async = require('async')
  , readFile = function(path){ return fs.readFileSync(__dirname + '/data/' + path).toString(); };

var parser = new xml2js.Parser();

// files
var graphml = readFile('graphml.xml')
  , map = readFile('map.osm');

async.map([ graphml, map ], parser.parseString, function(err, result){
  if(err)
    throw new Error(err);
  console.log(result[1])
});
