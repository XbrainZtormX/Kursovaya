var express = require('express') // Web фреймворк
  , jade = require('jade') // Шаблонизатор
  , app = express.createServer(
      express.bodyParser() // Middleware
    )
  , defaultPrecision = 0.00005; // Погрешность

app.set('views', __dirname + '/views'); // Папка с представлениями(шаблонами)
app.set('view engine', 'jade'); // Шаблонизатор по умолчанию
app.set('view options', { layout: 'layouts/default', precision: defaultPrecision }); // Опции, передаваемые шаблонизатору
app.register('.jade', jade); // Ассоциируем шаблонизатор с фалами, имеющими расширение .jade


var xml2js = require('xml2js') // Подключаем парсер XML
  , fs = require('fs') // Модуль для работы с файловой системой
  , async = require('async') // Flowcontrol для асинхронного кода
  , readFile = function(path){ return fs.readFileSync(__dirname + '/data/' + path).toString(); }; // Функция для чтения исходных файлов

var parser = new xml2js.Parser(); // Инициализация парсера

var parse = function(req, res, next){ // Звено в цепочке обработки запроса(смотреть в app.post)
  var precision = parseFloat(req.body.precision) || defaultPrecision; // Смотрим на наличие погрешности в теле запроса, если она не была передана, то возьмем по-умолчанию

  if(!precision) // Если переданное число не является десятичной дробью
    precision = defaultPrecision; // присвоим значение по-умолчанию

  var graphml = readFile('graphml.xml')
    , map = readFile('map.osm');

  async.map([ graphml, map ], parser.parseString, function(err, data){ // Асинхронно парсим наши файлы
    if(err)
      throw new Error(err);

    var table = {}; // Здесь будут собраны результаты обработки полученных данных
    // graphml
    (function(){ // Обработчик для graphml
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
    (function(){ // Обработчик для map
      var hash = {};
      data[1].node.forEach(function(node){
        node = node['@'];
        hash[node.id] = { y: parseFloat(node.lat), x: parseFloat(node.lon), id: node.id };
      });

      table['map'] = hash;
    })();

    var Result = []; // То из чего будет строится результирующая таблица
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

    req.parse = Result; // Сохраняем результат вычислений для пережачи в представление(views/index.jade)
    next(); // Вызываем слежующее звено в цепи
  });

}

app.post('/', parse, function(req, res, next){
  res.render('index', { parse: req.parse, precision: req.body.precision || defaultPrecision });
})

app.get('/', function(req, res, next){
  res.render('index', { parse: false });
});

app.listen(3000, '127.0.0.1'); // Запуск сервера на прослушивание
console.log('Server is listening on http://127.0.0.1:3000/');
