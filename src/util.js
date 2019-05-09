const fs = require("fs-extra");
const _fs = require('fs');
const path = require("path");
const decompress = require('decompress');
const tmp = require('tmp');
const request = require('request').defaults({
    headers: {
        'User-Agent': 'node request' // GitHub ask for this.
    }
});

module.exports = {
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
        console.log("Trying to download template...");
        const TMP_DOWNLOAD_PATH = tmp.tmpNameSync() + ".zip";
        const TMP_UNZIP_FOLDER = tmp.tmpNameSync();
        let file = fs.createWriteStream(TMP_DOWNLOAD_PATH);
        file.on("close", () => {
            console.log("Extracting...");
            decompress(TMP_DOWNLOAD_PATH, TMP_UNZIP_FOLDER).then(() => {
                console.log('Done extracting.')
                _fs.readdir(TMP_UNZIP_FOLDER, (err, files) => {
                    fs.moveSync(path.join(TMP_UNZIP_FOLDER, files[0]), savePath); // 重命名为指定名
                    fs.unlinkSync(TMP_DOWNLOAD_PATH); // 删除下载的压缩包
                    cb && cb();
                })
            })
        }).on("error", (err) => {
            console.log(err);
        });
        request.get(url)
            .on("error", function (err) {
                console.log(`Error downloading: ${err}`);
            })
            .on("response", function (res) {
                if (res.statusCode != 200) {
                    console.log("Get zipUrl return a non-200 response.");
                }
            })
            .on("end", function () {
                console.log("Download finished.");
            })
            .pipe(file);
    }
}
