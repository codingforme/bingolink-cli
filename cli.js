#!/usr/bin/env node

var yargs = require("yargs");
var chalk = require('chalk');
var path = require("path");
var fs = require("fs-extra");

const infoLabel = chalk.inverse.green("INFO");
const warningLabel = chalk.inverse("WARN");
const errorLabel = chalk.inverse("ERROR");

function log(msg) {
    console.log(`${infoLabel} ${msg}`);
}

function warn(msg) {
    console.log(chalk.yellow(`${warningLabel} ${msg}`));
}

function error(msg) {
    console.log(chalk.red(`${errorLabel} ${msg}`));
    process.exit(1);
}

const TemplateRelease = require("./template-release");
const constants = require('./index').constants;

const BUI_TEMPLATE_RELEASE_URL = constants.templateReleaseUrl;

const templateRelease = new TemplateRelease(constants.cacheDirName, BUI_TEMPLATE_RELEASE_URL);

/**
 * 复制 template 文件以创建 bui-weex 工程.
 * @param  {string} name project name.
 * @param  {string} [version] template version.
 * @param  {string} [templateName] init src/ dir with specified template
 */
function initProject(name, version, templateName) {
    if (fs.existsSync(name)) {
        error(`File ${name} already exist.`);
    }
    log("Creating project...");
    templateRelease.fetchRelease(version, function (err, releasePath) {
        if (err) {
            error(err);
            return;
        }
        log("Copying template file...")
        fs.copySync(releasePath, name);
        log("Project created.");
        const templatesDir = path.join(name, 'templates');
        if (templateName) {
            log("Initing template...");
            let tPath = path.join(templatesDir, templateName);
            if (!fs.existsSync(tPath)) {
                warn(`Template ${templateName} not exist. Using default template.`);
                return
            }
            let srcPath = path.join(name, "src");
            fs.removeSync(srcPath);
            fs.copySync(tPath, srcPath);
            log("Copy template done.");
        }
        fs.removeSync(templatesDir);
    });
}

function displayReleases() {
    log("Fetching version info...");
    templateRelease.fetchReleaseVersions((err, result) => {
        if (err) {
            error(err);
            return;
        }
        console.log("Available versions:")
        result.forEach(t => {
            console.log(chalk.green.underline(t));
        })
    })
}

var args = yargs
    .command({
        command: "create <name> [version]",
        desc: "Create a bui-weex project. Default to use latest version of template.",
        builder: (yargs) => {
            yargs.option('template', {
                alias: 't',
                describe: 'Init with specified template.'
            })
        },
        handler: function(argv) {
            initProject(argv.name, argv.version, argv.template);
        }
    })
    .command({
        command: "list",
        desc: "List available version of template releases.",
        handler: function() {
            displayReleases();
        }
    })
    .command({
        command: "list-template",
        desc: "List available templates for the newest release.",
        handler: function() {
            templateRelease.fetchRelease(null, (err, projectPath) => {
                if (err) {
                    error(err);
                    return;
                }
                let names = templateRelease.getAvailableTemplateNames(projectPath);
                console.log("Available templates:");
                if (names.length) {
                    names.forEach(n => {
                        console.log(chalk.green.underline(n));
                    })
                } else {
                    console.log("No templates available.");
                }
            })
        }
    })
    .version() // Use package.json's version
    .help()
    .alias({
        "h": "help",
        "v": "version"
    })
    .strict(true)
    .demandCommand()
    .argv;
