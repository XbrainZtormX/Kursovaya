var xml2js = require('xml2js')
  , fs = require('fs')
  , readFile = function(path){ return fs.readFileSync(__dirname + '/data/' + path).toString(); };

var parser = new xml2js.Parser();

// files
var graphml = readFile('graphml.xml')
  , map = readFile('map.osm');

parser.parseString(graphml, function(err, result){
  console.log(result)
})
