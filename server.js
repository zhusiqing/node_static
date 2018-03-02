const fs = require('fs');
const http = require('http');
const path = require('path');
const url = require('url');
const zlib = require('zlib');

const connect = require('connect');
const handlebars = require('handlebars');
const serveIndex = require('serve-index');
const serveStatic = require('serve-static');

const config = require('./ss_config.json');
const public_folder = path.join(__dirname,config.public || '');
const app = connect();

let pathName,filePath,stats;

app.use((req,res,next)=>{
    pathName = url.parse(req.url).pathname,
    filePath = path.join(__dirname,path.normalize(pathName.replace(/\.\./g,'')));
    next();
});

app.use((req,res,next)=>{
    try{
        stats = fs.statSync(filePath);
        next();
    }catch(e){
        let source = fs.readFileSync('./template/404.html'),
            template = handlebars.compile(source.toString()),
            data = {
                path: url.parse(req.url).name
            };
        res.writeHead(404,{
            'Content-Type': 'text/html;charset=UTF-8'
        });
        res.end(template(data));
    }
});

app.use(serveIndex(public_folder,{'icons': true}));

app.use(serveStatic(public_folder));

const server = http.createServer(app);

const port = process.argv[2] || config.port || 9901,
    host = config.host || '127.0.0.1';
server.listen(port,host,()=>{
    console.log('server is started in http://%s:%s',host,port);
})