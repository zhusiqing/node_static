const fs = require('fs');
const http = require('http');
const path = require('path');
const url = require('url');
const zlib = require('zlib')

const handlebars = require('handlebars');

const config = require('./ss_config.json');
const public_folder = path.join(__dirname,config.public || 'public');

const server = http.createServer((req,res)=>{
    if(!req){
        throw '请求出错';
    }
    let pathName = url.parse(req.url).pathname,
        filePath = path.join(__dirname,path.normalize(pathName.replace(/\.\./g,'')));

    fs.stat(filePath,(err,stats)=>{
        if(err){
            let source = fs.readFileSync('./template/404.html'),
                template = handlebars.compile(source.toString()),
                data = {
                    path: url.parse(req.url).name
                };
            res.writeHead(404,{
                'Content-Type': 'text/html;charset=UTF-8'
            });
            res.end(template(data));
        }else{
            if(stats.isDirectory()){
                let source = fs.readFileSync('./template/dir.html'),
                    template = handlebars.compile(source.toString()),
                    data = {
                        title: url.parse(req.url).name,
                        path: path.join(pathName,'/'),
                        files: fs.readdirSync(filePath)
                    };
                res.writeHead(200,{
                    'Content-Type': 'text/html;charset=UTF-8'
                });
                res.end(template(data));
            }else{
                let extension = path.extname(pathName).replace('.',''),
                    fileType = config.mime[extension] || 'text/plain';
                let acceptEncoding = req.headers['accept-encoding'] || '',
                    compressable = extension.match(/css|js|html|json|xml/ig),
                    cacheable = extension.match(/^(gif|png|jpg|jpeg|css|js)$/ig);
                
                res.statusCode = 200;
                res.setHeader('Content-Type',`${fileType};charset=UTF-8`);
                res.setHeader('Date',(new Date()).toUTCString());

                if(cacheable){
                    let expires = new Date();
                    expires.setTime(expires.getTime()+60*60*24*1000);
                    res.setHeader('Expires',expires.toUTCString());
                    res.setHeader('Cache-Control',`max-age=${60*60*24*1000}`);

                    let lastModified = stats.mtime.toUTCString();
                    res.setHeader('Last-Modified',lastModified);

                    let isExsits = req.headers['if-modified-since'],
                        isEqual = lastModified == isExsits;
                    if(isExsits && isEqual){
                        res.statusCode = 304;
                        res.end();
                    }
                }

                if(compressable && acceptEncoding.match(/\bgzip\b/)){
                    res.setHeader('Content-Encoding','gzip');
                    fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
                }else if(compressable && acceptEncoding.match(/\bdefalte\b/)){
                    res.setHeader('Content-Encoding','defalte');
                    fs.createReadStream(filePath).pipe(zlib.createDeflate).pipe(res);
                }else{
                    fs.createReadStream(filePath).pipe(res);
                }
            }
        }
        
    });
});

const port = process.argv[2] || config.port || 9901,
    host = config.host || '127.0.0.1';
server.listen(port,host,()=>{
    console.log('server is started in http://%s:%s',host,port);
})