var fs = require("fs-extra");
var path = require("path");
var decompress = require('decompress');
var chalk = require('chalk');
var tmp = require('tmp');
var _fs = require('fs');
var request = require('request').defaults({
    headers: {
        'User-Agent': 'node request' // GitHub ask for this.
    }
});


var infoLabel = chalk.inverse.green("INFO");
var warningLabel = chalk.inverse("WARN");
var errorLabel = chalk.inverse("ERROR");

function showInfoText(msg) {
    console.log(`${infoLabel} ${msg}`);
}

function showWarnText(msg) {
    console.log(chalk.yellow(`${warningLabel} ${msg}`));
}

function showErrorText(msg){
    console.log(chalk.red(`${errorLabel} ${msg}`));
    process.exit(1);
}

module.exports = {
    showInfoText,
    showWarnText,
    showErrorText,
    get(url, callback){
        request.get(url, function(err, res, body){
            if (err) {
                callback(err);
                return;
            }
            if (res.statusCode != 200) {
                callback(`Failed to fetch info - ${res.statusCode}: ${res.body}`);
                return;
            }
            callback(null, body);
        });
    },
    /**
     * 把 url (zipball_url) 的内容下载并解压到 savePath
     * @param {string} url
     * @param {string} savePath
     * @param {Function} cb 接收参数 error
     */
    downloadAndUnzip(url, savePath, cb) {
        if(fs.existsSync(savePath)){
            showErrorText(`File ${savePath} already exist.`);
            return;
        }
        showInfoText("Trying to download template...");
        var TMP_DOWNLOAD_PATH = tmp.tmpNameSync() + ".zip";
        var TMP_UNZIP_FOLDER = tmp.tmpNameSync();
        var file = fs.createWriteStream(TMP_DOWNLOAD_PATH);
        file.on("close", () => {
            showInfoText("Extracting...");
            decompress(TMP_DOWNLOAD_PATH, TMP_UNZIP_FOLDER).then(() => {
                showInfoText('Done extracting.')
                _fs.readdir(TMP_UNZIP_FOLDER, (err, files) => {
                    fs.moveSync(path.join(TMP_UNZIP_FOLDER, files[0]), savePath); // 重命名为指定名
                    fs.unlinkSync(TMP_DOWNLOAD_PATH); // 删除下载的压缩包
                    cb && cb();
                })
            })
        }).on("error", (err) => {
            showErrorText(err);
        });
        request.get(url)
            .on("error", function (err) {
                showErrorText(`Error downloading: ${err}`);
            })
            .on("response", function (res) {
                if (res.statusCode != 200) {
                    showErrorText("Get zipUrl return a non-200 response.");
                }
            })
            .on("end", function () {
                showInfoText("Download finished.");
            })
            .pipe(file);
    }
}
