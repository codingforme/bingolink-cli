const jsonfile = require('jsonfile');
const fs = require("fs-extra");
const path = require("path");
const decompress = require('decompress');
const tmp = require('tmp');
const request = require('request').defaults({
    headers: {
        'User-Agent': 'node request' // GitHub ask for this.
    }
});

class TemplateRelease {
    /**
     * 构造函数，必须传入以下参数
     * @param  {String} name       项目的名称，将用于在家目录创建形如 .bui-weex 的缓存目录
     * @param  {String} releaseUrl 形如 https://api.github.com/repos/bingo-oss/bui-weex-template/releases
     * @return {TemplateRelease}
     */
    constructor (name, releaseUrl) {
        if (!name || !releaseUrl) {
            throw new Error('Invalid argument');
        }
        this.name = name;
        this.releaseUrl = releaseUrl;
        this.CACHE_DIR_NAME = '.' + name;
        this.CACHE_DIR_PATH = path.join(require('os').homedir(), this.CACHE_DIR_NAME);
        this.CACHE_TEMPLATE_PATH = path.join(this.CACHE_DIR_PATH, "template");
        this.RELEASES_JSON_PATH = path.join(this.CACHE_TEMPLATE_PATH, "release.json");
        this.TEMPLATE_DIR_NAME = "templates"; // 存放各种模版的目录
    }

    /**
     * 获取所有 release 的版本。只获取版本，不会下载到缓存区。
     * @param  {Function} cb 接受参数 error 以及无错时的版本数组 []string
     */
    fetchReleaseVersions(cb) {
        request.get(this.releaseUrl, function(err, res, body){
            if (err) {
                cb && cb(err);
                return;
            }
            if (res.statusCode != 200) {
                cb && cb(`Failed to fetch releases info - ${res.statusCode}: ${res.body}`);
                return;
            }
            let tags = JSON.parse(body).map(function(e){return e["tag_name"]});
            cb && cb(null, tags);
        });
    }

    /**
     * 获取指定版本的 release，首先尝试缓存（CACHE_TEMPLATE_PATH），如果未缓存，再尝试下载并缓存
     * @param {string} version 指定版本，如果为空，表示最新版本
     * @param {Function} cb 通过该回调返回错误 error，以及无错时的 release 的路径，一般形如 ~/.bui-weex/template/0.1.0
     */
    fetchRelease(version, cb) {
        let releasesInfo = this._readReleaseJSON();
        if (version) {
            // Version specified, try cache.
            let info = releasesInfo[version];
            if (info) {
                // Hit cache.
                cb(null, path.join(this.CACHE_TEMPLATE_PATH, info.path));
                return;
            }
        }

        let url = this._getReleaseUrl(version);
        console.log(`Fetching release: ${version ? version : "latest"}...`);
        request(url, (err, res, body) => {
            if (err || res.statusCode != 200) {
                let errorInfo = err ? err : `${res.statusCode}: ${res.body}`
                console.log(`Failed to fetch ${url} - ${errorInfo}`);
                console.log('Checking cache...')
                if (!version) {
                    // When fetch error, and no version specified, try to figure out the latest release.
                    let latestRleaseInfo = this.getCachedReleaseInfo();
                    if (latestRleaseInfo) {
                        // Figured out latest release in cache.
                        console.log(`Found latest release in cache: ${latestRleaseInfo.tag}.`)
                        cb(null, path.join(this.CACHE_TEMPLATE_PATH, latestRleaseInfo.path));
                        return;
                    }
                }
                cb(`Failed to fetch release of ${version ? version : "latest"}: ${errorInfo}`);
                return;
            }
            // Successfully fetched info.
            let info = JSON.parse(body);
            let newInfo = {};
            let tag = newInfo.tag = info["tag_name"];
            newInfo.time = info["published_at"];
            newInfo.path = newInfo.tag;
            let targetPath = path.join(this.CACHE_TEMPLATE_PATH, newInfo.path);
            if (fs.pathExistsSync(targetPath)) {
                // Probably we are fetching latest release...
                console.log(`Already cached release.`);
                cb(null, targetPath);
                return;
            }
            this._downloadAndUnzip(info["zipball_url"], targetPath, (err) => {
                if (err) {
                    cb && cb(err);
                    return;
                }
                releasesInfo[tag] = newInfo;
                jsonfile.writeFileSync(this.RELEASES_JSON_PATH, releasesInfo, {spaces: 2});
                cb(null, targetPath);
            });
        });
    }

    /**
     * 从 release 的项目路径里读取 templates 目录下的所有模版名称
     * @param  {[type]} projectPath [description]
     * @return {[type]}             [description]
     */
    getAvailableTemplateNames(projectPath) {
        let result = [];
        let tDir = path.join(projectPath, this.TEMPLATE_DIR_NAME);
        if (!fs.existsSync(tDir)) return result;
        let files = fs.readdirSync(tDir);
        for (let f of files) {
            if (fs.statSync(path.join(tDir, f)).isDirectory()) {
                result.push(f);
            }
        }
        return result;
    }

    /**
     * 返回缓存里的 release 信息
     * @param {string} [version] 指定版本，不指定则返回最新
     * @return {Object} release 信息
     */
    getCachedReleaseInfo(version) {
        let releasesInfo = this._readReleaseJSON();
        if (version) {
            return releasesInfo[version];
        }
        let latestRleaseInfo = null;
        for (let tag in releasesInfo) {
            let info = releasesInfo[tag];
            if (!latestRleaseInfo) {
                latestRleaseInfo = info;
            } else {
                if (Date.parse(info.time) > Date.parse(latestRleaseInfo.time)) latestRleaseInfo = info;
            }
        }
        return latestRleaseInfo;
    }

    /**
     * 返回缓存里的 release 路径
     * @param {string} [version] 指定版本，不指定则返回最新
     * @return {string} release 路径
     */
    getCachedRelease(version) {
        let info = this.getCachedReleaseInfo(version);
        return info ? path.join(this.CACHE_TEMPLATE_PATH, info.path) : null;
    }

    _readReleaseJSON() {
        fs.ensureFileSync(this.RELEASES_JSON_PATH);
        try {
            let j = jsonfile.readFileSync(this.RELEASES_JSON_PATH);
            return j;
        } catch (e) {
            return {};
        }
    }

    _getReleaseUrl(tag) {
        // TODO: handle last '/'
        return this.releaseUrl + "/" + (tag ?  `tags/${tag}` : "latest");
    }

    /**
     * 把 url (zipball_url) 的内容下载并解压到 savePath
     * @param {string} url
     * @param {string} savePath
     * @param {Function} cb 接收参数 error
     */
     _downloadAndUnzip(url, savePath, cb) {
        console.log("Trying to download...");
        const TMP_DOWNLOAD_PATH = tmp.tmpNameSync() + ".zip";
        let file = fs.createWriteStream(TMP_DOWNLOAD_PATH);
        file.on("close", () => {
            console.log("Extracting...");
            decompress(TMP_DOWNLOAD_PATH, this.CACHE_TEMPLATE_PATH).then(() => {
                console.log('Done extracting.')
                let origPath = this._getLastReleasePath();
                fs.moveSync(origPath, savePath); // 重命名为指定名
                fs.unlinkSync(TMP_DOWNLOAD_PATH); // 删除下载的压缩包
                cb && cb();
            })
        }).on("error", (err) => {
            console.log(err);
            cb && cb(err)
        });
        request.get(url)
            .on("error", function (err) {
                cb && cb(`Error downloading release: ${err}`);
            })
            .on("response", function (res) {
                if (res.statusCode != 200) {
                    cb && cb("Get zipUrl return a non-200 response.");
                }
            })
            .on("end", function () {
                console.log("Download finished.");
            })
            .pipe(file);
    }

    /**
     * 获取刚下载解压的 release 的路径
     * TODO: 目前无法准确获取 release 解压之后的目录名称，只能根据某种模式推断
     */
     _getLastReleasePath() {
        let files = fs.readdirSync(this.CACHE_TEMPLATE_PATH);
        // e.g. 'bui-weex-template' in 'https://api.github.com/repos/bingo-oss/bui-weex-template/releases'
        let part = this.releaseUrl.split('/');
        const pattern = part[part.length - 2];
        for (let f of files) {
            if (f.indexOf(pattern) != -1) {
                return path.join( this.CACHE_TEMPLATE_PATH, f);
            }
        }
        return null;
    }
}

module.exports = TemplateRelease;
