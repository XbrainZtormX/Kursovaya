var express = require('express')
  , jade = require('jade')
  , app = express.createServer(
      express.bodyParser()
    )
  , defaultPrecision = 0.00005;

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('view options', { layout: 'layouts/default', precision: defaultPrecision });
app.register('.jade', jade);


var xml2js = require('xml2js')
  , fs = require('fs')
  , async = require('async')
  , readFile = function(path){ return fs.readFileSync(__dirname + '/data/' + path).toString(); };

var parser = new xml2js.Parser();

var parse = function(req, res, next){
  var precision = parseFloat(req.body.precision) || defaultPrecision;

  if(!precision)
    precision = defaultPrecision;

  var graphml = readFile('graphml.xml')
    , map = readFile('map.osm');

  async.map([ graphml, map ], parser.parseString, function(err, data){
    if(err)
      throw new Error(err);

    var table = {};
    // graphml
    (function(){
      var hash = {};
      data[0].graph.node.forEach(function(node){
        var id = node['@'].id
          , result = {};

        node.data.forEach(function(data){
          result[data['@'].key.toLowerCase()] = parseFloat(data['#'].replace(',', '.'));
        });

        result.id = id;
        hash[id] = result;
      });

      table['graphml'] = hash;
    })();

    // map(osm)
    (function(){
      var hash = {};
      data[1].node.forEach(function(node){
        node = node['@'];
        hash[node.id] = { y: parseFloat(node.lat), x: parseFloat(node.lon), id: node.id };
      });

      table['map'] = hash;
    })();

    var Result = [];
    (function(){
      for(var i in table['graphml']){
        var g = table['graphml'][i];
        for(var j in table['map']){
          var m = table['map'][j];
          if(Math.sqrt( Math.pow(g.x - m.x, 2) + Math.pow(g.y - m.y, 2) ) < precision){
            var result = {
              graphml: {},
              map: {},
              diff: {
                x: Math.abs(g.x - m.x),
                y: Math.abs(g.y - m.y)
              }
            }

            result.graphml = g;
            result.map = m;
            Result.push(result);
          }
        }
      }
    })();

    req.parse = Result;
    next();
  });

}

app.post('/', parse, function(req, res, next){
  res.render('index', { parse: req.parse, precision: req.body.precision || defaultPrecision });
})

app.get('/', function(req, res, next){
  res.render('index', { parse: false });
});

app.listen(3000, '127.0.0.1');
console.log('Server is listening on http://127.0.0.1:3000/');
